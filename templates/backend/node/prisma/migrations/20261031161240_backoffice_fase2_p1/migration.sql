-- Backoffice fase 2, fatia 1: funcionários da Farmarcas, Anjo do grupo e auditoria por registro
-- (specs/003-backoffice-fase-2/data-model.md). Escrito à mão: collation, índice parcial, CHECK e RLS.

-- CreateEnum
CREATE TYPE "employee_area" AS ENUM ('COMMERCIAL', 'MEMBER_FINANCE', 'TRADE', 'DIGITAL_PRODUCTS', 'MEMBER_SUCCESS', 'OPERATIONS');

-- CreateEnum
CREATE TYPE "employee_access_role" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_ANALYST', 'NONE');

-- CreateEnum
CREATE TYPE "employee_status" AS ENUM ('ACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "audit_entity" AS ENUM ('GROUP', 'EMPLOYEE', 'PARTNER');

-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "entity_id" UUID,
ADD COLUMN     "entity_type" "audit_entity";

-- AlterTable
ALTER TABLE "economic_groups" ADD COLUMN     "angel_employee_id" UUID;

-- CreateTable
CREATE TABLE "farmarcas_employees" (
    "id" UUID NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "area" "employee_area" NOT NULL,
    "job_title" TEXT COLLATE pt_br NOT NULL,
    "access_role" "employee_access_role" NOT NULL,
    "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
    "terminated_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "farmarcas_employees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_created_at_idx" ON "audit_events"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "economic_groups_angel_employee_id_idx" ON "economic_groups"("angel_employee_id");

-- AddForeignKey
ALTER TABLE "economic_groups" ADD CONSTRAINT "economic_groups_angel_employee_id_fkey" FOREIGN KEY ("angel_employee_id") REFERENCES "farmarcas_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- E-mail corporativo único (sem diferenciar maiúsculas) entre funcionários não excluídos.
CREATE UNIQUE INDEX "farmarcas_employees_email_active_uidx"
  ON "farmarcas_employees" (lower("email")) WHERE "deleted_at" IS NULL;

ALTER TABLE "farmarcas_employees" ADD CONSTRAINT "farmarcas_employees_phone_chk"
  CHECK ("phone" IS NULL OR "phone" ~ '^[0-9]{10,11}$');
-- Desligado sempre tem data; ativo nunca tem.
ALTER TABLE "farmarcas_employees" ADD CONSTRAINT "farmarcas_employees_terminated_chk"
  CHECK (("status" = 'TERMINATED') = ("terminated_at" IS NOT NULL));

-- Eventos antigos são todos de grupo (ou de marca, sem registro): o grupo vira o registro do evento.
UPDATE "audit_events" SET "entity_type" = 'GROUP', "entity_id" = "economic_group_id"
 WHERE "economic_group_id" IS NOT NULL;

-- Funcionário é dado da plataforma. O grupo só lê o próprio Anjo: a subconsulta em
-- economic_groups passa pelo RLS do tenant, então nunca alcança o Anjo de outro grupo.
ALTER TABLE "farmarcas_employees" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "farmarcas_employees"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_angel" ON "farmarcas_employees" FOR SELECT
  USING ("id" IN (SELECT g."angel_employee_id" FROM "economic_groups" g
                   WHERE g."id"::text = current_setting('app.tenant_id', true)));
