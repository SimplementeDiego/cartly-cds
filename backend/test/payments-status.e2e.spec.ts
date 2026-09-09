import 'reflect-metadata';
import { INestApplication, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AUTH_COOKIE_NAME, JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('checkout status authorization (Supertest)', () => {
  const secret = 'checkout-status-test-secret-with-32-bytes';
  const ownerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const sessionId = 'cs_test_owned123';
  let app: INestApplication;
  let jwt: JwtService;

  const getCheckoutStatus = vi.fn((userId: string, requestedSessionId: string) => {
    if (userId !== ownerId || requestedSessionId !== sessionId) {
      throw new NotFoundException('Checkout session not found');
    }
    return { sessionId, status: 'PAID', orderId: 'order-1' };
  });

  beforeAll(async () => {
    const users = {
      [ownerId]: { id: ownerId, email: 'owner@test.local', role: Role.CUSTOMER },
      [otherId]: { id: otherId, email: 'other@test.local', role: Role.CUSTOMER },
    };
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        JwtService,
        Reflector,
        {
          provide: PaymentsService,
          useValue: {
            createCheckout: vi.fn(),
            getCheckoutStatus,
            handleWebhook: vi.fn(),
          },
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
    app.use(cookieParser());
    app.useGlobalGuards(
      new JwtAuthGuard(
        module.get(Reflector),
        module.get(JwtService),
        module.get(ConfigService),
        module.get(PrismaService),
      ),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => app.close());

  const cookieFor = async (id: string, email: string) => {
    const token = await jwt.signAsync(
      { sub: id, role: Role.CUSTOMER, email },
      { secret },
    );
    return `${AUTH_COOKIE_NAME}=${token}`;
  };

  it('rejects an anonymous status request', async () => {
    await request(app.getHttpServer())
      .get(`/payments/checkout/${sessionId}/status`)
      .expect(401);
  });

  it('returns the status of the authenticated owner checkout', async () => {
    const cookie = await cookieFor(ownerId, 'owner@test.local');

    const response = await request(app.getHttpServer())
      .get(`/payments/checkout/${sessionId}/status`)
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body).toEqual({ sessionId, status: 'PAID', orderId: 'order-1' });
    expect(getCheckoutStatus).toHaveBeenCalledWith(ownerId, sessionId);
  });

  it('does not expose the checkout to another authenticated user', async () => {
    const cookie = await cookieFor(otherId, 'other@test.local');

    await request(app.getHttpServer())
      .get(`/payments/checkout/${sessionId}/status`)
      .set('Cookie', cookie)
      .expect(404);
  });
});
