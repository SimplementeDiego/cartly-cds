import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CheckoutSnapshotItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface CheckoutSessionReference {
  stripeSessionId: string;
  checkoutId?: string;
}

export interface PaidSessionData extends CheckoutSessionReference {
  amountTotal: number;
  currency: string;
}

export type UnsuccessfulCheckoutStatus = 'EXPIRED' | 'FAILED';

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getPricedCart(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
  }

  createPendingCheckout(
    userId: string,
    currency: string,
    totalCents: number,
    items: CheckoutSnapshotItem[],
  ) {
    return this.prisma.checkoutSession.create({
      data: {
        userId,
        currency,
        totalCents,
        items: { create: items },
      },
      include: { items: true },
    });
  }

  attachStripeSession(checkoutId: string, stripeSessionId: string) {
    return this.prisma.checkoutSession.update({
      where: { id: checkoutId },
      data: { stripeSessionId },
    });
  }

  findCheckoutForUser(userId: string, stripeSessionId: string) {
    return this.prisma.checkoutSession.findFirst({
      where: { userId, stripeSessionId },
      select: {
        stripeSessionId: true,
        status: true,
        order: { select: { id: true } },
      },
    });
  }

  markExpired(checkoutId: string) {
    return this.prisma.checkoutSession.updateMany({
      where: { id: checkoutId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });
  }

  async recordIgnoredEvent(stripeEventId: string, type: string) {
    await this.prisma.webhookEvent.upsert({
      where: { stripeEventId },
      create: { stripeEventId, type },
      update: {},
    });
  }

  async markCheckoutUnsuccessful(
    stripeEventId: string,
    type: string,
    session: CheckoutSessionReference,
    status: UnsuccessfulCheckoutStatus,
  ) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.markCheckoutUnsuccessfulTransaction(
          stripeEventId,
          type,
          session,
          status,
        );
      } catch (error) {
        if (this.isSerializationFailure(error) && attempt < 2) continue;
        if (this.isUniqueViolation(error)) {
          const processed = await this.prisma.webhookEvent.findUnique({
            where: { stripeEventId },
          });
          if (processed) return { duplicate: true as const, updated: false };
        }
        throw error;
      }
    }
    throw new Error('Could not update checkout status');
  }

  private markCheckoutUnsuccessfulTransaction(
    stripeEventId: string,
    type: string,
    session: CheckoutSessionReference,
    status: UnsuccessfulCheckoutStatus,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const processed = await tx.webhookEvent.findUnique({ where: { stripeEventId } });
        if (processed) return { duplicate: true as const, updated: false };

        const checkout = await this.findCheckoutSafely(tx, session);
        if (!checkout) throw new NotFoundException('Checkout session not found');

        // A delayed or out-of-order failure must never downgrade a paid checkout.
        const update = await tx.checkoutSession.updateMany({
          where: { id: checkout.id, status: 'PENDING' },
          data: { status, stripeSessionId: session.stripeSessionId },
        });
        await tx.webhookEvent.create({ data: { stripeEventId, type } });

        return { duplicate: false as const, updated: update.count === 1 };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async completeCheckout(stripeEventId: string, type: string, paid: PaidSessionData) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.completeCheckoutTransaction(stripeEventId, type, paid);
      } catch (error) {
        if (this.isSerializationFailure(error) && attempt < 2) continue;
        if (this.isUniqueViolation(error)) {
          return this.resolveConcurrentCompletion(stripeEventId, type, paid);
        }
        throw error;
      }
    }
    throw new Error('Could not complete checkout transaction');
  }

  private completeCheckoutTransaction(stripeEventId: string, type: string, paid: PaidSessionData) {
    return this.prisma.$transaction(
      async (tx) => {
        const processed = await tx.webhookEvent.findUnique({ where: { stripeEventId } });
        if (processed) return { duplicate: true as const, order: null };

        const checkout = await this.findCheckout(tx, paid);
        if (!checkout) throw new NotFoundException('Checkout session not found');

        if (checkout.totalCents !== paid.amountTotal || checkout.currency !== paid.currency) {
          throw new BadRequestException('Paid amount does not match the checkout snapshot');
        }

        const existingOrder = await tx.order.findUnique({
          where: { checkoutSessionId: checkout.id },
          include: { items: true },
        });
        if (existingOrder) {
          await tx.webhookEvent.create({ data: { stripeEventId, type } });
          return { duplicate: true as const, order: existingOrder };
        }

        const order = await tx.order.create({
          data: {
            userId: checkout.userId,
            checkoutSessionId: checkout.id,
            stripeCheckoutSessionId: paid.stripeSessionId,
            currency: checkout.currency,
            totalCents: checkout.totalCents,
            items: {
              create: checkout.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPriceCents: item.unitPriceCents,
                totalCents: item.totalCents,
              })),
            },
          },
          include: { items: true },
        });

        await tx.checkoutSession.update({
          where: { id: checkout.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            stripeSessionId: paid.stripeSessionId,
          },
        });
        // Consume only the quantities captured by this checkout. Items added in another
        // tab while the customer was on Stripe remain in the cart.
        for (const purchasedItem of checkout.items) {
          const currentItem = await tx.cartItem.findFirst({
            where: {
              productId: purchasedItem.productId,
              cart: { userId: checkout.userId },
            },
          });
          if (!currentItem) continue;
          const remaining = currentItem.quantity - purchasedItem.quantity;
          if (remaining > 0) {
            await tx.cartItem.update({
              where: { id: currentItem.id },
              data: { quantity: remaining },
            });
          } else {
            await tx.cartItem.delete({ where: { id: currentItem.id } });
          }
        }
        await tx.webhookEvent.create({ data: { stripeEventId, type } });

        return { duplicate: false as const, order };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private findCheckout(
    tx: Prisma.TransactionClient,
    paid: PaidSessionData,
  ) {
    return this.findCheckoutSafely(tx, paid);
  }

  private async resolveConcurrentCompletion(
    stripeEventId: string,
    type: string,
    paid: PaidSessionData,
  ) {
    const checkout = await this.findCheckoutSafely(this.prisma, paid);
    const order = checkout
      ? await this.prisma.order.findUnique({
          where: { checkoutSessionId: checkout.id },
          include: { items: true },
        })
      : null;
    if (!order) throw new NotFoundException('Completed order could not be resolved');
    await this.recordIgnoredEvent(stripeEventId, type);
    return { duplicate: true as const, order };
  }

  private async findCheckoutSafely(
    client: Pick<Prisma.TransactionClient, 'checkoutSession'>,
    session: CheckoutSessionReference,
  ): Promise<Prisma.CheckoutSessionGetPayload<{ include: { items: true } }> | null> {
    // A Stripe id already linked in our database is authoritative. Metadata is only a
    // recovery path for the tiny window between Stripe creation and persisting its id.
    const linked = await client.checkoutSession.findUnique({
      where: { stripeSessionId: session.stripeSessionId },
      include: { items: true },
    });
    if (linked) return linked;

    const validCheckoutId =
      session.checkoutId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        session.checkoutId,
      )
        ? session.checkoutId
        : undefined;
    if (!validCheckoutId) return null;

    return client.checkoutSession.findFirst({
      where: {
        id: validCheckoutId,
        OR: [{ stripeSessionId: null }, { stripeSessionId: session.stripeSessionId }],
      },
      include: { items: true },
    });
  }

  private isSerializationFailure(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
