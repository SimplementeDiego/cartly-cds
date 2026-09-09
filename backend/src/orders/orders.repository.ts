import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const includeItems = { items: { orderBy: { id: 'asc' as const } } };

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: includeItems,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOneForUser(userId: string, orderId: string) {
    // Filtering by both identifiers is the ownership boundary; never fetch by id and check later.
    return this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: includeItems,
    });
  }

  setItemRatingForUser(userId: string, orderId: string, itemId: string, rating: number) {
    return this.prisma.$transaction(async (tx) => {
      // A single ownership-scoped update prevents a customer from rating an item from
      // another order and avoids revealing whether that item exists.
      const updated = await tx.orderItem.updateMany({
        where: {
          id: itemId,
          orderId,
          order: { userId },
        },
        data: { rating },
      });
      if (updated.count === 0) return null;

      return tx.order.findFirst({
        where: { id: orderId, userId },
        include: includeItems,
      });
    });
  }
}
