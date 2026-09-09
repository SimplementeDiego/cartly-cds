import { describe, expect, it, vi } from 'vitest';
import { OrdersRepository } from '../src/orders/orders.repository';

describe('OrdersRepository item rating ownership', () => {
  it('includes customer, order and item identifiers in the rating update', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const findFirst = vi.fn();
    const transactionClient = {
      orderItem: { updateMany },
      order: { findFirst },
    };
    const prisma = {
      $transaction: vi.fn(
        (operation: (tx: typeof transactionClient) => unknown) => operation(transactionClient),
      ),
    };
    const repository = new OrdersRepository(prisma as never);

    await expect(
      repository.setItemRatingForUser('customer-a', 'order-a', 'item-a', 4),
    ).resolves.toBeNull();

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'item-a',
        orderId: 'order-a',
        order: { userId: 'customer-a' },
      },
      data: { rating: 4 },
    });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('returns the updated order only through the same ownership boundary', async () => {
    const order = { id: 'order-a', items: [{ id: 'item-a', rating: 3 }] };
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findFirst = vi.fn().mockResolvedValue(order);
    const transactionClient = {
      orderItem: { updateMany },
      order: { findFirst },
    };
    const prisma = {
      $transaction: vi.fn(
        (operation: (tx: typeof transactionClient) => unknown) => operation(transactionClient),
      ),
    };
    const repository = new OrdersRepository(prisma as never);

    const result = await repository.setItemRatingForUser(
      'customer-a',
      'order-a',
      'item-a',
      3,
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'order-a', userId: 'customer-a' },
      include: { items: { orderBy: { id: 'asc' } } },
    });
    expect(result).toBe(order);
  });
});
