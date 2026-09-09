import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('API client', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('incluye credenciales y solo envía productId/cantidad al agregar al carrito', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'cart', items: [], subtotalCents: 0, totalCents: 0, currency: 'usd' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await api.cart.add('product-1', 2);

    expect(fetchMock).toHaveBeenCalledWith('/api/cart/items', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ productId: 'product-1', quantity: 2 }),
    }));
    expect(fetchMock.mock.calls[0][1].body).not.toContain('price');
  });

  it('normaliza los errores de validación del backend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: ['email inválido', 'contraseña requerida'] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })));

    await expect(api.auth.login({ email: 'bad', password: '12345678' })).rejects.toEqual(
      expect.objectContaining({ status: 400, message: 'email inválido. contraseña requerida' }),
    );
  });

  it('consulta el estado de la sesión de checkout concreta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          sessionId: 'cs_test_checkout123',
          status: 'PENDING',
          orderId: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.payments.checkoutStatus('cs_test_checkout123');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/payments/checkout/cs_test_checkout123/status',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('envía los límites de precio del catálogo como centavos enteros', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.products.list({
      search: 'mate',
      category: 'cocina',
      minPriceCents: 1_050,
      maxPriceCents: 9_999,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/products?search=mate&category=cocina&minPriceCents=1050&maxPriceCents=9999',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('envía únicamente el rating al ítem de la orden indicada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'order-1', items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await api.orders.rateItem('order-1', 'item-1', 5);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/orders/order-1/items/item-1/rating',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ rating: 5 }),
      }),
    );
  });
});
