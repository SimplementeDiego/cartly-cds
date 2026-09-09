ALTER TABLE "users"
  ADD COLUMN "display_name" VARCHAR(100),
  ADD COLUMN "phone" VARCHAR(30),
  ADD COLUMN "address" VARCHAR(250),
  ADD COLUMN "city" VARCHAR(100),
  ADD COLUMN "country" VARCHAR(100);

CREATE TABLE "categories" (
  "id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

INSERT INTO "categories" ("id", "name", "slug") VALUES
  ('20000000-0000-4000-8000-000000000001', 'General', 'general'),
  ('20000000-0000-4000-8000-000000000002', 'Tecnología', 'tecnologia'),
  ('20000000-0000-4000-8000-000000000003', 'Hogar', 'hogar'),
  ('20000000-0000-4000-8000-000000000004', 'Moda y accesorios', 'moda'),
  ('20000000-0000-4000-8000-000000000005', 'Deporte y aire libre', 'deporte'),
  ('20000000-0000-4000-8000-000000000006', 'Oficina', 'oficina'),
  ('20000000-0000-4000-8000-000000000007', 'Cocina', 'cocina');

ALTER TABLE "products"
  ADD COLUMN "category_id" UUID NOT NULL DEFAULT '20000000-0000-4000-8000-000000000001';
CREATE INDEX "products_category_id_is_active_idx" ON "products"("category_id", "is_active");
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Classify the original demo products once, not on every seed run. Later
-- changes made in Administration (including a move to General) are preserved.
UPDATE "products" SET "category_id" = '20000000-0000-4000-8000-000000000002'
  WHERE "id" IN ('10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002');
UPDATE "products" SET "category_id" = '20000000-0000-4000-8000-000000000006'
  WHERE "id" = '10000000-0000-4000-8000-000000000003';
