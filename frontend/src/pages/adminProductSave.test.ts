import { describe, expect, it, vi } from "vitest";
import type { Product, ProductInput } from "../types";
import {
  saveProductWithImage,
  type ProductSaveSession,
} from "./adminProductSave";

const input: ProductInput = {
  name: "Mate de prueba",
  description: "Producto para probar el flujo de guardado.",
  priceCents: 2_500,
  categoryId: "20000000-0000-4000-8000-000000000001",
  isActive: true,
};

const product: Product = {
  id: "product-1",
  ...input,
  categoryId: input.categoryId!,
  imageUrl: null,
  category: {
    id: input.categoryId!,
    name: "General",
    slug: "general",
  },
};

describe("saveProductWithImage", () => {
  it("reutiliza el producto creado cuando se reintenta una imagen fallida", async () => {
    const file = new File(["image"], "mate.webp", { type: "image/webp" });
    const session: ProductSaveSession = {
      createdProductId: null,
      progress: "none",
    };
    const adminApi = {
      createProduct: vi.fn().mockResolvedValue(product),
      updateProduct: vi
        .fn()
        .mockResolvedValueOnce(product)
        .mockResolvedValueOnce({ ...product, imageUrl: "/uploads/mate.webp" }),
      uploadImage: vi
        .fn()
        .mockRejectedValueOnce(new Error("Falló la subida"))
        .mockResolvedValueOnce({ ...product, imageUrl: "/uploads/mate.webp" }),
    };

    await expect(
      saveProductWithImage(adminApi, session, {
        existingProductId: null,
        input,
        file,
      }),
    ).rejects.toThrow("Falló la subida");

    expect(session.createdProductId).toBe(product.id);
    expect(session.progress).toBe("product");

    await expect(
      saveProductWithImage(adminApi, session, {
        existingProductId: null,
        input,
        file,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ imageUrl: "/uploads/mate.webp" }),
    );

    expect(adminApi.createProduct).toHaveBeenCalledTimes(1);
    expect(adminApi.createProduct).toHaveBeenCalledWith({
      ...input,
      isActive: false,
    });
    expect(adminApi.updateProduct).toHaveBeenCalledTimes(2);
    expect(adminApi.updateProduct).toHaveBeenNthCalledWith(1, product.id, {
      ...input,
      isActive: false,
    });
    expect(adminApi.updateProduct).toHaveBeenNthCalledWith(
      2,
      product.id,
      input,
    );
    expect(adminApi.uploadImage).toHaveBeenCalledTimes(2);
    expect(session.progress).toBe("image");
  });

  it("registra el guardado parcial al editar antes de que falle la imagen", async () => {
    const file = new File(["image"], "mate.webp", { type: "image/webp" });
    const session: ProductSaveSession = {
      createdProductId: null,
      progress: "none",
    };
    const adminApi = {
      createProduct: vi.fn(),
      updateProduct: vi.fn().mockResolvedValue(product),
      uploadImage: vi.fn().mockRejectedValue(new Error("Falló la subida")),
    };

    await expect(
      saveProductWithImage(adminApi, session, {
        existingProductId: product.id,
        input,
        file,
      }),
    ).rejects.toThrow("Falló la subida");

    expect(adminApi.createProduct).not.toHaveBeenCalled();
    expect(adminApi.updateProduct).toHaveBeenCalledWith(product.id, input);
    expect(session.progress).toBe("product");
  });

  it("crea directamente con el estado solicitado cuando no hay imagen", async () => {
    const session: ProductSaveSession = {
      createdProductId: null,
      progress: "none",
    };
    const adminApi = {
      createProduct: vi.fn().mockResolvedValue(product),
      updateProduct: vi.fn(),
      uploadImage: vi.fn(),
    };

    await expect(
      saveProductWithImage(adminApi, session, {
        existingProductId: null,
        input,
        file: null,
      }),
    ).resolves.toBe(product);

    expect(adminApi.createProduct).toHaveBeenCalledWith(input);
    expect(adminApi.updateProduct).not.toHaveBeenCalled();
    expect(adminApi.uploadImage).not.toHaveBeenCalled();
  });
});
