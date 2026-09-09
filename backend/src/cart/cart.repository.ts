import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const cartInclude = {
  items: {
    include: { product: { include: { category: true } } },
    orderBy: { id: 'asc' as const },
  },
};

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  ensureCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: cartInclude,
    });
  }

  findItem(cartId: string, productId: string) {
    return this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId, productId } },
    });
  }

  async setItem(cartId: string, productId: string, quantity: number) {
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      create: { cartId, productId, quantity },
      update: { quantity },
    });
    return this.prisma.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
  }

  async removeItem(cartId: string, productId: string) {
    const deleted = await this.prisma.cartItem.deleteMany({ where: { cartId, productId } });
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: cartInclude,
    });
    return { deleted: deleted.count > 0, cart };
  }
}
