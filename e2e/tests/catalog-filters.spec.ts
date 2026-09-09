import { expect, test } from '@playwright/test';

test('conserva el máximo escrito en UYU después de aplicar el filtro', async ({ page }) => {
  await page.goto('/products');

  await page.getByLabel('Moneda').click();
  await page.getByRole('option', { name: /UYU/ }).click();

  const maximumPrice = page.getByLabel('Precio máximo en UYU');
  await maximumPrice.fill('1000');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(maximumPrice).toHaveValue('1000');
  await expect(page).toHaveURL(/maxPriceCents=2380/);
  await expect(page).toHaveURL(/maxPriceDisplay=1000/);
  await expect(page).toHaveURL(/priceCurrency=UYU/);
});
