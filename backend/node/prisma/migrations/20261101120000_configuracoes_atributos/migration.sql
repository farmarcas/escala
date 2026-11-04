-- Configurações, etapa 1 (specs/004-configuracoes-atributos/data-model.md): as listas da
-- Farmarcas ganham ícone, autosserviço, "usada no Escala", versão e exclusão lógica.

-- AlterEnum
ALTER TYPE "audit_entity" ADD VALUE 'CATALOG_ITEM';

-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "self_service" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "used_by_scale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "catalog_items_kind_sort_idx" ON "catalog_items"("kind", "sort");

-- Nome único por lista, sem diferença de maiúscula, só entre os não excluídos (o nome de um
-- item excluído pode ser reusado). Índice parcial por expressão: escrito à mão.
DROP INDEX "catalog_items_kind_name_key";
CREATE UNIQUE INDEX "catalog_items_kind_name_active_uidx" ON "catalog_items"("kind", lower("name")) WHERE "deleted_at" IS NULL;

-- Leitura para todos (a página da loja do grupo lê as listas); gravação só da plataforma.
-- A aplicação não recebe DELETE: excluir é preencher deleted_at.
ALTER TABLE "catalog_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_read" ON "catalog_items" FOR SELECT USING (true);
CREATE POLICY "platform_insert" ON "catalog_items" FOR INSERT
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "platform_update" ON "catalog_items" FOR UPDATE
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');

-- Dados existentes: autosserviço e ícone inicial do mobiliário pelo tipo.
UPDATE "catalog_items" SET "self_service" = true
WHERE "kind" = 'FURNITURE' AND "group_label" IN ('gondola', 'expositor');

UPDATE "catalog_items" SET "icon" = CASE "group_label"
    WHEN 'gondola' THEN 'shelving'
    WHEN 'checkout' THEN 'scan-barcode'
    WHEN 'balcao' THEN 'counter'
    WHEN 'frio' THEN 'refrigerator'
    WHEN 'expositor' THEN 'display-stand'
    WHEN 'sala' THEN 'door-open'
    ELSE 'package'
  END
WHERE "kind" = 'FURNITURE' AND "icon" IS NULL;

-- Estratégias: o uso no Escala vinha escrito no fim da descrição; vira campo.
UPDATE "catalog_items"
SET "used_by_scale" = true,
    "description" = NULLIF(regexp_replace("description", '\s*·\s*usada no módulo escala\s*$', '', 'i'), '')
WHERE "kind" = 'STRATEGY' AND "description" ~* '·\s*usada no módulo escala\s*$';
