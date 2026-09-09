import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3_CLIENT } from './storage.constants';
import { StorageService } from './storage.service';

@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ssl = config.get<boolean>('MINIO_USE_SSL', false);
        const host = config
          .getOrThrow<string>('MINIO_ENDPOINT')
          .replace(/^https?:\/\//, '')
          .replace(/\/$/, '');
        const port = config.get<number>('MINIO_PORT', 9000);
        return new S3Client({
          endpoint: `${ssl ? 'https' : 'http'}://${host}:${port}`,
          region: config.get<string>('MINIO_REGION', 'us-east-1'),
          forcePathStyle: true,
          credentials: {
            accessKeyId: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
            secretAccessKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
          },
        });
      },
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
