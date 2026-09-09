import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_COOKIE_NAME, JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { OrdersController } from '../src/orders/orders.controller';
import { SetOrderItemRatingDto } from '../src/orders/dto/set-order-item-rating.dto';
import { OrdersRepository } from '../src/orders/orders.repository';
import { OrdersService } from '../src/orders/orders.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProductsController } from '../src/products/products.controller';
import { ProductsRepository } from '../src/products/products.repository';
import { ProductsService } from '../src/products/products.service';

interface TestOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  rating: number | null;
}

interface TestOrder {
  id: string;
  userId: string;
  currency: string;
  totalCents: number;
  createdAt: Date;
  items: TestOrderItem[];
}

describe('purchased item ratings (Supertest)', () => {
  const secret = 'ratings-test-secret-with-at-least-32-bytes';
  const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherCustomerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const productId = '11111111-1111-4111-8111-111111111111';
  const firstOrderId = '22222222-2222-4222-8222-222222222222';
  const firstItemId = '33333333-3333-4333-8333-333333333333';
  const secondOrderId = '44444444-4444-4444-8444-444444444444';
  const secondItemId = '55555555-5555-4555-8555-555555555555';
  const now = new Date('2026-01-01T00:00:00.000Z');
  const category = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Tecnologia',
    slug: 'tecnologia',
  };
  const product = {
    id: productId,
    name: 'Auriculares',
    searchName: 'auriculares',
    description: 'Auriculares de prueba',
    priceCents: 2500,
    isActive: true,
    imageKey: null,
    categoryId: category.id,
    category,
    createdAt: now,
    updatedAt: now,
  };

  let app: INestApplication;
  let jwt: JwtService;
  let orders: TestOrder[];

  const ordersRepository = {
    findForUser: vi.fn((userId: string) =>
      Promise.resolve(orders.filter((order) => order.userId === userId)),
    ),
    findOneForUser: vi.fn((userId: string, orderId: string) =>
      Promise.resolve(
        orders.find((order) => order.id === orderId && order.userId === userId) ?? null,
      ),
    ),
    setItemRatingForUser: vi.fn(
      (userId: string, orderId: string, itemId: string, rating: number) => {
        const order = orders.find(
          (candidate) => candidate.id === orderId && candidate.userId === userId,
        );
        const item = order?.items.find((candidate) => candidate.id === itemId);
        if (!order || !item) return Promise.resolve(null);

        item.rating = rating;
        return Promise.resolve(order);
      },
    ),
  };

  const productsRepository = {
    findPublic: vi.fn(() => Promise.resolve([product])),
    findRatingSummaries: vi.fn((productIds: string[]) => {
      const ratings = orders
        .flatMap((order) => order.items)
        .filter(
          (item): item is TestOrderItem & { rating: number } =>
            productIds.includes(item.productId) && item.rating !== null,
        )
        .map((item) => item.rating);

      if (ratings.length === 0) return Promise.resolve([]);
      return Promise.resolve([
        {
          productId,
          ratingAverage: ratings.reduce((total, rating) => total + rating, 0) / ratings.length,
          ratingCount: ratings.length,
        },
      ]);
    }),
  };

  beforeAll(async () => {
    // Vitest transpiles with esbuild, so restore the method metadata used by Nest's
    // dependency injection and ValidationPipe in the same way as the production build.
    Reflect.defineMetadata('design:paramtypes', [OrdersService], OrdersController);
    Reflect.defineMetadata('design:paramtypes', [ProductsService], ProductsController);
    Reflect.defineMetadata(
      'design:paramtypes',
      [Object, String, String, SetOrderItemRatingDto],
      OrdersController.prototype,
      'setItemRating',
    );

    const users = {
      [ownerId]: {
        id: ownerId,
        email: 'owner@test.local',
        displayName: 'Owner',
        role: Role.CUSTOMER,
        createdAt: now,
      },
      [otherCustomerId]: {
        id: otherCustomerId,
        email: 'other@test.local',
        displayName: 'Other',
        role: Role.CUSTOMER,
        createdAt: now,
      },
    };
    const module = await Test.createTestingModule({
      controllers: [OrdersController, ProductsController],
      providers: [
        JwtService,
        Reflector,
        {
          provide: OrdersService,
          useValue: new OrdersService(ordersRepository as unknown as OrdersRepository),
        },
        {
          provide: ProductsService,
          useValue: new ProductsService(
            productsRepository as unknown as ProductsRepository,
            {} as never,
          ),
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: vi.fn(() => secret) },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: vi.fn(({ where }: { where: { id: string } }) =>
                Promise.resolve(users[where.id as keyof typeof users] ?? null),
              ),
            },
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalGuards(
      new JwtAuthGuard(
        module.get(Reflector),
        module.get(JwtService),
        module.get(ConfigService),
        module.get(PrismaService),
      ),
      new RolesGuard(module.get(Reflector)),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  beforeEach(() => {
    orders = [
      {
        id: firstOrderId,
        userId: ownerId,
        currency: 'usd',
        totalCents: product.priceCents,
        createdAt: now,
        items: [
          {
            id: firstItemId,
            productId,
            productName: product.name,
            quantity: 1,
            unitPriceCents: product.priceCents,
            totalCents: product.priceCents,
            rating: null,
          },
        ],
      },
      {
        id: secondOrderId,
        userId: ownerId,
        currency: 'usd',
        totalCents: product.priceCents,
        createdAt: now,
        items: [
          {
            id: secondItemId,
            productId,
            productName: product.name,
            quantity: 1,
            unitPriceCents: product.priceCents,
            totalCents: product.priceCents,
            rating: 3,
          },
        ],
      },
    ];
    vi.clearAllMocks();
  });

  afterAll(async () => app.close());

  const cookieFor = async (id: string, email: string) => {
    const token = await jwt.signAsync(
      { sub: id, role: Role.CUSTOMER, email },
      { secret },
    );
    return `${AUTH_COOKIE_NAME}=${token}`;
  };

  it('requires authentication and ownership of the purchased order item', async () => {
    const url = `/api/orders/${firstOrderId}/items/${firstItemId}/rating`;
    await request(app.getHttpServer()).put(url).send({ rating: 5 }).expect(401);

    const otherCookie = await cookieFor(otherCustomerId, 'other@test.local');
    await request(app.getHttpServer())
      .put(url)
      .set('Cookie', otherCookie)
      .send({ rating: 5 })
      .expect(404);

    const ownerCookie = await cookieFor(ownerId, 'owner@test.local');
    await request(app.getHttpServer())
      .put(`/api/orders/${firstOrderId}/items/${secondItemId}/rating`)
      .set('Cookie', ownerCookie)
      .send({ rating: 5 })
      .expect(404);

    expect(orders[0].items[0].rating).toBeNull();
  });

  it.each([1, 2, 3, 4, 5])('accepts the rating %i for a purchased item', async (rating) => {
    const ownerCookie = await cookieFor(ownerId, 'owner@test.local');
    const response = await request(app.getHttpServer())
      .put(`/api/orders/${firstOrderId}/items/${firstItemId}/rating`)
      .set('Cookie', ownerCookie)
      .send({ rating })
      .expect(200);

    expect(response.body.items[0]).toMatchObject({ id: firstItemId, rating });
  });

  it.each([0, 6, 1.5])('rejects an invalid rating (%s)', async (rating) => {
    const ownerCookie = await cookieFor(ownerId, 'owner@test.local');
    await request(app.getHttpServer())
      .put(`/api/orders/${firstOrderId}/items/${firstItemId}/rating`)
      .set('Cookie', ownerCookie)
      .send({ rating })
      .expect(400);

    expect(orders[0].items[0].rating).toBeNull();
    expect(ordersRepository.setItemRatingForUser).not.toHaveBeenCalled();
  });

  it('replaces an item rating and exposes the updated public average', async () => {
    const ownerCookie = await cookieFor(ownerId, 'owner@test.local');
    const ratingUrl = `/api/orders/${firstOrderId}/items/${firstItemId}/rating`;

    await request(app.getHttpServer())
      .put(ratingUrl)
      .set('Cookie', ownerCookie)
      .send({ rating: 5 })
      .expect(200);

    const initialCatalogue = await request(app.getHttpServer()).get('/api/products').expect(200);
    expect(initialCatalogue.body[0]).toMatchObject({
      id: productId,
      ratingAverage: 4,
      ratingCount: 2,
    });

    await request(app.getHttpServer())
      .put(ratingUrl)
      .set('Cookie', ownerCookie)
      .send({ rating: 1 })
      .expect(200);

    const updatedCatalogue = await request(app.getHttpServer()).get('/api/products').expect(200);
    expect(updatedCatalogue.body[0]).toMatchObject({
      id: productId,
      ratingAverage: 2,
      ratingCount: 2,
    });
  });
});
