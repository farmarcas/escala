-- Spec 005 (parte 1): tipos novos. Valor novo de enum não pode ser usado na mesma transação em
-- que é criado; por isso a cópia dos dados fica na migration seguinte.

-- CreateEnum
CREATE TYPE "employee_gender" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "suite_system" AS ENUM ('BACKOFFICE', 'GESTAO_360', 'ESCALA');

-- CreateEnum
CREATE TYPE "suite_role" AS ENUM ('ADMIN', 'MANAGER', 'ANALYST');

-- AlterEnum
ALTER TYPE "catalog_kind" ADD VALUE 'DEPARTMENT';
ALTER TYPE "catalog_kind" ADD VALUE 'OCCUPATION';
