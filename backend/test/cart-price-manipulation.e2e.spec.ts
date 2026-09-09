import 'reflect-metadata';
import { Body, Controller, INestApplication, Post, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AddCartItemDto } from '../src/cart/dto/add-cart-item.dto';

const addItem = vi.fn((dto: AddCartItemDto) => dto);

@Controller('cart')
class ValidatedCartTestController {
  @Post('items')
  add(@Body() dto: AddCartItemDto) {
    return addItem(dto);
  }
}

// Vitest transpiles with esbuild, which does not emit TypeScript's design:paramtypes.
// Restore the same metadata `tsc` emits so this Supertest app exercises Nest's real pipe.
Reflect.defineMetadata(
  'design:paramtypes',
  [AddCartItemDto],
  ValidatedCartTestController.prototype,
  'add',
);

describe('cart input price manipulation (Supertest)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ValidatedCartTestController],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => app.close());

  it('rejects client-supplied price fields', async () => {
    await request(app.getHttpServer())
      .post('/cart/items')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
        priceCents: 1,
      })
      .expect(400);

    expect(addItem).not.toHaveBeenCalled();
  });
});
