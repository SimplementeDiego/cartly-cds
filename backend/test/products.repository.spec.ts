import { describe, expect, it, vi } from 'vitest';
import { ProductsRepository } from '../src/products/products.repository';

describe('ProductsRepository public catalog', () => {
  it('always filters inactive products from public listing and detail', async () => {
    const prisma = {
      product: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const repository = new ProductsRepository(prisma as never);

    await repository.findPublic('keyboard');
    await repository.findPublicById('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) }),
    );
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        isActive: true,
        deletedAt: null,
      },
      include: { category: true },
    });
  });

  it('combines inclusive minimum and maximum prices with public filters', async () => {
    const prisma = {
      product: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const repository = new ProductsRepository(prisma as never);

    await repository.findPublic('auriculares', 'tecnologia', 2_500, 8_000);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          deletedAt: null,
          searchName: { contains: 'auriculares' },
          category: { slug: 'tecnologia' },
          priceCents: { gte: 2_500, lte: 8_000 },
        },
      }),
    );
  });

  it('removes the product from carts and marks it as deleted atomically', async () => {
    const removedProduct = { id: 'product-a', deletedAt: new Date() };
    const transactionClient = {
      cartItem: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
      product: { update: vi.fn().mockResolvedValue(removedProduct) },
    };
    const prisma = {
      $transaction: vi.fn(
        (operation: (transaction: typeof transactionClient) => unknown) =>
          operation(transactionClient),
      ),
    };
    const repository = new ProductsRepository(prisma as never);
    const deletedAt = new Date('2026-09-09T00:00:00.000Z');

    await expect(repository.softDelete('product-a', deletedAt)).resolves.toBe(removedProduct);
    expect(transactionClient.cartItem.deleteMany).toHaveBeenCalledWith({
      where: { productId: 'product-a' },
    });
    expect(transactionClient.product.update).toHaveBeenCalledWith({
      where: { id: 'product-a' },
      data: { deletedAt, isActive: false, imageKey: null },
      include: { category: true },
    });
  });
});
