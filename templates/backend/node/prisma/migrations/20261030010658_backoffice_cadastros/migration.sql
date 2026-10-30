-- Backoffice Farmarcas: marcas, grupos econômicos (tenant), proprietário, lojas e auditoria.
-- PK: UUIDv7 gerado pela aplicação (mesmo padrão de users).
-- Multi-tenant: GE = tenant. Tabelas do tenant têm economic_group_id e RLS (fim do arquivo).
-- Escrito à mão (o Prisma não declara): collation pt_br, índices únicos parciais, CHECKs e RLS.

-- Ordenação em português nas colunas exibidas a pessoas (database/DATABASE.md).
CREATE COLLATION IF NOT EXISTS pt_br (provider = icu, locale = 'pt-BR', deterministic = true);

-- CreateEnum
CREATE TYPE "brand_status" AS ENUM ('ACTIVE', 'HISTORICAL');

-- CreateEnum
CREATE TYPE "group_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "store_type" AS ENUM ('PDV', 'CD');

-- CreateEnum
CREATE TYPE "store_status" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "status" "brand_status" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economic_groups" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "legal_name" TEXT COLLATE pt_br NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "status" "group_status" NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "economic_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_owners" (
    "id" UUID NOT NULL,
    "economic_group_id" UUID NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pseudonym" TEXT NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "group_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "code" SERIAL NOT NULL,
    "economic_group_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" TEXT COLLATE pt_br NOT NULL,
    "type" "store_type" NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "address" TEXT COLLATE pt_br NOT NULL,
    "city" TEXT COLLATE pt_br NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "opened_at" DATE,
    "status" "store_status" NOT NULL DEFAULT 'PENDING',
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "economic_group_id" UUID,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actor_subject" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "justification" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "economic_groups_number_key" ON "economic_groups"("number");

-- CreateIndex
CREATE UNIQUE INDEX "group_owners_pseudonym_key" ON "group_owners"("pseudonym");

-- CreateIndex
CREATE UNIQUE INDEX "stores_code_key" ON "stores"("code");

-- CreateIndex
CREATE INDEX "stores_economic_group_id_idx" ON "stores"("economic_group_id");

-- CreateIndex
CREATE INDEX "stores_brand_id_idx" ON "stores"("brand_id");

-- CreateIndex
CREATE INDEX "audit_events_economic_group_id_created_at_idx" ON "audit_events"("economic_group_id", "created_at");

-- AddForeignKey
ALTER TABLE "group_owners" ADD CONSTRAINT "group_owners_economic_group_id_fkey" FOREIGN KEY ("economic_group_id") REFERENCES "economic_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_economic_group_id_fkey" FOREIGN KEY ("economic_group_id") REFERENCES "economic_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_economic_group_id_fkey" FOREIGN KEY ("economic_group_id") REFERENCES "economic_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Regras de formato que o banco garante sozinho.
ALTER TABLE "economic_groups" ADD CONSTRAINT "economic_groups_cnpj_digits_chk" CHECK ("cnpj" ~ '^[0-9]{14}$');
ALTER TABLE "economic_groups" ADD CONSTRAINT "economic_groups_number_positive_chk" CHECK ("number" > 0);
ALTER TABLE "stores" ADD CONSTRAINT "stores_cnpj_digits_chk" CHECK ("cnpj" ~ '^[0-9]{14}$');
ALTER TABLE "stores" ADD CONSTRAINT "stores_uf_chk" CHECK ("uf" ~ '^[A-Z]{2}$');
ALTER TABLE "group_owners" ADD CONSTRAINT "group_owners_phone_digits_chk" CHECK ("phone" ~ '^[0-9]{10,11}$');
ALTER TABLE "group_owners" ADD CONSTRAINT "group_owners_pseudonym_chk" CHECK ("pseudonym" ~ '^F-[0-9A-Z]{5}$');

-- Únicos de negócio só entre registros ativos (exclusão lógica).
CREATE UNIQUE INDEX "brands_normalized_name_active_uidx" ON "brands"("normalized_name") WHERE "deleted_at" IS NULL;
CREATE UNIQUE INDEX "stores_cnpj_active_uidx" ON "stores"("cnpj") WHERE "deleted_at" IS NULL;
-- Um proprietário ativo por grupo.
CREATE UNIQUE INDEX "group_owners_economic_group_active_uidx" ON "group_owners"("economic_group_id") WHERE "deleted_at" IS NULL;

-- Isolamento entre tenants (Product Vision §9, invariante 1), imposto pelo banco.
-- A API define, em cada transação, app.actor_kind ('platform' | 'tenant') e app.tenant_id.
-- Sem essas variáveis nenhuma linha aparece (falha fechada). A aplicação conecta com um
-- usuário que não é dono das tabelas (APP_DB_USER), então as políticas valem para ela.
-- O operador (platform) tem caminho dedicado; o tenant só alcança as próprias linhas.
ALTER TABLE "economic_groups" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "economic_groups"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "economic_groups"
  USING ("id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("id"::text = current_setting('app.tenant_id', true));

ALTER TABLE "group_owners" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "group_owners"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "group_owners"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));

ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "stores"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "stores"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));

ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "audit_events"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "audit_events"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));
