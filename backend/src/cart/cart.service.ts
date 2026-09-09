import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsRepository } from '../products/products.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartRepository } from './cart.repository';

type DetailedCart = Awaited<ReturnType<CartRepository['ensureCart']>>;

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly config: ConfigService,
  ) {}

  async get(userId: string) {
    return this.present(await this.cartRepository.ensureCart(userId));
  }

  async add(userId: string, dto: AddCartItemDto) {
    await this.requireActiveProduct(dto.productId);
    const cart = await this.cartRepository.ensureCart(userId);
    const current = await this.cartRepository.findItem(cart.id, dto.productId);
    const nextQuantity = (current?.quantity ?? 0) + dto.quantity;
    if (nextQuantity > 99) {
      throw new BadRequestException('A cart item cannot exceed 99 units');
    }
    return this.present(await this.cartRepository.setItem(cart.id, dto.productId, nextQuantity));
  }

  async update(userId: string, productId: string, dto: UpdateCartItemDto) {
    await this.requireActiveProduct(productId);
    const cart = await this.cartRepository.ensureCart(userId);
    const current = await this.cartRepository.findItem(cart.id, productId);
    if (!current) throw new NotFoundException('Cart item not found');
    return this.present(await this.cartRepository.setItem(cart.id, productId, dto.quantity));
  }

  async remove(userId: string, productId: string) {
    const cart = await this.cartRepository.ensureCart(userId);
    const result = await this.cartRepository.removeItem(cart.id, productId);
    if (!result.deleted) throw new NotFoundException('Cart item not found');
    return this.present(result.cart);
  }

  private async requireActiveProduct(productId: string) {
    const product = await this.productsRepository.findPublicById(productId);
    if (!product) throw new NotFoundException('Active product not found');
    return product;
  }

  private present(cart: DetailedCart) {
    const items = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      lineTotalCents: item.quantity * item.product.priceCents,
      product: this.presentProduct(item.product),
    }));
    const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
    return {
      id: cart.id,
      items,
      subtotalCents,
      totalCents: subtotalCents,
      currency: this.config.get<string>('CURRENCY', 'usd'),
    };
  }

  private presentProduct(product: DetailedCart['items'][number]['product']) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      categoryId: product.categoryId,
      category: product.category,
      isActive: product.isActive,
      imageUrl: product.imageKey
        ? `/api/products/${product.id}/image?v=${product.updatedAt.getTime()}`
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
