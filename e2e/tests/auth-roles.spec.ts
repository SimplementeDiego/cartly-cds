import { expect, test, type Page } from '@playwright/test';

const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? 'customer@cartly.local';
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer123!';
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? 'admin@cartly.local';
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!';

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/correo|email/i).fill(email);
  await page.getByRole('textbox', { name: /contrase(?:ñ|n)a/i }).fill(password);
  await page.getByRole('button', { name: /iniciar sesi(?:ó|o)n|ingresar/i }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function expectHeaderPinned(page: Page) {
  const header = page.locator('header');
  await expect(header).toBeVisible();
  await expect
    .poll(() => header.evaluate((element) => Math.round(element.getBoundingClientRect().top)))
    .toBe(0);
}

async function verifyAdminOverlaysKeepHeaderPinned(page: Page) {
  await login(page, adminEmail, adminPassword);
  await page.goto('/admin/products');

  const deleteButton = page.locator('button[aria-label^="Eliminar "]').last();
  await expect(deleteButton).toBeVisible();
  await deleteButton.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expectHeaderPinned(page);

  await deleteButton.click();
  const deleteDialog = page.getByRole('dialog', { name: 'Eliminar producto' });
  await expect(deleteDialog).toBeVisible();
  await expectHeaderPinned(page);
  await deleteDialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(deleteDialog).toBeHidden();

  const editButton = page.locator('button[aria-label^="Editar "]').last();
  await editButton.scrollIntoViewIfNeeded();
  await editButton.click();
  const editDialog = page.getByRole('dialog', { name: 'Editar producto' });
  await expect(editDialog).toBeVisible();
  await expectHeaderPinned(page);
  await editDialog.getByRole('button', { name: 'Cancelar' }).click();
}

test('un CUSTOMER no obtiene acceso a la administración', async ({ page }) => {
  await login(page, customerEmail, customerPassword);
  await page.goto('/admin/products');

  await expect
    .poll(async () => {
      const isOutsideAdmin = !new URL(page.url()).pathname.startsWith('/admin');
      const body = await page.locator('body').innerText();
      const deniedMessage = /sin permisos|acceso denegado|no autorizado/i.test(body);
      return isOutsideAdmin || deniedMessage;
    })
    .toBe(true);
});

test('un ADMIN puede abrir la gestión de productos', async ({ page }) => {
  await login(page, adminEmail, adminPassword);
  await page.goto('/admin/products');

  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(
    page.getByRole('heading', { name: /administraci(?:ó|o)n|gesti(?:ó|o)n|productos/i }).first(),
  ).toBeVisible();
});

test('el header permanece visible al abrir overlays después de hacer scroll', async ({ page }) => {
  await verifyAdminOverlaysKeepHeaderPinned(page);
});

test('el header móvil permanece visible al abrir overlays después de hacer scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await verifyAdminOverlaysKeepHeaderPinned(page);
});
