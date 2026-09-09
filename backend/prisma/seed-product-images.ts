import { PrismaClient } from '@prisma/client';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { catalogProductImages } from './catalog-data';

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function booleanFromEnvironment(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === 'true';
}

function createStorageClient() {
  const useSsl = booleanFromEnvironment(process.env.MINIO_USE_SSL, false);
  const host = (process.env.MINIO_ENDPOINT ?? 'localhost')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const port = process.env.MINIO_PORT ?? '9000';

  return new S3Client({
    endpoint: `${useSsl ? 'https' : 'http'}://${host}:${port}`,
    region: process.env.MINIO_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId:
        process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? 'cartly_minio',
      secretAccessKey:
        process.env.MINIO_SECRET_KEY ??
        process.env.MINIO_ROOT_PASSWORD ??
        'cartly_minio_password',
    },
  });
}

function isMissingObject(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey'
  );
}

async function objectExists(client: S3Client, bucket: string, key: string) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if (isMissingObject(error)) return false;
    throw error;
  }
}

export async function seedProductImages(prisma: PrismaClient) {
  if (catalogProductImages.length === 0) return;

  const bucket = process.env.MINIO_BUCKET ?? 'cartly-products';
  const assetsDirectory = resolve(process.cwd(), 'prisma', 'seed-assets', 'products');
  const client = createStorageClient();

  try {
    for (const image of catalogProductImages) {
      const product = await prisma.product.findUnique({
        where: { id: image.productId },
        select: { imageKey: true, deletedAt: true },
      });

      if (!product) {
        throw new Error(`Cannot seed image for missing product ${image.productId}`);
      }

      if (product.deletedAt) continue;

      // An image uploaded from Administration always takes precedence over the demo asset.
      if (product.imageKey && product.imageKey !== image.objectKey) continue;

      const extension = extname(image.fileName).toLowerCase();
      const contentType = contentTypes[extension];
      if (!contentType) {
        throw new Error(`Unsupported seed image type: ${image.fileName}`);
      }

      if (!(await objectExists(client, bucket, image.objectKey))) {
        const body = await readFile(resolve(assetsDirectory, image.fileName));
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: image.objectKey,
            Body: body,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
      }

      if (!product.imageKey) {
        await prisma.product.update({
          where: { id: image.productId },
          data: { imageKey: image.objectKey },
        });
      }
    }
  } finally {
    client.destroy();
  }
}
