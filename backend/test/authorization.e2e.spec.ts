import 'reflect-metadata';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';
import { Roles } from '../src/common/decorators/roles.decorator';
import { AUTH_COOKIE_NAME, JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { PrismaService } from '../src/prisma/prisma.service';

@Roles(Role.ADMIN)
@Controller('admin-test')
class AdminTestController {
  @Get()
  get() {
    return { allowed: true };
  }
}

describe('ADMIN/CUSTOMER authorization (Supertest)', () => {
  const secret = 'test-secret-with-enough-entropy';
  const adminId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const customerId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  let app: INestApplication;
  let jwt: JwtService;

  beforeAll(async () => {
    const users = {
      [adminId]: { id: adminId, email: 'admin@test.local', role: Role.ADMIN },
      [customerId]: { id: customerId, email: 'customer@test.local', role: Role.CUSTOMER },
    };
    const module = await Test.createTestingModule({
      controllers: [AdminTestController],
      providers: [
        JwtService,
        Reflector,
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
      new RolesGuard(module.get(Reflector)),
    );
    await app.init();
    jwt = module.get(JwtService);
  });

  afterAll(async () => app.close());

  const cookieFor = async (id: string, role: Role, email: string) => {
    const token = await jwt.signAsync({ sub: id, role, email }, { secret });
    return `${AUTH_COOKIE_NAME}=${token}`;
  };

  it('rejects anonymous requests', async () => {
    await request(app.getHttpServer()).get('/admin-test').expect(401);
  });

  it('rejects a CUSTOMER from ADMIN endpoints', async () => {
    const cookie = await cookieFor(customerId, Role.CUSTOMER, 'customer@test.local');
    await request(app.getHttpServer()).get('/admin-test').set('Cookie', cookie).expect(403);
  });

  it('allows an ADMIN', async () => {
    const cookie = await cookieFor(adminId, Role.ADMIN, 'admin@test.local');
    await request(app.getHttpServer())
      .get('/admin-test')
      .set('Cookie', cookie)
      .expect(200, { allowed: true });
  });
});
