import { NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { describe, expect, it, vi } from 'vitest';
import { SetOrderItemRatingDto } from '../src/orders/dto/set-order-item-rating.dto';
import { OrdersService } from '../src/orders/orders.service';

describe('OrdersService ownership', () => {
  it('queries an order with both order id and authenticated user id', async () => {
    const repository = {
      findOneForUser: vi.fn().mockResolvedValue({
        id: 'order-a',
        userId: 'customer-a',
        currency: 'usd',
        totalCents: 5000,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        items: [],
      }),
    };
    const service = new OrdersService(repository as never);

    await service.get('customer-a', 'order-a');

    expect(repository.findOneForUser).toHaveBeenCalledWith('customer-a', 'order-a');
  });

  it('returns not found rather than leaking another customer order', async () => {
    const repository = { findOneForUser: vi.fn().mockResolvedValue(null) };
    const service = new OrdersService(repository as never);

    await expect(service.get('customer-b', 'order-a')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sets a rating through the ownership-scoped repository operation', async () => {
    const order = {
      id: 'order-a',
      userId: 'customer-a',
      currency: 'usd',
      totalCents: 5000,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      items: [
        {
          id: 'item-a',
          productId: 'product-a',
          productName: 'Product A',
          quantity: 1,
          unitPriceCents: 5000,
          totalCents: 5000,
          rating: 5,
        },
      ],
    };
    const repository = {
      setItemRatingForUser: vi.fn().mockResolvedValue(order),
    };
    const service = new OrdersService(repository as never);

    const result = await service.setItemRating('customer-a', 'order-a', 'item-a', { rating: 5 });

    expect(repository.setItemRatingForUser).toHaveBeenCalledWith(
      'customer-a',
      'order-a',
      'item-a',
      5,
    );
    expect(result.items[0]?.rating).toBe(5);
  });

  it('does not reveal or rate an item outside the authenticated customer order', async () => {
    const repository = { setItemRatingForUser: vi.fn().mockResolvedValue(null) };
    const service = new OrdersService(repository as never);

    await expect(
      service.setItemRating('customer-b', 'order-a', 'item-a', { rating: 4 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.setItemRatingForUser).toHaveBeenCalledWith(
      'customer-b',
      'order-a',
      'item-a',
      4,
    );
  });
});

describe('SetOrderItemRatingDto', () => {
  it.each([1, 2, 3, 4, 5])('accepts the integer rating %i', async (rating) => {
    const dto = new SetOrderItemRatingDto();
    dto.rating = rating;

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([0, 6, 1.5])('rejects an out-of-range or non-integer rating (%s)', async (rating) => {
    const dto = new SetOrderItemRatingDto();
    dto.rating = rating;

    expect(await validate(dto)).not.toHaveLength(0);
  });
});
