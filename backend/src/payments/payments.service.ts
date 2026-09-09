import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './payments.constants';
import { CheckoutSnapshotItem, PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly config: ConfigService,
  ) {}

  async createCheckout(userId: string) {
    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (
      !stripeSecretKey.startsWith('sk_test_') ||
      stripeSecretKey === 'sk_test_replace_me'
    ) {
      throw new ServiceUnavailableException('Stripe is not configured');
    }

    // Prices, names and active status are read again here; the request contains no monetary data.
    const cart = await this.paymentsRepository.getPricedCart(userId);
    if (!cart?.items.length) throw new BadRequestException('The cart is empty');
    if (cart.items.some((item) => !item.product.isActive)) {
      throw new BadRequestException('The cart contains inactive products');
    }

    const items: CheckoutSnapshotItem[] = cart.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      unitPriceCents: item.product.priceCents,
      totalCents: item.quantity * item.product.priceCents,
    }));
    const totalCents = items.reduce((total, item) => total + item.totalCents, 0);
    if (!Number.isSafeInteger(totalCents) || totalCents > 2_147_483_647) {
      throw new BadRequestException('Cart total exceeds the supported monetary limit');
    }
    const currency = this.config.get<string>('CURRENCY', 'usd').toLowerCase();
    const checkout = await this.paymentsRepository.createPendingCheckout(
      userId,
      currency,
      totalCents,
      items,
    );

    try {
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'payment',
          client_reference_id: checkout.id,
          metadata: { checkoutId: checkout.id, userId },
          line_items: items.map((item) => ({
            quantity: item.quantity,
            price_data: {
              currency,
              unit_amount: item.unitPriceCents,
              product_data: { name: item.productName },
            },
          })),
          success_url: this.config.getOrThrow<string>('STRIPE_SUCCESS_URL'),
          cancel_url: this.config.getOrThrow<string>('STRIPE_CANCEL_URL'),
        },
        { idempotencyKey: `cartly-checkout-${checkout.id}` },
      );
      await this.paymentsRepository.attachStripeSession(checkout.id, session.id);
      if (!session.url) throw new ServiceUnavailableException('Stripe did not return a checkout URL');
      return { url: session.url, sessionId: session.id };
    } catch (error) {
      await this.paymentsRepository.markExpired(checkout.id).catch(() => undefined);
      throw error;
    }
  }

  async getCheckoutStatus(userId: string, stripeSessionId: string) {
    if (!/^cs_test_[A-Za-z0-9]+$/.test(stripeSessionId)) {
      throw new BadRequestException('Invalid Stripe checkout session id');
    }

    const checkout = await this.paymentsRepository.findCheckoutForUser(
      userId,
      stripeSessionId,
    );
    if (!checkout) throw new NotFoundException('Checkout session not found');

    return {
      sessionId: checkout.stripeSessionId,
      status: checkout.status,
      orderId: checkout.order?.id ?? null,
    };
  }

  async handleWebhook(rawBody: Buffer, signature?: string) {
    if (!signature) throw new BadRequestException('Missing Stripe-Signature header');
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Stripe webhook is not configured');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.livemode) {
      throw new BadRequestException('Live-mode Stripe events are not accepted');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        await this.processCompletedSession(event.id, event.type, event.data.object);
        break;
      case 'checkout.session.expired':
        await this.paymentsRepository.markCheckoutUnsuccessful(
          event.id,
          event.type,
          {
            stripeSessionId: event.data.object.id,
            checkoutId: event.data.object.metadata?.checkoutId,
          },
          'EXPIRED',
        );
        break;
      case 'checkout.session.async_payment_failed':
        await this.paymentsRepository.markCheckoutUnsuccessful(
          event.id,
          event.type,
          {
            stripeSessionId: event.data.object.id,
            checkoutId: event.data.object.metadata?.checkoutId,
          },
          'FAILED',
        );
        break;
      default:
        await this.paymentsRepository.recordIgnoredEvent(event.id, event.type);
    }
    return { received: true };
  }

  async processCompletedSession(
    eventId: string,
    eventType: string,
    session: Stripe.Checkout.Session,
  ) {
    if (session.payment_status !== 'paid') {
      await this.paymentsRepository.recordIgnoredEvent(eventId, eventType);
      return { ignored: true };
    }
    if (session.amount_total === null || !session.currency) {
      throw new BadRequestException('Stripe session is missing amount or currency');
    }

    return this.paymentsRepository.completeCheckout(eventId, eventType, {
      stripeSessionId: session.id,
      checkoutId: session.metadata?.checkoutId,
      amountTotal: session.amount_total,
      currency: session.currency.toLowerCase(),
    });
  }
}
