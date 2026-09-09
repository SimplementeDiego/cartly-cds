-- Products are soft-deleted so completed checkout snapshots, order history and
-- ratings keep their referential integrity. The row remains for audit purposes,
-- while every catalogue/admin query excludes it.
ALTER TABLE "products"
  ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE INDEX "products_deleted_at_is_active_idx"
  ON "products"("deleted_at", "is_active");
