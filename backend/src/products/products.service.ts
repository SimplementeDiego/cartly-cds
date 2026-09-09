import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Readable } from 'stream';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { normalizeProductSearch } from './product-search';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ProductRatingSummaryRow,
  ProductsRepository,
} from './products.repository';

type ProductWithCategory = Prisma.ProductGetPayload<{ include: { category: true } }>;
const DEFAULT_CATEGORY_ID = '20000000-0000-4000-8000-000000000001';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly storageService: StorageService,
  ) {}

  async listPublic(
    search?: string,
    category?: string,
    minPriceCents?: number,
    maxPriceCents?: number,
  ) {
    if (
      minPriceCents !== undefined &&
      maxPriceCents !== undefined &&
      minPriceCents > maxPriceCents
    ) {
      throw new BadRequestException(
        'Minimum price cannot be greater than maximum price',
      );
    }

    const products = await this.productsRepository.findPublic(
      search ? normalizeProductSearch(search) || undefined : undefined,
      category,
      minPriceCents,
      maxPriceCents,
    );
    return this.presentMany(products);
  }

  listCategories() {
    return this.productsRepository.findCategories();
  }

  async listBestSellers() {
    const { selection, products } = await this.productsRepository.findBestSellers();
    return {
      selection,
      products: await this.presentMany(products),
    };
  }

  async getSalesOverview() {
    const totals = await this.productsRepository.getSalesOverview();
    return {
      totalUnitsSold: Number(totals.totalUnitsSold),
      totalOrders: Number(totals.totalOrders),
      totalRevenueCents: Number(totals.totalRevenueCents),
    };
  }

  async getPublic(id: string) {
    const product = await this.productsRepository.findPublicById(id);
    if (!product) throw new NotFoundException('Product not found');
    return this.presentOne(product);
  }

  async listAdmin(search?: string, category?: string) {
    const products = await this.productsRepository.findAll(
      search ? normalizeProductSearch(search) || undefined : undefined,
      category,
    );
    return this.presentMany(products, true);
  }

  async create(dto: CreateProductDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Product name cannot be blank');
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    const product = await this.productsRepository.create({
      name,
      searchName: normalizeProductSearch(name),
      description: dto.description.trim(),
      priceCents: dto.priceCents,
      isActive: dto.isActive ?? true,
      category: { connect: { id: dto.categoryId ?? DEFAULT_CATEGORY_ID } },
    });
    return this.presentOne(product, true);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.requireProduct(id);
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new BadRequestException('Product name cannot be blank');
    }
    if (dto.categoryId) await this.requireCategory(dto.categoryId);
    const product = await this.productsRepository.update(id, {
      ...(dto.name !== undefined
        ? {
            name: dto.name.trim(),
            searchName: normalizeProductSearch(dto.name),
          }
        : {}),
      ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
      ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.categoryId ? { category: { connect: { id: dto.categoryId } } } : {}),
    });
    return this.presentOne(product, true);
  }

  async updateStatus(id: string, isActive: boolean) {
    await this.requireProduct(id);
    return this.presentOne(
      await this.productsRepository.update(id, { isActive }),
      true,
    );
  }

  async remove(id: string) {
    const product = await this.requireProduct(id);
    await this.productsRepository.softDelete(id, new Date());
    if (product.imageKey) {
      await this.storageService.deleteObject(product.imageKey).catch(() => undefined);
    }
  }

  async uploadImage(id: string, file?: Express.Multer.File) {
    const product = await this.requireProduct(id);
    const newKey = await this.storageService.uploadProductImage(id, file);
    let updated: ProductWithCategory;
    try {
      updated = await this.productsRepository.update(id, { imageKey: newKey });
      if (product.imageKey) {
        await this.storageService.deleteObject(product.imageKey).catch(() => undefined);
      }
    } catch (error) {
      await this.storageService.deleteObject(newKey).catch(() => undefined);
      throw error;
    }

    return this.presentOne(updated, true);
  }

  async getPublicImage(id: string) {
    const product = await this.productsRepository.findPublicById(id);
    if (!product?.imageKey) throw new NotFoundException('Product image not found');
    return this.getStoredImage(product.imageKey);
  }

  async getAdminImage(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product?.imageKey) throw new NotFoundException('Product image not found');
    return this.getStoredImage(product.imageKey);
  }

  private async getStoredImage(imageKey: string) {
    const object = await this.storageService.getObject(imageKey);
    return {
      body: object.Body as Readable,
      contentType: object.ContentType ?? 'application/octet-stream',
      contentLength: object.ContentLength,
      etag: object.ETag,
    };
  }

  private async requireProduct(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async requireCategory(id: string) {
    if (!(await this.productsRepository.findCategoryById(id))) {
      throw new BadRequestException('Category not found');
    }
  }

  private async presentMany(products: ProductWithCategory[], admin = false) {
    const ratings = await this.productsRepository.findRatingSummaries(
      products.map((product) => product.id),
    );
    const ratingsByProductId = new Map(
      ratings.map((rating) => [rating.productId, rating] as const),
    );

    return products.map((product) =>
      this.present(product, admin, ratingsByProductId.get(product.id)),
    );
  }

  private async presentOne(product: ProductWithCategory, admin = false) {
    const [presented] = await this.presentMany([product], admin);
    return presented;
  }

  private present(
    product: ProductWithCategory,
    admin = false,
    rating?: ProductRatingSummaryRow,
  ) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      categoryId: product.categoryId,
      category: product.category,
      isActive: product.isActive,
      ratingAverage: rating?.ratingAverage ?? null,
      ratingCount: rating?.ratingCount ?? 0,
      imageUrl: product.imageKey
        ? `/api/${admin ? 'admin/products' : 'products'}/${product.id}/image?v=${product.updatedAt.getTime()}`
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
