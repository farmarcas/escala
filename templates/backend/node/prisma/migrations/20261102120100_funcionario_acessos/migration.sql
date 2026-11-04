-- Spec 005 (parte 2): perfil do funcionário e acesso por sistema da Suite
-- (specs/005-funcionario-acessos/data-model.md). Copia área, cargo, telefone e papel de acesso
-- para os campos novos antes de retirar as colunas antigas: ninguém perde dado nem acesso.
-- Os ids criados aqui usam gen_random_uuid() (o Postgres 16 não gera UUIDv7); continuam únicos.

-- Colunas novas (nulas até a cópia).
ALTER TABLE "farmarcas_employees"
ADD COLUMN     "department_id" UUID,
ADD COLUMN     "gender" "employee_gender",
ADD COLUMN     "landline" CHAR(10),
ADD COLUMN     "mobile" CHAR(11),
ADD COLUMN     "occupation_id" UUID,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "farmarcas_employees"
  ADD CONSTRAINT "farmarcas_employees_mobile_chk" CHECK ("mobile" IS NULL OR "mobile" ~ '^[0-9]{11}$'),
  ADD CONSTRAINT "farmarcas_employees_landline_chk" CHECK ("landline" IS NULL OR "landline" ~ '^[0-9]{10}$');

-- Departamentos: as 6 áreas de hoje, com os rótulos e a ordem da tela.
INSERT INTO "catalog_items" ("id", "kind", "name", "sort")
SELECT gen_random_uuid(), 'DEPARTMENT', d.name, d.sort
  FROM (VALUES
    ('Comercial', 0),
    ('Financeiro do associado', 1),
    ('Trade', 2),
    ('Produtos digitais', 3),
    ('Sucesso do associado', 4),
    ('Operações', 5)
  ) AS d(name, sort)
 WHERE NOT EXISTS (
   SELECT 1 FROM "catalog_items" c
    WHERE c."kind" = 'DEPARTMENT' AND lower(c."name") = lower(d.name) AND c."deleted_at" IS NULL
 );

-- Ocupações: um item por cargo diferente, em ordem alfabética.
INSERT INTO "catalog_items" ("id", "kind", "name", "sort")
SELECT gen_random_uuid(), 'OCCUPATION', t.job_title, (row_number() OVER (ORDER BY t.job_title))::int - 1
  FROM (SELECT DISTINCT "job_title" FROM "farmarcas_employees") t
 WHERE NOT EXISTS (
   SELECT 1 FROM "catalog_items" c
    WHERE c."kind" = 'OCCUPATION' AND lower(c."name") = lower(t.job_title) AND c."deleted_at" IS NULL
 );

UPDATE "farmarcas_employees" e
   SET "department_id" = c."id"
  FROM "catalog_items" c
 WHERE c."kind" = 'DEPARTMENT' AND c."deleted_at" IS NULL
   AND c."name" = CASE e."area"
     WHEN 'COMMERCIAL' THEN 'Comercial'
     WHEN 'MEMBER_FINANCE' THEN 'Financeiro do associado'
     WHEN 'TRADE' THEN 'Trade'
     WHEN 'DIGITAL_PRODUCTS' THEN 'Produtos digitais'
     WHEN 'MEMBER_SUCCESS' THEN 'Sucesso do associado'
     WHEN 'OPERATIONS' THEN 'Operações'
   END;

UPDATE "farmarcas_employees" e
   SET "occupation_id" = c."id"
  FROM "catalog_items" c
 WHERE c."kind" = 'OCCUPATION' AND c."deleted_at" IS NULL AND lower(c."name") = lower(e."job_title");

-- Telefone: 11 dígitos é celular; 10 é fixo.
UPDATE "farmarcas_employees" SET "mobile" = "phone" WHERE length("phone") = 11;
UPDATE "farmarcas_employees" SET "landline" = "phone" WHERE length("phone") = 10;

-- Acesso por sistema.
CREATE TABLE "employee_system_accesses" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "system" "suite_system" NOT NULL,
    "role" "suite_role" NOT NULL,
    "granted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" TEXT NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_by" TEXT,

    CONSTRAINT "employee_system_accesses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employee_system_accesses_employee_id_idx" ON "employee_system_accesses"("employee_id");

-- Um acesso vigente por funcionário e sistema. Índice parcial: escrito à mão.
CREATE UNIQUE INDEX "employee_system_accesses_active_uidx"
  ON "employee_system_accesses"("employee_id", "system") WHERE "revoked_at" IS NULL;

ALTER TABLE "employee_system_accesses" ADD CONSTRAINT "employee_system_accesses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "farmarcas_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- O papel único do Backoffice vira acesso ao Backoffice. Desligado entra já encerrado.
INSERT INTO "employee_system_accesses" ("id", "employee_id", "system", "role", "granted_at", "granted_by", "revoked_at", "revoked_by")
SELECT gen_random_uuid(), e."id", 'BACKOFFICE',
       CASE e."access_role" WHEN 'PLATFORM_ADMIN' THEN 'ADMIN'::"suite_role" ELSE 'ANALYST'::"suite_role" END,
       e."created_at", 'migração',
       CASE WHEN e."status" = 'TERMINATED' THEN e."terminated_at" END,
       CASE WHEN e."status" = 'TERMINATED' THEN 'migração' END
  FROM "farmarcas_employees" e
 WHERE e."access_role" <> 'NONE';

-- Só a plataforma lê e grava os acessos (como o cadastro de funcionários).
ALTER TABLE "employee_system_accesses" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_operator" ON "employee_system_accesses"
  USING (current_setting('app.actor_kind', true) = 'platform')
  WITH CHECK (current_setting('app.actor_kind', true) = 'platform');

-- Departamento e ocupação passam a ser obrigatórios; as colunas antigas saem.
ALTER TABLE "farmarcas_employees"
ALTER COLUMN "department_id" SET NOT NULL,
ALTER COLUMN "occupation_id" SET NOT NULL;

ALTER TABLE "farmarcas_employees" DROP COLUMN "access_role",
DROP COLUMN "area",
DROP COLUMN "job_title",
DROP COLUMN "phone";

DROP TYPE "employee_access_role";
DROP TYPE "employee_area";

CREATE INDEX "farmarcas_employees_department_id_idx" ON "farmarcas_employees"("department_id");
CREATE INDEX "farmarcas_employees_occupation_id_idx" ON "farmarcas_employees"("occupation_id");

ALTER TABLE "farmarcas_employees" ADD CONSTRAINT "farmarcas_employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "farmarcas_employees" ADD CONSTRAINT "farmarcas_employees_occupation_id_fkey" FOREIGN KEY ("occupation_id") REFERENCES "catalog_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
