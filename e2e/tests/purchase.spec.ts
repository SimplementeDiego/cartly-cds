import { expect, test, type Page } from '@playwright/test';
import { createHmac } from 'node:crypto';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const stripeEnabled = process.env.E2E_STRIPE_ENABLED === 'true';

async function createCustomer(page: Page) {
  const uniquePart = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `playwright-${uniquePart}@cartly.local`;
  const password = 'Playwright123!';

  const response = await page.request.post('/api/auth/register', {
    data: { email, password },
  });

  expect(response.ok(), await response.text()).toBe(true);
  return { email, password };
}

async function addFirstProduct(page: Page) {
  await page.goto('/products');
  const firstProduct = page.getByTestId('product-card').first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.getByTestId('add-to-cart').click();
}

test('un cliente recorre el catálogo, agrega un producto y comienza el checkout', async ({
  page,
}) => {
  await createCustomer(page);
  await addFirstProduct(page);

  await page.goto('/cart');
  await expect(page.getByTestId('cart-item').first()).toBeVisible();
  const checkoutButton = page.getByTestId('checkout-button');
  await expect(checkoutButton).toBeEnabled();

  if (!stripeEnabled) {
    const fakeSessionId = 'cs_test_playwright';
    let statusRequests = 0;
    await page.route('**/api/payments/checkout', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: fakeSessionId,
          url: `${baseURL}/checkout/success?session_id=${fakeSessionId}`,
        }),
      });
    });
    await page.route('**/api/payments/checkout/cs_test_playwright/status', async (route) => {
      statusRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: fakeSessionId,
          status: statusRequests === 1 ? 'PENDING' : 'PAID',
          orderId: statusRequests === 1 ? null : '11111111-1111-4111-8111-111111111111',
        }),
      });
    });
  }

  await checkoutButton.click();

  if (stripeEnabled) {
    await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//, {
      timeout: 20_000,
    });
  } else {
    await expect(page).toHaveURL(/\/checkout\/success\?session_id=cs_test_playwright/);
    await expect(page.getByRole('heading', { name: 'Estamos confirmando tu pago' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pago confirmado' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver orden' })).toBeVisible();
  }
});

test('crea exactamente una orden al recibir dos veces el mismo webhook de pago', async ({
  page,
}) => {
  test.skip(!stripeEnabled, 'Requiere Stripe Test Mode y E2E_STRIPE_ENABLED=true');

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  test.skip(
    !stripeSecretKey ||
      stripeSecretKey === 'sk_test_replace_me' ||
      !stripeSecretKey.startsWith('sk_test_') ||
      !webhookSecret ||
      webhookSecret === 'whsec_replace_me',
    'Faltan STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET de prueba',
  );

  await createCustomer(page);
  await addFirstProduct(page);

  const checkoutResponse = await page.request.post('/api/payments/checkout', { data: {} });
  expect(checkoutResponse.ok(), await checkoutResponse.text()).toBe(true);
  const checkout = (await checkoutResponse.json()) as { sessionId: string };
  expect(checkout.sessionId).toMatch(/^cs_test_/);

  const stripeResponse = await page.request.get(
    `https://api.stripe.com/v1/checkout/sessions/${checkout.sessionId}`,
    { headers: { Authorization: `Bearer ${stripeSecretKey}` } },
  );
  expect(stripeResponse.ok(), await stripeResponse.text()).toBe(true);
  const stripeSession = (await stripeResponse.json()) as Record<string, unknown>;

  const eventId = `evt_playwright_${Date.now()}`;
  const payload = JSON.stringify({
    id: eventId,
    object: 'event',
    created: Math.floor(Date.now() / 1_000),
    livemode: false,
    type: 'checkout.session.completed',
    data: {
      object: {
        ...stripeSession,
        payment_status: 'paid',
        status: 'complete',
      },
    },
  });
  const timestamp = Math.floor(Date.now() / 1_000);
  const signature = createHmac('sha256', webhookSecret!)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex');
  const headers = {
    'content-type': 'application/json',
    'stripe-signature': `t=${timestamp},v1=${signature}`,
  };

  const firstWebhook = await page.request.post('/api/payments/webhook', {
    data: payload,
    headers,
  });
  expect(firstWebhook.ok(), await firstWebhook.text()).toBe(true);

  const repeatedWebhook = await page.request.post('/api/payments/webhook', {
    data: payload,
    headers,
  });
  expect(repeatedWebhook.ok(), await repeatedWebhook.text()).toBe(true);

  const ordersResponse = await page.request.get('/api/orders');
  expect(ordersResponse.ok(), await ordersResponse.text()).toBe(true);
  const ordersPayload = (await ordersResponse.json()) as
    | unknown[]
    | { items?: unknown[]; orders?: unknown[] };
  const orders = Array.isArray(ordersPayload)
    ? ordersPayload
    : (ordersPayload.items ?? ordersPayload.orders ?? []);
  expect(orders).toHaveLength(1);

  const cartResponse = await page.request.get('/api/cart');
  expect(cartResponse.ok(), await cartResponse.text()).toBe(true);
  const cart = (await cartResponse.json()) as { items?: unknown[] };
  expect(cart.items ?? []).toHaveLength(0);
});
