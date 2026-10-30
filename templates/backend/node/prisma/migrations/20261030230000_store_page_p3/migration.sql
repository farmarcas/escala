-- Página da loja, fatia 3: ferramentas e canais incluídos pelo grupo e a declaração
-- "a loja não usa ferramentas externas" (specs/002-pagina-da-loja/data-model.md).
-- Escrito à mão: collation, CHECKs e RLS.

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "no_external_tools" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "store_custom_entries" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "kind" "catalog_kind" NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "category" TEXT COLLATE pt_br,
    "identifier" TEXT,
    "monthly_cost_cents" INTEGER,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_custom_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_custom_entries_store_id_idx" ON "store_custom_entries"("store_id");

-- AddForeignKey
ALTER TABLE "store_custom_entries" ADD CONSTRAINT "store_custom_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Só ferramentas externas e canais são incluídos pelo grupo; custo nunca negativo.
ALTER TABLE "store_custom_entries" ADD CONSTRAINT "store_custom_entries_kind_chk"
  CHECK ("kind" IN ('EXTERNAL_TOOL', 'CHANNEL'));
ALTER TABLE "store_custom_entries" ADD CONSTRAINT "store_custom_entries_cost_chk"
  CHECK ("monthly_cost_cents" IS NULL OR "monthly_cost_cents" >= 0);

-- Isolamento: visível quando a loja é visível (a subconsulta passa pelo RLS de stores).
ALTER TABLE "store_custom_entries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_visible" ON "store_custom_entries"
  USING (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "stores" s WHERE s."id" = "store_id"));
