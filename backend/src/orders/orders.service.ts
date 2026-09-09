import { Injectable, NotFoundException } from '@nestjs/common';
import { SetOrderItemRatingDto } from './dto/set-order-item-rating.dto';
import { OrdersRepository } from './orders.repository';

type OrderWithItems = Awaited<ReturnType<OrdersRepository['findOneForUser']>> & {};

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async list(userId: string) {
    const orders = await this.ordersRepository.findForUser(userId);
    return orders.map((order) => this.present(order));
  }

  async get(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOneForUser(userId, orderId);
    if (!order) throw new NotFoundException('Order not found');
    return this.present(order);
  }

  async setItemRating(
    userId: string,
    orderId: string,
    itemId: string,
    dto: SetOrderItemRatingDto,
  ) {
    const order = await this.ordersRepository.setItemRatingForUser(
      userId,
      orderId,
      itemId,
      dto.rating,
    );
    if (!order) throw new NotFoundException('Order item not found');
    return this.present(order);
  }

  private present(order: NonNullable<OrderWithItems>) {
    return {
      id: order.id,
      status: 'PAID' as const,
      currency: order.currency,
      totalCents: order.totalCents,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalCents: item.totalCents,
        rating: item.rating,
      })),
    };
  }
}
