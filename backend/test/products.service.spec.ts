import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProductsService } from '../src/products/products.service';

const product = (id: string) => ({
  id,
  name: `Product ${id}`,
  searchName: `product ${id}`,
  description: 'Description',
  priceCents: 1250,
  isActive: true,
  imageKey: null,
  categoryId: '20000000-0000-4000-8000-000000000001',
  category: {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Other',
    slug: 'other',
  },
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
});

describe('ProductsService ratings', () => {
  it('adds rating aggregates to a product list with one bulk lookup', async () => {
    const products = [
      product('10000000-0000-4000-8000-000000000001'),
      product('10000000-0000-4000-8000-000000000002'),
    ];
    const repository = {
      findPublic: vi.fn().mockResolvedValue(products),
      findRatingSummaries: vi.fn().mockResolvedValue([
        {
          productId: products[0].id,
          ratingAverage: 4.5,
          ratingCount: 2,
        },
      ]),
    };
    const service = new ProductsService(repository as never, {} as never);

    const result = await service.listPublic();

    expect(repository.findRatingSummaries).toHaveBeenCalledOnce();
    expect(repository.findRatingSummaries).toHaveBeenCalledWith(products.map(({ id }) => id));
    expect(result[0]).toMatchObject({ ratingAverage: 4.5, ratingCount: 2 });
    expect(result[1]).toMatchObject({ ratingAverage: null, ratingCount: 0 });
  });

  it('soft-deletes a product and removes its stored image', async () => {
    const storedProduct = {
      ...product('10000000-0000-4000-8000-000000000003'),
      imageKey: 'products/example/image.png',
    };
    const repository = {
      findById: vi.fn().mockResolvedValue(storedProduct),
      softDelete: vi.fn().mockResolvedValue({ ...storedProduct, isActive: false }),
    };
    const storage = { deleteObject: vi.fn().mockResolvedValue(undefined) };
    const service = new ProductsService(repository as never, storage as never);

    await service.remove(storedProduct.id);

    expect(repository.softDelete).toHaveBeenCalledWith(storedProduct.id, expect.any(Date));
    expect(storage.deleteObject).toHaveBeenCalledWith(storedProduct.imageKey);
  });

  it('normalizes the search and forwards price bounds in cents', async () => {
    const repository = {
      findPublic: vi.fn().mockResolvedValue([]),
      findRatingSummaries: vi.fn().mockResolvedValue([]),
    };
    const service = new ProductsService(repository as never, {} as never);

    await service.listPublic('Lámpara', 'hogar', 1_000, 5_000);

    expect(repository.findPublic).toHaveBeenCalledWith(
      'lampara',
      'hogar',
      1_000,
      5_000,
    );
  });

  it('rejects an inverted price range before querying products', async () => {
    const repository = { findPublic: vi.fn() };
    const service = new ProductsService(repository as never, {} as never);

    await expect(service.listPublic(undefined, undefined, 5_001, 5_000)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.findPublic).not.toHaveBeenCalled();
  });
});
