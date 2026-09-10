import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CartRepository } from '../src/cart/cart.repository';
import { CartService } from '../src/cart/cart.service';

const cartId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const productId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('CartRepository atomic additions', () => {
  it('increments the database value in one upsert and enforces the limit in that statement', async () => {
    const cart = { id: cartId, items: [] };
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ quantity: 3 }]),
      cart: { findUniqueOrThrow: vi.fn().mockResolvedValue(cart) },
    };
    const repository = new CartRepository(prisma as never);

    await expect(repository.addItem(cartId, productId, 2)).resolves.toBe(cart);

    const [queryParts, generatedId, queryCartId, queryProductId, increment] =
      prisma.$queryRaw.mock.calls[0];
    const sql = (queryParts as TemplateStringsArray).join('?').replace(/\s+/g, ' ');

    expect(sql).toContain('ON CONFLICT (cart_id, product_id) DO UPDATE');
    expect(sql).toContain('SET quantity = cart_items.quantity + EXCLUDED.quantity');
    expect(sql).toContain('WHERE cart_items.quantity + EXCLUDED.quantity <= 99');
    expect(generatedId).toMatch(/^[0-9a-f-]{36}$/i);
    expect([queryCartId, queryProductId, increment]).toEqual([cartId, productId, 2]);
    expect(prisma.cart.findUniqueOrThrow).toHaveBeenCalledOnce();
  });

  it('returns no cart when the conditional upsert rejects an increment above 99', async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      cart: { findUniqueOrThrow: vi.fn() },
    };
    const repository = new CartRepository(prisma as never);

    await expect(repository.addItem(cartId, productId, 1)).resolves.toBeNull();
    expect(prisma.cart.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});

describe('CartService atomic additions', () => {
  it('maps a rejected atomic increment to the public quantity-limit error', async () => {
    const repository = {
      ensureCart: vi.fn().mockResolvedValue({ id: cartId, items: [] }),
      addItem: vi.fn().mockResolvedValue(null),
      findItem: vi.fn(),
      setItem: vi.fn(),
    };
    const products = { findPublicById: vi.fn().mockResolvedValue({ id: productId }) };
    const service = new CartService(repository as never, products as never, {} as never);

    await expect(service.add('user-a', { productId, quantity: 2 })).rejects.toThrow(
      new BadRequestException('A cart item cannot exceed 99 units'),
    );
    expect(repository.addItem).toHaveBeenCalledWith(cartId, productId, 2);
    expect(repository.findItem).not.toHaveBeenCalled();
    expect(repository.setItem).not.toHaveBeenCalled();
  });
});
