import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { PrismaClient } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { catalogProductImages } from '../prisma/catalog-data';
import { seedProductImages } from '../prisma/seed-product-images';

interface ProductImageState {
  imageKey: string | null;
  deletedAt: Date | null;
}

describe('product image seed', () => {
  it('uploads missing seed assets once and associates every product', async () => {
    const storedHashes = new Map<string, string>();
    const productState = new Map<string, ProductImageState>(
      catalogProductImages.map((image) => [image.productId, { imageKey: null, deletedAt: null }]),
    );

    const send = vi.fn((command: unknown) => {
      if (command instanceof HeadObjectCommand) {
        const hash = storedHashes.get(command.input.Key ?? '');
        if (!hash) {
          throw Object.assign(new Error('not found'), {
            name: 'NotFound',
            $metadata: { httpStatusCode: 404 },
          });
        }
        return { Metadata: { sha256: hash } };
      }
      if (command instanceof PutObjectCommand) {
        const key = command.input.Key ?? '';
        const hash = command.input.Metadata?.sha256;
        if (hash) storedHashes.set(key, hash);
        return {};
      }
      throw new Error('Unexpected S3 command');
    });
    const client = { send, destroy: vi.fn() } as unknown as S3Client;
    const prisma = {
      product: {
        findUnique: vi.fn(
          ({ where }: { where: { id: string } }) => productState.get(where.id) ?? null,
        ),
        update: vi.fn(({ where, data }: { where: { id: string }; data: { imageKey: string } }) => {
          productState.set(where.id, { imageKey: data.imageKey, deletedAt: null });
        }),
      },
    };

    await seedProductImages(prisma as unknown as PrismaClient, { client });
    await seedProductImages(prisma as unknown as PrismaClient, { client });

    const putCommands = send.mock.calls
      .map(([command]) => command)
      .filter((command) => command instanceof PutObjectCommand);
    const headCommands = send.mock.calls
      .map(([command]) => command)
      .filter((command) => command instanceof HeadObjectCommand);

    expect(putCommands).toHaveLength(25);
    expect(headCommands).toHaveLength(50);
    expect(storedHashes.size).toBe(25);
    expect(prisma.product.update).toHaveBeenCalledTimes(25);
    expect(
      putCommands.every(
        (command) =>
          command.input.ContentType === 'image/jpeg' &&
          command.input.CacheControl === 'public, max-age=3600' &&
          /^[a-f\d]{64}$/.test(command.input.Metadata?.sha256 ?? ''),
      ),
    ).toBe(true);
  });

  it('never reads or replaces an image uploaded from Administration', async () => {
    const send = vi.fn();
    const client = { send, destroy: vi.fn() } as unknown as S3Client;
    const prisma = {
      product: {
        findUnique: vi.fn(({ where }: { where: { id: string } }) => ({
          imageKey: `products/${where.id}/admin-upload.jpg`,
          deletedAt: null,
        })),
        update: vi.fn(),
      },
    };

    await seedProductImages(prisma as unknown as PrismaClient, { client });

    expect(prisma.product.findUnique).toHaveBeenCalledTimes(25);
    expect(prisma.product.update).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
