-- Store the same accent-free, lower-case representation used by the API.
-- pg_trgm keeps substring searches indexable (a regular B-tree cannot help
-- with a leading wildcard such as "%lampara%").
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER TABLE "products" ADD COLUMN "search_name" VARCHAR(320);

UPDATE "products"
SET "search_name" = lower(unaccent("name"));

ALTER TABLE "products" ALTER COLUMN "search_name" SET NOT NULL;

CREATE INDEX "products_search_name_trgm_idx"
ON "products" USING GIN ("search_name" gin_trgm_ops);
