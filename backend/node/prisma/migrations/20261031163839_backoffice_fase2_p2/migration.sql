-- Backoffice fase 2, fatia 2: parceiros (indústrias e distribuidores) e seus contatos; etapa e
-- bloqueio da loja (specs/003-backoffice-fase-2/data-model.md). Escrito à mão: collation,
-- backfill, índices parciais, CHECKs e RLS.

-- CreateEnum
CREATE TYPE "partner_type" AS ENUM ('INDUSTRY', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "partner_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "store_stage" AS ENUM ('PROSPECTING', 'SETUP', 'OPENED');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "blocked_at" TIMESTAMPTZ(3),
ADD COLUMN     "blocked_by" TEXT,
ADD COLUMN     "blocked_reason" TEXT,
ADD COLUMN     "stage" "store_stage" NOT NULL DEFAULT 'PROSPECTING';

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "type" "partner_type" NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "legal_name" TEXT COLLATE pt_br NOT NULL,
    "trade_name" TEXT COLLATE pt_br NOT NULL,
    "status" "partner_status" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_contacts" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "job_title" TEXT COLLATE pt_br,
    "email" TEXT,
    "phone" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "partner_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_contacts_partner_id_idx" ON "partner_contacts"("partner_id");

-- AddForeignKey
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Lojas que já existem: inaugurada se tem data de abertura; senão, em prospecção.
UPDATE "stores" SET "stage" = 'OPENED' WHERE "opened_at" IS NOT NULL;

-- Loja bloqueada sempre tem motivo e quem bloqueou.
ALTER TABLE "stores" ADD CONSTRAINT "stores_blocked_chk"
  CHECK ("blocked_at" IS NULL OR ("blocked_reason" IS NOT NULL AND "blocked_by" IS NOT NULL));

-- CNPJ único entre parceiros não excluídos (pode coincidir com o de uma loja: são cadastros diferentes).
CREATE UNIQUE INDEX "partners_cnpj_active_uidx" ON "partners" ("cnpj") WHERE "deleted_at" IS NULL;
ALTER TABLE "partners" ADD CONSTRAINT "partners_cnpj_chk" CHECK ("cnpj" ~ '^[0-9]{14}$');

-- No máximo um contato principal por parceiro; contato tem e-mail ou telefone.
CREATE UNIQUE INDEX "partner_contacts_primary_uidx"
  ON "partner_contacts" ("partner_id") WHERE "is_primary" AND "deleted_at" IS NULL;
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_reach_chk"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
ALTER TABLE "partner_contacts" ADD CONSTRAINT "partner_contacts_phone_chk"
  CHECK ("phone" IS NULL OR "phone" ~ '^[0-9]{10,11}$');

-- Parceiro é dado da plataforma: o grupo nunca vê.
ALTER TABLE "partners" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "partners"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
ALTER TABLE "partner_contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "partner_contacts"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
