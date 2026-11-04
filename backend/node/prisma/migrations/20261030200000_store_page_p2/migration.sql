-- Página da loja, fatia 2: estrutura, horário de funcionamento, catálogos da Farmarcas,
-- respostas da loja aos catálogos e seções livres (specs/002-pagina-da-loja/data-model.md).
-- Escrito à mão: collation, CHECKs e RLS das tabelas filhas da loja.

-- CreateEnum
CREATE TYPE "catalog_kind" AS ENUM ('SERVICE', 'DEMAND_SYSTEM', 'PRACTICE_TOOL', 'PBM', 'STRATEGY', 'FURNITURE', 'EXTERNAL_TOOL', 'CHANNEL');

-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'HOLIDAY');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "area_m2" INTEGER,
ADD COLUMN     "demand_system_id" UUID,
ADD COLUMN     "own_building" BOOLEAN,
ADD COLUMN     "sales_area_m2" INTEGER,
ADD COLUMN     "staff_count" INTEGER;

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" UUID NOT NULL,
    "kind" "catalog_kind" NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "group_label" TEXT,
    "description" TEXT,
    "negotiated_monthly_cents" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_opening_hours" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "day" "weekday" NOT NULL,
    "is_open" BOOLEAN NOT NULL,
    "opens_at" TEXT,
    "closes_at" TEXT,
    "is_24h" BOOLEAN NOT NULL DEFAULT false,
    "is_on_call" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "store_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_catalog_entries" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "catalog_item_id" UUID NOT NULL,
    "uses" BOOLEAN,
    "identifier" TEXT,
    "monthly_cost_cents" INTEGER,
    "quantity" INTEGER,
    "trade_quantity" INTEGER,
    "since" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_catalog_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_free_sections" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "title" TEXT COLLATE pt_br NOT NULL,
    "created_by" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_free_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_free_fields" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "label" TEXT COLLATE pt_br NOT NULL,
    "value" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "store_free_fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_kind_name_key" ON "catalog_items"("kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "store_opening_hours_store_id_day_key" ON "store_opening_hours"("store_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "store_catalog_entries_store_id_catalog_item_id_key" ON "store_catalog_entries"("store_id", "catalog_item_id");

-- CreateIndex
CREATE INDEX "store_free_sections_store_id_idx" ON "store_free_sections"("store_id");

-- CreateIndex
CREATE INDEX "store_free_fields_section_id_idx" ON "store_free_fields"("section_id");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_demand_system_id_fkey" FOREIGN KEY ("demand_system_id") REFERENCES "catalog_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_opening_hours" ADD CONSTRAINT "store_opening_hours_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_catalog_entries" ADD CONSTRAINT "store_catalog_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_catalog_entries" ADD CONSTRAINT "store_catalog_entries_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_free_sections" ADD CONSTRAINT "store_free_sections_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_free_fields" ADD CONSTRAINT "store_free_fields_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "store_free_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Formatos garantidos pelo banco.
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_structure_chk" CHECK (
    ("area_m2" IS NULL OR "area_m2" > 0) AND
    ("sales_area_m2" IS NULL OR "sales_area_m2" > 0) AND
    ("staff_count" IS NULL OR "staff_count" >= 0));
ALTER TABLE "store_opening_hours" ADD CONSTRAINT "store_opening_hours_time_chk" CHECK (
  ("opens_at" IS NULL OR "opens_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') AND
  ("closes_at" IS NULL OR "closes_at" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') AND
  (NOT "is_open" OR "is_24h" OR ("opens_at" IS NOT NULL AND "closes_at" IS NOT NULL AND "closes_at" > "opens_at")));
-- Trade nunca passa do total na loja.
ALTER TABLE "store_catalog_entries" ADD CONSTRAINT "store_catalog_entries_qty_chk" CHECK (
  ("quantity" IS NULL OR "quantity" >= 0) AND
  ("trade_quantity" IS NULL OR ("trade_quantity" >= 0 AND "trade_quantity" <= coalesce("quantity", 0))) AND
  ("monthly_cost_cents" IS NULL OR "monthly_cost_cents" >= 0));
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_negotiated_chk" CHECK ("negotiated_monthly_cents" IS NULL OR "negotiated_monthly_cents" >= 0);

-- Isolamento: filhas da loja só aparecem quando a loja aparece (a subconsulta passa pelo RLS de stores).
ALTER TABLE "store_opening_hours" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_visible" ON "store_opening_hours"
  USING (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"));

ALTER TABLE "store_catalog_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_visible" ON "store_catalog_entries"
  USING (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"));

ALTER TABLE "store_free_sections" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_visible" ON "store_free_sections"
  USING (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"));

ALTER TABLE "store_free_fields" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "section_visible" ON "store_free_fields"
  USING (EXISTS (SELECT 1 FROM "store_free_sections" f WHERE f."id" = "section_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "store_free_sections" f WHERE f."id" = "section_id"));
