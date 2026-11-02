# Modelo de dados — Perfil do funcionário e acesso aos sistemas

Duas migrations: `20261102120000_funcionario_acessos_tipos` (enums novos; um valor novo de enum não pode ser usado na mesma transação em que é criado) e `20261102120100_funcionario_acessos` (colunas, cópia dos dados, tabela de acessos e retirada das colunas antigas, com SQL editado à mão).

## Enums novos

- `employee_gender`: `FEMALE`, `MALE`, `OTHER`, `UNDISCLOSED`
- `suite_system`: `BACKOFFICE`, `GESTAO_360`, `ESCALA`
- `suite_role`: `ADMIN`, `MANAGER`, `ANALYST`
- `catalog_kind` ganha `DEPARTMENT` e `OCCUPATION`

Saem `employee_area` e `employee_access_role`.

## `farmarcas_employees` (alterada)

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `name` | text | já existe; 3 a 120 caracteres (nome completo) |
| `email` | text | já existe; único entre não excluídos |
| `gender` | `employee_gender`, nulo | **nova**; opcional |
| `mobile` | char(11), nulo | **nova**; obrigatório na API (cadastro e edição); nulo só em registro antigo sem telefone |
| `landline` | char(10), nulo | **nova**; opcional |
| `department_id` | uuid → `catalog_items` | **nova**; obrigatório; item `DEPARTMENT` |
| `occupation_id` | uuid → `catalog_items` | **nova**; obrigatório; item `OCCUPATION` |
| `version` | int, padrão 1 | **nova** |
| `status`, `terminated_at`, `created_at`, `updated_at`, `deleted_at` | | já existem |
| ~~`phone`, `area`, `job_title`, `access_role`~~ | | **saem** depois da cópia |

Índices: `farmarcas_employees_department_id_idx` e `farmarcas_employees_occupation_id_idx`.

## `employee_system_accesses` (nova)

| Coluna | Tipo | Regra |
| --- | --- | --- |
| `id` | uuid v7 | PK |
| `employee_id` | uuid → `farmarcas_employees` | obrigatório |
| `system` | `suite_system` | obrigatório |
| `role` | `suite_role` | obrigatório |
| `granted_at` | timestamptz | padrão `now()` |
| `granted_by` | text | sujeito de quem concedeu |
| `revoked_at` | timestamptz, nulo | encerrado quando preenchido |
| `revoked_by` | text, nulo | |

- Índice único parcial `employee_system_accesses_active_uidx` em `(employee_id, system) WHERE revoked_at IS NULL`, escrito à mão.
- RLS como em `farmarcas_employees`: só a plataforma lê e grava. A aplicação não apaga linhas, só encerra.

### Estados do acesso

```text
sem acesso ──conceder──▶ vigente (papel X) ──trocar papel──▶ encerrado + vigente (papel Y)
                              │
                              └──tirar / desligar──▶ encerrado
```

## Cópia dos dados atuais (na migration)

1. Para cada área (enum antigo), cria um `catalog_items` `DEPARTMENT` com o rótulo de hoje e `sort` de 0 a 5: Comercial, Financeiro do associado, Trade, Produtos digitais, Sucesso do associado, Operações.
2. Para cada `job_title` diferente, cria um `OCCUPATION`, em ordem alfabética.
3. Preenche `department_id` e `occupation_id` de cada funcionário.
4. Copia o telefone: `phone` com 11 dígitos vai para `mobile`; com 10 dígitos, para `landline`.
5. Cria os acessos: `access_role` `PLATFORM_ADMIN` vira (`BACKOFFICE`, `ADMIN`); `PLATFORM_ANALYST` vira (`BACKOFFICE`, `ANALYST`). Os dois ficam com `granted_by = 'migração'` e `granted_at = created_at`.
6. Torna `department_id` e `occupation_id` obrigatórios e retira as colunas e os enums antigos.

O seed `20261031130000_funcionarios_e_anjos.sql` passa a criar os departamentos e as ocupações de exemplo (buscados pelo nome, porque num banco antigo a migration já os criou), os funcionários com as colunas novas e os acessos (só para quem ainda não tem nenhum). Funcionário desligado entra com o acesso já encerrado na data do desligamento.

## Auditoria (sem mudança de estrutura)

Os eventos do funcionário (`entity_type = EMPLOYEE`) ganham estas ações:

| `action` | `summary` (exemplo) |
| --- | --- |
| `EMPLOYEE_UPDATED` | `Celular: (vazio) → (11) 96034-8829; Ocupação: Analista → Coordenador` |
| `ACCESS_GRANTED` | `Gestão 360: sem acesso → Analista` |
| `ACCESS_CHANGED` | `Backoffice: Analista → Gestor` |
| `ACCESS_REVOKED` | `Escala: Gestor → sem acesso` |
| `ACCESS_REVOKED_BY_TERMINATION` | `Acessos encerrados no desligamento: Backoffice (Gestor)` |
