import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GENERAL_CATEGORY_ID,
  catalogCategories,
  catalogProductImages,
  catalogProducts,
} from '../prisma/catalog-data';
import { validateSeedImage } from '../prisma/seed-product-images';

describe('initial catalogue seed', () => {
  it('contains 24 active products and one archived product', () => {
    const activeProducts = catalogProducts.filter((product) => product.isActive);
    const archivedProducts = catalogProducts.filter((product) => !product.isActive);

    expect(catalogProducts).toHaveLength(25);
    expect(activeProducts).toHaveLength(24);
    expect(archivedProducts).toHaveLength(1);
    expect(archivedProducts[0]).toMatchObject({
      name: 'Producto archivado',
      categoryId: GENERAL_CATEGORY_ID,
    });

    const commercialCategoryIds = catalogCategories
      .filter((category) => category.id !== GENERAL_CATEGORY_ID)
      .map((category) => category.id);
    for (const categoryId of commercialCategoryIds) {
      expect(activeProducts.filter((product) => product.categoryId === categoryId)).toHaveLength(4);
    }
  });

  it('ships one valid JPEG asset for every product', async () => {
    const productIds = catalogProducts.map((product) => product.id).sort();
    const imageProductIds = catalogProductImages.map((image) => image.productId).sort();

    expect(new Set(imageProductIds).size).toBe(25);
    expect(imageProductIds).toEqual(productIds);

    await Promise.all(
      catalogProductImages.map(async (image) => {
        expect(extname(image.fileName).toLowerCase()).toBe('.jpg');
        expect(catalogProducts.find((product) => product.id === image.productId)?.imageKey).toBe(
          image.objectKey,
        );

        const path = resolve(process.cwd(), 'prisma', 'seed-assets', 'products', image.fileName);
        const body = await readFile(path);
        expect(() => validateSeedImage(image.fileName, 'image/jpeg', body)).not.toThrow();
      }),
    );
  });
});
