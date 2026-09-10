import type { Product, ProductInput } from "../types";

interface AdminProductSaveApi {
  createProduct: (input: ProductInput) => Promise<Product>;
  updateProduct: (id: string, input: ProductInput) => Promise<Product>;
  uploadImage: (id: string, file: File) => Promise<Product>;
}

export interface ProductSaveSession {
  createdProductId: string | null;
  progress: "none" | "product" | "image";
}

interface SaveProductOptions {
  existingProductId: string | null;
  input: ProductInput;
  file: File | null;
}

/**
 * Keeps product persistence and object upload resumable. Once creation succeeds,
 * retries update that same product instead of issuing another create request.
 * New active products with an image stay inactive until the upload completes.
 */
export async function saveProductWithImage(
  adminApi: AdminProductSaveApi,
  session: ProductSaveSession,
  { existingProductId, input, file }: SaveProductOptions,
) {
  session.progress = "none";
  const persistedProductId = existingProductId ?? session.createdProductId;
  const delaysActivation =
    !existingProductId && Boolean(file) && input.isActive;
  const persistedInput = delaysActivation
    ? { ...input, isActive: false }
    : input;
  let saved: Product;

  if (persistedProductId) {
    saved = await adminApi.updateProduct(persistedProductId, persistedInput);
  } else {
    saved = await adminApi.createProduct(persistedInput);
    session.createdProductId = saved.id;
  }
  session.progress = "product";

  if (!file) return saved;

  saved = await adminApi.uploadImage(saved.id, file);
  session.progress = "image";

  // A new product requested as active stays hidden until its image is safely
  // stored. If either request fails, the same draft can be resumed on retry.
  return delaysActivation ? adminApi.updateProduct(saved.id, input) : saved;
}
