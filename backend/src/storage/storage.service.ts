import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { S3_CLIENT } from './storage.constants';

const imageSignatures: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': (buffer) =>
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) =>
    buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (buffer) =>
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP',
};

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private bucketReady = false;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET');
  }

  async uploadProductImage(productId: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');

    const maxSize = this.config.get<number>('MAX_IMAGE_SIZE_BYTES', 5 * 1024 * 1024);
    if (file.size <= 0 || file.size > maxSize) {
      throw new BadRequestException(`Image must be no larger than ${maxSize} bytes`);
    }
    const isValidSignature = imageSignatures[file.mimetype]?.(file.buffer) ?? false;
    if (!isValidSignature) {
      throw new BadRequestException('Only valid JPEG, PNG, and WebP images are accepted');
    }

    await this.ensureBucket();
    const key = `products/${productId}/${randomUUID()}.${extensions[file.mimetype]}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return key;
  }

  async getObject(key: string) {
    try {
      return await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'NoSuchKey' || name === 'NotFound') {
        throw new NotFoundException('Image not found');
      }
      throw error;
    }
  }

  async deleteObject(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  private async ensureBucket() {
    if (this.bucketReady) return;
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (error) {
        const name = error instanceof Error ? error.name : '';
        if (name !== 'BucketAlreadyOwnedByYou' && name !== 'BucketAlreadyExists') throw error;
      }
    }
    this.bucketReady = true;
  }
}
