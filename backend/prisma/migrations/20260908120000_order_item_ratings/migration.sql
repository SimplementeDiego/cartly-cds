ALTER TABLE "order_items"
  ADD COLUMN "rating" SMALLINT;

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_rating_check"
  CHECK ("rating" IS NULL OR "rating" BETWEEN 1 AND 5);

CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");
