-- Página da loja, fatia 1 (specs/002-pagina-da-loja/data-model.md).
-- A loja ganha as camadas Receita, contato, endereço popular e governança; nascem
-- solicitações com etapas, documentos (arquivo no banco) e histórico da loja.
-- Escrito à mão: renomear address → street (sem perda), collation, CHECKs, índice
-- parcial e RLS das tabelas novas.

-- O endereço de 001 vira o logradouro da Receita. Renomear preserva os dados.
ALTER TABLE "stores" RENAME COLUMN "address" TO "street";

-- CreateEnum
CREATE TYPE "tax_regime" AS ENUM ('SIMPLES', 'PRESUMIDO', 'REAL');

-- CreateEnum
CREATE TYPE "change_request_type" AS ENUM ('CNPJ', 'ADDRESS', 'BRAND', 'TAX_REGIME');

-- CreateEnum
CREATE TYPE "change_request_status" AS ENUM ('OPEN', 'EFFECTIVE', 'REJECTED', 'CONTESTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "actor_kind" AS ENUM ('PLATFORM', 'TENANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "store_document_type" AS ENUM ('CNPJ_CARD', 'OPERATING_PERMIT', 'SANITARY_LICENSE', 'AFE', 'CRF', 'ASSOCIATION_CONTRACT', 'ADDRESS_PROOF', 'ARTICLES', 'OPTION_TERM');

-- CreateEnum
CREATE TYPE "store_history_kind" AS ENUM ('EDIT', 'REQUEST', 'DOCUMENT', 'VALIDATION', 'REMINDER');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "affiliated_network" TEXT COLLATE pt_br,
ADD COLUMN     "completeness_filled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completeness_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_phone" TEXT,
ADD COLUMN     "district" TEXT COLLATE pt_br,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "legal_name" TEXT COLLATE pt_br,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "owner_mobile" TEXT,
ADD COLUMN     "owner_personal_email" TEXT,
ADD COLUMN     "phone1" TEXT,
ADD COLUMN     "phone2" TEXT,
ADD COLUMN     "pop_city" TEXT COLLATE pt_br,
ADD COLUMN     "pop_complement" TEXT COLLATE pt_br,
ADD COLUMN     "pop_district" TEXT COLLATE pt_br,
ADD COLUMN     "pop_number" TEXT,
ADD COLUMN     "pop_street" TEXT COLLATE pt_br,
ADD COLUMN     "pop_uf" CHAR(2),
ADD COLUMN     "pop_zip" CHAR(8),
ADD COLUMN     "state_registration" TEXT,
ADD COLUMN     "store_category" TEXT COLLATE pt_br,
ADD COLUMN     "tax_regime" "tax_regime",
ADD COLUMN     "trade_name" TEXT COLLATE pt_br,
ADD COLUMN     "validated_at" TIMESTAMPTZ(3),
ADD COLUMN     "validated_by" TEXT,
ADD COLUMN     "validation_reminded_at" TIMESTAMPTZ(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "zip" CHAR(8);

-- CreateTable
CREATE TABLE "store_change_requests" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "economic_group_id" UUID NOT NULL,
    "type" "change_request_type" NOT NULL,
    "origin" "actor_kind" NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_values" JSONB NOT NULL,
    "effective_date" DATE,
    "justification" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "status" "change_request_status" NOT NULL DEFAULT 'OPEN',
    "closed_note" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_change_request_events" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "step_index" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor_kind" "actor_kind" NOT NULL,
    "actor_subject" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_change_request_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_documents" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "economic_group_id" UUID NOT NULL,
    "doc_type" "store_document_type" NOT NULL,
    "request_id" UUID,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "valid_until" DATE,
    "uploaded_by_kind" "actor_kind" NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "superseded_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_document_files" (
    "document_id" UUID NOT NULL,
    "content" BYTEA NOT NULL,

    CONSTRAINT "store_document_files_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "store_history" (
    "id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "economic_group_id" UUID NOT NULL,
    "kind" "store_history_kind" NOT NULL,
    "field_key" TEXT,
    "field_label" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "justification" TEXT,
    "request_id" UUID,
    "actor_kind" "actor_kind" NOT NULL,
    "actor_subject" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_change_requests_store_id_status_idx" ON "store_change_requests"("store_id", "status");

-- CreateIndex
CREATE INDEX "store_change_request_events_request_id_idx" ON "store_change_request_events"("request_id");

-- CreateIndex
CREATE INDEX "store_documents_store_id_doc_type_idx" ON "store_documents"("store_id", "doc_type");

-- CreateIndex
CREATE INDEX "store_history_store_id_created_at_idx" ON "store_history"("store_id", "created_at");

-- AddForeignKey
ALTER TABLE "store_change_requests" ADD CONSTRAINT "store_change_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_change_request_events" ADD CONSTRAINT "store_change_request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "store_change_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_documents" ADD CONSTRAINT "store_documents_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_documents" ADD CONSTRAINT "store_documents_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "store_change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_document_files" ADD CONSTRAINT "store_document_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "store_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_history" ADD CONSTRAINT "store_history_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Formatos garantidos pelo banco.
ALTER TABLE "stores"
  ADD CONSTRAINT "stores_zip_chk" CHECK ("zip" IS NULL OR "zip" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "stores_pop_zip_chk" CHECK ("pop_zip" IS NULL OR "pop_zip" ~ '^[0-9]{8}$'),
  ADD CONSTRAINT "stores_pop_uf_chk" CHECK ("pop_uf" IS NULL OR "pop_uf" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "stores_phones_chk" CHECK (
    ("phone1" IS NULL OR "phone1" ~ '^[0-9]{10,11}$') AND
    ("phone2" IS NULL OR "phone2" ~ '^[0-9]{10,11}$') AND
    ("whatsapp" IS NULL OR "whatsapp" ~ '^[0-9]{10,11}$') AND
    ("delivery_phone" IS NULL OR "delivery_phone" ~ '^[0-9]{10,11}$') AND
    ("owner_mobile" IS NULL OR "owner_mobile" ~ '^[0-9]{10,11}$')),
  ADD CONSTRAINT "stores_completeness_chk" CHECK ("completeness_filled" BETWEEN 0 AND "completeness_total"),
  ADD CONSTRAINT "stores_version_chk" CHECK ("version" > 0);

ALTER TABLE "store_documents" ADD CONSTRAINT "store_documents_size_chk" CHECK ("size_bytes" BETWEEN 1 AND 10485760);
ALTER TABLE "store_change_requests" ADD CONSTRAINT "store_change_requests_step_chk" CHECK ("current_step" >= 1);

-- Uma solicitação aberta por tipo por loja (M1 RN-CV02).
CREATE UNIQUE INDEX "store_change_requests_open_uidx" ON "store_change_requests"("store_id", "type") WHERE "status" = 'OPEN';

-- Isolamento entre tenants nas tabelas novas (mesma regra de 001).
-- Tabelas com economic_group_id: políticas diretas. Filhas sem a chave: visíveis
-- quando a linha-mãe é visível (a subconsulta já passa pelo RLS da mãe).
ALTER TABLE "store_change_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "store_change_requests"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "store_change_requests"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));

ALTER TABLE "store_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "store_documents"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "store_documents"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));

ALTER TABLE "store_history" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "store_history"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "store_history"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));

ALTER TABLE "store_change_request_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "request_visible" ON "store_change_request_events"
  USING (EXISTS (SELECT 1 FROM "store_change_requests" r WHERE r."id" = "request_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "store_change_requests" r WHERE r."id" = "request_id"));

ALTER TABLE "store_document_files" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_visible" ON "store_document_files"
  USING (EXISTS (SELECT 1 FROM "store_documents" d WHERE d."id" = "document_id"))
  WITH CHECK (EXISTS (SELECT 1 FROM "store_documents" d WHERE d."id" = "document_id"));
