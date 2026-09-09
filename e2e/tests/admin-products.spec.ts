import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  disconnectE2EDatabase,
  purgeStaleAdminProductFixtures,
  removeAdminProductFixture,
} from "../support/database";

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? "admin@cartly.local";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "Admin123!";

test.beforeAll(async () => purgeStaleAdminProductFixtures());
test.afterAll(async () => disconnectE2EDatabase());

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(adminEmail);
  await page
    .getByRole("textbox", { name: "Contraseña", exact: true })
    .fill(adminPassword);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page.getByTestId("user-menu")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Administración", exact: true }),
  ).toBeVisible();
}

async function searchPublicCatalog(page: Page, productName: string) {
  await page.goto("/products");
  await page.getByLabel("Buscar productos por nombre").fill(productName);
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/\?search=/);
}

test("un ADMIN crea, edita y desactiva un producto que desaparece del catálogo público", async ({
  page,
}) => {
  const uniqueSuffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const createdName = `Producto E2E ${uniqueSuffix}`;
  const editedName = `${createdName} editado`;
  let createdProductId: string | undefined;

  try {
    await test.step("iniciar sesión con el ADMIN del seed", async () => {
      await loginAsAdmin(page);
      await page
        .getByRole("link", { name: "Administración", exact: true })
        .click();

      await expect(page).toHaveURL(/\/admin\/products$/);
      await expect(
        page.getByRole("heading", { name: "Productos", exact: true }),
      ).toBeVisible();
    });

    await test.step("crear un producto activo desde la interfaz", async () => {
      await page
        .getByRole("button", { name: "Nuevo producto", exact: true })
        .click();

      const dialog = page.getByRole("dialog", { name: "Nuevo producto" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Nombre", { exact: true }).fill(createdName);
      await dialog
        .getByLabel("Descripción", { exact: true })
        .fill("Producto creado por el flujo administrativo de Playwright.");
      await dialog.getByLabel("Precio (USD)", { exact: true }).fill("149.90");
      const creationResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname.endsWith("/api/admin/products"),
      );
      await dialog
        .getByRole("button", { name: "Crear producto", exact: true })
        .click();
      const creationResponse = await creationResponsePromise;
      expect(creationResponse.ok()).toBe(true);
      const createdProduct = (await creationResponse.json()) as { id: string };
      createdProductId = createdProduct.id;

      await expect(dialog).toBeHidden();
      await expect(
        page.getByRole("button", {
          name: `Editar ${createdName}`,
          exact: true,
        }),
      ).toBeVisible();
    });

    await test.step("editar el producto y comprobar el cambio", async () => {
      await page
        .getByRole("button", { name: `Editar ${createdName}`, exact: true })
        .click();

      const dialog = page.getByRole("dialog", { name: "Editar producto" });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Nombre", { exact: true }).fill(editedName);
      await dialog
        .getByLabel("Descripción", { exact: true })
        .fill("Producto actualizado desde la interfaz administrativa.");
      await dialog.getByLabel("Precio (USD)", { exact: true }).fill("175.25");
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();

      await expect(dialog).toBeHidden();
      await expect(
        page.getByRole("button", { name: `Editar ${editedName}`, exact: true }),
      ).toBeVisible();
      await expect(page.getByText(createdName, { exact: true })).toHaveCount(0);
    });

    await test.step("confirmar que el producto activo aparece en el catálogo público", async () => {
      await searchPublicCatalog(page, editedName);

      const productCard = page
        .getByTestId("product-card")
        .filter({ hasText: editedName });
      await expect(productCard).toHaveCount(1);
      await expect(productCard).toBeVisible();
    });

    await test.step("desactivar el producto desde administración", async () => {
      await page
        .getByRole("link", { name: "Administración", exact: true })
        .click();
      await expect(page).toHaveURL(/\/admin\/products$/);

      const deactivateSwitch = page.getByLabel(`Desactivar ${editedName}`, {
        exact: true,
      });
      await expect(deactivateSwitch).toBeChecked();
      await deactivateSwitch.click();

      const activateSwitch = page.getByLabel(`Activar ${editedName}`, {
        exact: true,
      });
      await expect(activateSwitch).toBeVisible();
      await expect(activateSwitch).not.toBeChecked();
      await expect(
        page.getByText("Producto desactivado.", { exact: true }),
      ).toBeVisible();
    });

    await test.step("verificar que ya no aparece en el catálogo público", async () => {
      await searchPublicCatalog(page, editedName);

      await expect(
        page.getByTestId("product-card").filter({ hasText: editedName }),
      ).toHaveCount(0);
      await expect(
        page.getByText("No encontramos productos", { exact: true }),
      ).toBeVisible();
    });
  } finally {
    await removeAdminProductFixture(createdProductId, uniqueSuffix);
  }
});
