import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PaymentsRepository } from '../src/payments/payments.repository';

describe('Stripe webhook idempotency', () => {
  it('creates exactly one order when the same event is delivered twice', async () => {
    const processedEvents = new Set<string>();
    let order: Record<string, unknown> | null = null;
    let orderCreates = 0;
    const checkout = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      stripeSessionId: 'cs_test_1',
      currency: 'usd',
      totalCents: 4000,
      items: [
        {
          productId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          productName: 'Snapshot name',
          quantity: 2,
          unitPriceCents: 2000,
          totalCents: 4000,
        },
      ],
    };
    const tx = {
      webhookEvent: {
        findUnique: vi.fn(({ where }) =>
          Promise.resolve(processedEvents.has(where.stripeEventId) ? { id: 'event' } : null),
        ),
        create: vi.fn(({ data }) => {
          processedEvents.add(data.stripeEventId);
          return Promise.resolve(data);
        }),
      },
      checkoutSession: {
        findUnique: vi.fn().mockResolvedValue(checkout),
        findFirst: vi.fn().mockResolvedValue(checkout),
        update: vi.fn().mockResolvedValue(checkout),
      },
      order: {
        findUnique: vi.fn(() => Promise.resolve(order)),
        create: vi.fn(({ data }) => {
          orderCreates += 1;
          order = { id: 'order-1', ...data, items: checkout.items };
          return Promise.resolve(order);
        }),
      },
      cartItem: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cart-item-1', quantity: 2 }),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
    };
    const prisma = {
      $transaction: vi.fn((callback) => callback(tx)),
    };
    const repository = new PaymentsRepository(prisma as never);
    const paid = {
      stripeSessionId: 'cs_test_1',
      checkoutId: checkout.id,
      amountTotal: 4000,
      currency: 'usd',
    };

    const first = await repository.completeCheckout('evt_1', 'checkout.session.completed', paid);
    const retry = await repository.completeCheckout('evt_1', 'checkout.session.completed', paid);

    expect(first.duplicate).toBe(false);
    expect(retry.duplicate).toBe(true);
    expect(orderCreates).toBe(1);
    expect(tx.cartItem.delete).toHaveBeenCalledTimes(1);
    expect(tx.cartItem.update).not.toHaveBeenCalled();
  });

  it('applies an unsuccessful event once and never downgrades a paid checkout', async () => {
    const processedEvents = new Set<string>();
    let checkoutStatus = 'PENDING';
    const checkout = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      stripeSessionId: 'cs_test_failure1',
      items: [],
    };
    const updateMany = vi.fn(({ data }: { data: { status: string } }) => {
      if (checkoutStatus !== 'PENDING') return Promise.resolve({ count: 0 });
      checkoutStatus = data.status;
      return Promise.resolve({ count: 1 });
    });
    const tx = {
      webhookEvent: {
        findUnique: vi.fn(({ where }) =>
          Promise.resolve(processedEvents.has(where.stripeEventId) ? { id: 'event' } : null),
        ),
        create: vi.fn(({ data }) => {
          processedEvents.add(data.stripeEventId);
          return Promise.resolve(data);
        }),
      },
      checkoutSession: {
        findUnique: vi.fn(() => Promise.resolve({ ...checkout, status: checkoutStatus })),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany,
      },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const repository = new PaymentsRepository(prisma as never);
    const reference = {
      stripeSessionId: checkout.stripeSessionId,
      checkoutId: checkout.id,
    };

    const first = await repository.markCheckoutUnsuccessful(
      'evt_failed',
      'checkout.session.async_payment_failed',
      reference,
      'FAILED',
    );
    const repeated = await repository.markCheckoutUnsuccessful(
      'evt_failed',
      'checkout.session.async_payment_failed',
      reference,
      'FAILED',
    );

    expect(first).toEqual({ duplicate: false, updated: true });
    expect(repeated).toEqual({ duplicate: true, updated: false });
    expect(checkoutStatus).toBe('FAILED');
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: checkout.id, status: 'PENDING' },
      data: { status: 'FAILED', stripeSessionId: checkout.stripeSessionId },
    });

    checkoutStatus = 'PAID';
    const lateExpiration = await repository.markCheckoutUnsuccessful(
      'evt_expired_late',
      'checkout.session.expired',
      reference,
      'EXPIRED',
    );

    expect(lateExpiration).toEqual({ duplicate: false, updated: false });
    expect(checkoutStatus).toBe('PAID');
  });

  it('does not consume an event before its checkout can be resolved', async () => {
    const createEvent = vi.fn();
    const tx = {
      webhookEvent: { findUnique: vi.fn().mockResolvedValue(null), create: createEvent },
      checkoutSession: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn(),
      },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(tx)) };
    const repository = new PaymentsRepository(prisma as never);

    await expect(
      repository.markCheckoutUnsuccessful(
        'evt_not_linked_yet',
        'checkout.session.expired',
        {
          stripeSessionId: 'cs_test_notlinked',
          checkoutId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        },
        'EXPIRED',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(createEvent).not.toHaveBeenCalled();
  });
});
