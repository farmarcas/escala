-- Backoffice fase 2, fatia 3: Cartão Alelo do grupo (specs/003-backoffice-fase-2/data-model.md).
-- Escrito à mão: collation, CHECKs, RLS do tenant e loja do mesmo grupo.

-- CreateTable
CREATE TABLE "group_benefit_cards" (
    "id" UUID NOT NULL,
    "economic_group_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "holder_name" TEXT COLLATE pt_br NOT NULL,
    "holder_cpf" CHAR(11) NOT NULL,
    "holder_birth_date" DATE NOT NULL,
    "holder_pseudonym" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "group_benefit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_benefit_cards_economic_group_id_key" ON "group_benefit_cards"("economic_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_benefit_cards_holder_pseudonym_key" ON "group_benefit_cards"("holder_pseudonym");

-- AddForeignKey
ALTER TABLE "group_benefit_cards" ADD CONSTRAINT "group_benefit_cards_economic_group_id_fkey" FOREIGN KEY ("economic_group_id") REFERENCES "economic_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_benefit_cards" ADD CONSTRAINT "group_benefit_cards_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "group_benefit_cards" ADD CONSTRAINT "group_benefit_cards_cpf_chk"
  CHECK ("holder_cpf" ~ '^[0-9]{11}$');
ALTER TABLE "group_benefit_cards" ADD CONSTRAINT "group_benefit_cards_number_chk"
  CHECK ("card_number" ~ '^[0-9]{13,19}$');
ALTER TABLE "group_benefit_cards" ADD CONSTRAINT "group_benefit_cards_birth_chk"
  CHECK ("holder_birth_date" < CURRENT_DATE);

-- Dado do tenant: mesmo isolamento das demais tabelas do grupo.
ALTER TABLE "group_benefit_cards" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "group_benefit_cards"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');
CREATE POLICY "tenant_isolation" ON "group_benefit_cards"
  USING ("economic_group_id"::text = current_setting('app.tenant_id', true))
  WITH CHECK ("economic_group_id"::text = current_setting('app.tenant_id', true));
