import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PaymentsService } from '../src/payments/payments.service';

const config = {
  get: vi.fn((key: string, fallback?: unknown) => {
    const values: Record<string, unknown> = {
      STRIPE_SECRET_KEY: 'sk_test_example',
      CURRENCY: 'usd',
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
    };
    return values[key] ?? fallback;
  }),
  getOrThrow: vi.fn((key: string) => {
    const values: Record<string, string> = {
      STRIPE_SUCCESS_URL: 'http://localhost/success',
      STRIPE_CANCEL_URL: 'http://localhost/cart',
    };
    return values[key];
  }),
};

describe('PaymentsService checkout calculation', () => {
  it('uses current database price and calculates the checkout total server-side', async () => {
    const repository = {
      getPricedCart: vi.fn().mockResolvedValue({
        items: [
          {
            quantity: 2,
            product: {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              name: 'Database product',
              priceCents: 2599,
              isActive: true,
            },
          },
        ],
      }),
      createPendingCheckout: vi.fn().mockResolvedValue({ id: 'checkout-id' }),
      attachStripeSession: vi.fn().mockResolvedValue(undefined),
      markExpired: vi.fn().mockResolvedValue(undefined),
    };
    const create = vi.fn().mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.test' });
    const stripe = { checkout: { sessions: { create } } };
    const service = new PaymentsService(stripe as never, repository as never, config as never);

    const response = await service.createCheckout('customer-id');

    expect(repository.createPendingCheckout).toHaveBeenCalledWith(
      'customer-id',
      'usd',
      5198,
      [
        {
          productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          productName: 'Database product',
          quantity: 2,
          unitPriceCents: 2599,
          totalCents: 5198,
        },
      ],
    );
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(2599);
    expect(response).toEqual({ url: 'https://checkout.stripe.test', sessionId: 'cs_test_1' });
  });

  it('refuses checkout if any cart product became inactive', async () => {
    const repository = {
      getPricedCart: vi.fn().mockResolvedValue({
        items: [{ quantity: 1, product: { isActive: false } }],
      }),
    };
    const stripe = { checkout: { sessions: { create: vi.fn() } } };
    const service = new PaymentsService(stripe as never, repository as never, config as never);

    await expect(service.createCheckout('customer-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('returns status only for the checkout owned by the authenticated user', async () => {
    const repository = {
      findCheckoutForUser: vi.fn().mockResolvedValue({
        stripeSessionId: 'cs_test_owned123',
        status: 'PAID',
        order: { id: 'order-1' },
      }),
    };
    const service = new PaymentsService({} as never, repository as never, config as never);

    await expect(
      service.getCheckoutStatus('customer-1', 'cs_test_owned123'),
    ).resolves.toEqual({
      sessionId: 'cs_test_owned123',
      status: 'PAID',
      orderId: 'order-1',
    });
    expect(repository.findCheckoutForUser).toHaveBeenCalledWith(
      'customer-1',
      'cs_test_owned123',
    );
  });

  it('does not reveal a checkout belonging to another user', async () => {
    const repository = { findCheckoutForUser: vi.fn().mockResolvedValue(null) };
    const service = new PaymentsService({} as never, repository as never, config as never);

    await expect(
      service.getCheckoutStatus('customer-2', 'cs_test_owned123'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PaymentsService unsuccessful Stripe events', () => {
  it.each([
    ['checkout.session.expired', 'EXPIRED'],
    ['checkout.session.async_payment_failed', 'FAILED'],
  ] as const)('routes %s to the terminal checkout status %s', async (type, status) => {
    const session = {
      id: 'cs_test_unsuccessful123',
      metadata: { checkoutId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    };
    const event = {
      id: `evt_${status.toLowerCase()}`,
      type,
      livemode: false,
      data: { object: session },
    };
    const repository = {
      markCheckoutUnsuccessful: vi.fn().mockResolvedValue({
        duplicate: false,
        updated: true,
      }),
      recordIgnoredEvent: vi.fn(),
    };
    const stripe = {
      webhooks: { constructEvent: vi.fn().mockReturnValue(event) },
    };
    const service = new PaymentsService(stripe as never, repository as never, config as never);

    await expect(service.handleWebhook(Buffer.from('{}'), 'signature')).resolves.toEqual({
      received: true,
    });
    expect(repository.markCheckoutUnsuccessful).toHaveBeenCalledWith(
      event.id,
      type,
      {
        stripeSessionId: session.id,
        checkoutId: session.metadata.checkoutId,
      },
      status,
    );
    expect(repository.recordIgnoredEvent).not.toHaveBeenCalled();
  });
});
