import { PrismaClient } from '@prisma/client';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { catalogProductImages } from './catalog-data';

const contentTypes: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const imageSignatures: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buffer) =>
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
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
      accessKeyId: process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? 'cartly_minio',
      secretAccessKey:
        process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? 'cartly_minio_password',
    },
  });
}

function maxImageSizeFromEnvironment() {
  const rawValue = process.env.MAX_IMAGE_SIZE_BYTES ?? String(5 * 1024 * 1024);
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('MAX_IMAGE_SIZE_BYTES must be a positive integer');
  }
  return value;
}

export function validateSeedImage(fileName: string, contentType: string, body: Buffer) {
  const maxSize = maxImageSizeFromEnvironment();
  if (body.length <= 0 || body.length > maxSize) {
    throw new Error(`Seed image ${fileName} must be no larger than ${maxSize} bytes`);
  }
  if (!imageSignatures[contentType]?.(body)) {
    throw new Error(`Seed image ${fileName} is not a valid JPEG, PNG, or WebP file`);
  }
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

async function storedSeedImageHash(client: S3Client, bucket: string, key: string) {
  try {
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return object.Metadata?.sha256 ?? null;
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
}

interface SeedProductImagesOptions {
  client?: S3Client;
  assetsDirectory?: string;
}

export async function seedProductImages(
  prisma: PrismaClient,
  options: SeedProductImagesOptions = {},
) {
  if (catalogProductImages.length === 0) return;

  const bucket = process.env.MINIO_BUCKET ?? 'cartly-products';
  const assetsDirectory =
    options.assetsDirectory ?? resolve(process.cwd(), 'prisma', 'seed-assets', 'products');
  const client = options.client ?? createStorageClient();
  const ownsClient = options.client === undefined;

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

      const body = await readFile(resolve(assetsDirectory, image.fileName));
      validateSeedImage(image.fileName, contentType, body);
      const contentHash = createHash('sha256').update(body).digest('hex');
      if ((await storedSeedImageHash(client, bucket, image.objectKey)) !== contentHash) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: image.objectKey,
            Body: body,
            ContentType: contentType,
            CacheControl: 'public, max-age=3600',
            Metadata: { sha256: contentHash },
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
    if (ownsClient) client.destroy();
  }
}
