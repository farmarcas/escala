# Tasks: Perfil do funcionário e acesso aos sistemas da Suite

**Input**: `specs/005-funcionario-acessos/` (plan, spec, research, data-model, contracts/api.md, quickstart)

**Tests**: incluídos (SC-003 e SC-005 pedem testes de acesso; research R11).

Caminhos: API em `backend/node/` e tela em `frontend/react/`.

Ao fim de cada fase:
- prettier, tsc, eslint e testes (API e tela);
- `scripts/sync-templates.sh` e `scripts/check-repo.sh`;
- conferência no navegador.

---

## Phase 1: Fundação (bloqueia todas as histórias)

- [x] T001 `prisma/schema.prisma`:
  - Criar os enums `EmployeeGender` (`FEMALE`, `MALE`, `OTHER`, `UNDISCLOSED`), `SuiteSystem` (`BACKOFFICE`, `GESTAO_360`, `ESCALA`) e `SuiteRole` (`ADMIN`, `MANAGER`, `ANALYST`).
  - Em `CatalogKind`, criar `DEPARTMENT` e `OCCUPATION`.
  - Em `FarmarcasEmployee`:
    - criar `gender`, `mobile` (`@db.Char(11)`), `landline` (`@db.Char(10)`), `departmentId` e `occupationId` (relações nomeadas com `CatalogItem`) e `version`;
    - criar `accesses EmployeeSystemAccess[]`;
    - tirar `phone`, `area`, `jobTitle` e `accessRole`.
  - Criar o model `EmployeeSystemAccess` conforme `data-model.md`.
  - Tirar os enums `EmployeeArea` e `EmployeeAccessRole`.
- [x] T002 Escrever a migration em duas partes: `20261102120000_funcionario_acessos_tipos` (enums; valor novo de enum não pode ser usado na mesma transação) e `20261102120100_funcionario_acessos` (gerada com `prisma migrate diff` e editada à mão), na ordem de `data-model.md` ("Cópia dos dados atuais"):
  - colunas novas nulas;
  - departamentos e ocupações;
  - `department_id` e `occupation_id`;
  - celular e fixo;
  - acessos;
  - `SET NOT NULL`;
  - `DROP` das colunas e enums antigos;
  - índice único parcial `employee_system_accesses_active_uidx` em `(employee_id, system) WHERE revoked_at IS NULL`;
  - RLS `platform_operator` na tabela nova.
- [x] T003 Reescrever `seeds/20261031130000_funcionarios_e_anjos.sql`:
  - departamentos e ocupações de exemplo, com ids fixos e `ON CONFLICT DO NOTHING`;
  - funcionários com `gender`, `mobile`, `landline`, `department_id` e `occupation_id`;
  - acessos ao Backoffice equivalentes aos papéis de hoje.
  
  O seed precisa continuar idempotente e funcionar num banco já migrado.
- [x] T004 [P] Settings-catalog, seção de pessoas:
  - em `catalog-kinds.ts`, criar os slugs `departments` e `occupations` e o campo `section` (`store` | `people`);
  - em `settings-catalog.schemas.ts`, só `name` nas duas listas novas;
  - no repositório, `inUse` conta funcionários não excluídos para `DEPARTMENT` e `OCCUPATION`, e lojas para as outras listas (`storesInUse` → `inUse`);
  - `summary` traz `section`;
  - atualizar os testes de `settings-catalog`.
- [x] T005 [P] Página da loja: `structureService.catalog()` passa a filtrar os 8 tipos da loja (`kind IN (...)`), mesmo sem `?kind`. Teste no `store-page.structure.integration.test.ts`.
- [x] T006 Anjo lendo os campos novos, em `economic-groups.repository.ts`, `stores.repository.ts` e `store-page.repository.ts` e nos services que montam o Anjo. `jobTitle` passa a ser o nome da ocupação e `phone` o celular (ou o fixo, se não houver celular). As chaves da resposta continuam as mesmas.
- [x] T007 `test-support/owner-db.ts`:
  - `createEmployee` cria (ou reaproveita) o departamento e a ocupação e recebe `access?: { system, role }[]`;
  - `resetBackoffice` inclui `employee_system_accesses`.
- [x] T008 Subir o ambiente e conferir a migration e o seed (`docker compose logs api`) e os dados copiados (consulta no banco: 14 funcionários, acessos iguais aos papéis antigos).

**Checkpoint**: banco migrado, nada perdido. A API compila com os campos novos (o módulo de funcionários é ajustado na US1).

---

## Phase 2: US1 — Perfil do usuário com Dados gerais (P1) 🎯 MVP

### API

- [x] T009 [P] [US1] `employees.schemas.ts`:
  - campos novos com validação: celular com 11 dígitos, fixo com 10, gênero, `departmentId` e `occupationId` uuid;
  - `version` no PATCH;
  - filtros `department` e `access` (`SISTEMA:PAPEL` ou `NONE`);
  - facets `department`, `access` e `status`;
  - teste de validação de telefone em `employees.schemas.test.ts`.
- [x] T010 [P] [US1] Criar `employees/changes-summary.ts`, com o texto "Campo: antes → depois" do funcionário (nomes de departamento e ocupação, telefones formatados), e o teste `changes-summary.test.ts`.
- [x] T011 [US1] Repository e service:
  - leitura com departamento, ocupação (`{ id, name, active }`) e acessos;
  - criar e editar com a regra "item desativado só se já é o valor atual" (reaproveitar `newlyAddedInactive` de `store-page/structure/inactive-rule.ts`);
  - `updateMany` com `version` e `VERSION_CONFLICT`;
  - auditoria com `changes-summary`;
  - `GET /employees/options` com os departamentos e ocupações ativos, mais `systems` e `roles` de `suite-systems.ts`.
- [x] T012 [P] [US1] Criar `employees/suite-systems.ts` com os 3 sistemas (rótulo, `isLive`, descrição) e os 3 papéis, com as regras do Backoffice (tabela da spec) e a regra geral (`default`).
- [x] T013 [US1] CSV (`employees.csv.ts`) com Departamento, Ocupação, Celular, Telefone fixo e Acessos.
- [x] T014 [US1] Teste de integração dos campos:
  - criar e editar com os campos novos;
  - celular inválido dá 400;
  - e-mail repetido dá 409;
  - versão velha dá 409 `VERSION_CONFLICT`;
  - ocupação desativada é aceita se já é a atual e recusada se é nova;
  - `GET /employees/options` para os três papéis;
  - histórico com antes e depois.

### Tela

- [x] T015 [P] [US1] `features/employees/types.ts` e `labels.ts`: tipos novos, `GENDER_LABEL`, `SYSTEM_LABEL`, `ROLE_LABEL` e `formatAccess`. Sai `AREA_LABEL` e `ACCESS_ROLE_LABEL`.
- [x] T016 [P] [US1] Hook `useEmployeeOptions` (departamentos, ocupações, sistemas, papéis) em `features/employees/hooks/useEmployeeDetail.ts`, a partir de `GET /employees/options`. O `hooks/useEmployeeOptions.ts` global (escolha do Anjo) passou a ler a ocupação.
- [x] T017 [US1] `EmployeeProfileView.tsx` substitui `EmployeeDetailView.tsx`. O topo tem:
  - "‹ Voltar" e o título "Perfil do usuário";
  - o seletor desabilitado "Colaborador Farmarcas";
  - a faixa com a inicial em círculo (cor pela inicial), o nome e a ocupação;
  - a situação e as ações Desligar e Religar (administrador);
  - as abas Dados gerais e Sistemas e acesso.
- [x] T018 [US1] `GeneralDataTab.tsx`:
  - seções "Informações gerais" e "Informações profissionais", com asterisco nos obrigatórios;
  - em leitura, os campos mostram o valor em caixa cinza;
  - "Editar", "Salvar" e "Cancelar" na aba, com erros nos campos e o aviso de conflito com "Recarregar";
  - "Complete o celular" quando falta;
  - abaixo das seções, a carteira como Anjo e o histórico.
- [x] T019 [US1] `EmployeeFormModal.tsx` e `useEmployeeForm.ts` (novo funcionário) com os mesmos campos. Tira papel de acesso, área e cargo.
- [x] T020 [US1] Conferir no navegador, conforme `quickstart.md` passos 1–3.

---

## Phase 3: US2 — Sistemas e acesso (P1)

- [x] T021 [P] [US2] Criar `employees/access-rules.ts` com:
  - `wouldLeaveNoAdmin(activeAdmins, employee, system, nextRole)`;
  - `accessSummary(system, before, after)`;
  - `terminationSummary(accesses)`;
  - `isSelf`, para quando houver login.

  Escrever também o teste `access-rules.test.ts`.
- [x] T022 [US2] `PUT /employees/:id/accesses/:system` (`adminOnly`):
  - encerra o vigente e cria o novo numa transação;
  - papel igual não faz nada;
  - erros 409 `LAST_ADMIN` e `EMPLOYEE_TERMINATED`;
  - auditoria `ACCESS_GRANTED`, `ACCESS_CHANGED` e `ACCESS_REVOKED`.
- [x] T023 [US2] Desligar encerra os acessos vigentes (`ACCESS_REVOKED_BY_TERMINATION`) e recusa o último administrador. Religar volta sem acesso. A leitura do desligado traz os acessos encerrados no desligamento.
- [x] T024 [US2] Lista: filtro e facets `access` (`SISTEMA:PAPEL`, `NONE`); `stats.admins` passa a contar `BACKOFFICE:ADMIN` vigente de ativos.
- [x] T025 [US2] Teste de integração:
  - conceder, trocar e tirar, com histórico na ordem;
  - último administrador (tirar, rebaixar, desligar);
  - desligar encerra e religar volta sem acesso;
  - filtro `access=BACKOFFICE:MANAGER,NONE`;
  - `stats.admins`;
  - gestor e analista recebem 403 no PUT.
- [x] T026 [US2] `AccessTab.tsx`, com um cartão por sistema:
  - nome, descrição e situação ("No ar" ou "Em desenvolvimento · vale quando entrar no ar");
  - chave "Tem acesso" e papéis em `SegmentedControl`;
  - lista do que o papel permite (de `roles[].rules`);
  - "desde dd/mm/aaaa";
  - grava na hora, com erro no cartão;
  - só leitura para gestor e analista;
  - desligado: acessos encerrados com a data.
- [x] T027 [US2] Lista de funcionários:
  - `EmployeesTable` com a coluna "Acessos" (etiquetas "Backoffice · Gestor");
  - `filterFields.ts` com "Departamento" e "Sistema e papel";
  - atalho "Com acesso ao Backoffice" vira `access=BACKOFFICE:ADMIN,BACKOFFICE:MANAGER,BACKOFFICE:ANALYST`;
  - KPIs sem mudança de rótulo.
- [x] T028 [US2] Conferir no navegador, conforme `quickstart.md` passos 4–5.

---

## Phase 4: US3 — Gestor no Backoffice (P2)

- [x] T029 [US3] Identidade:
  - `PlatformRole` ganha `PLATFORM_MANAGER`;
  - `requirePlatformRoles(...roles)`, com os atalhos `operators` e `adminOnly` em `shared/identity/authenticate.ts`;
  - `canSeeOwnerData` substitui `isPlatformAdmin` em `economic-groups.service.ts`;
  - demo `manager` → `OP-05`.
- [x] T030 [US3] Rotas: `brands`, `economic-groups`, `stores` e `partners` trocam `adminOnly` por `operators`. `employees` (gravações) e `settings-catalog` continuam `adminOnly`.
- [x] T031 [US3] Página da loja:
  - `permissions.ts`: `isAnalyst = role === 'PLATFORM_ANALYST'`;
  - `presenters.ts` e `employees.csv.ts`: rótulo "Gestor da plataforma";
  - `change-requests.service.ts` e `documents.service.ts` continuam montando o rótulo com `PLATFORM_ADMIN`: esses registros não guardam o papel de quem agiu, só o lado (Farmarcas ou grupo). Fica como está.
- [x] T032 [US3] Teste de integração `backoffice.roles.integration.test.ts` (grupo, Anjo, loja, parceiro e marca; dados do proprietário):
  - o gestor edita grupo, define Anjo, edita loja (com motivo), cria parceiro e marca, e vê os dados do proprietário sem máscara;
  - o gestor recebe 403 em `POST /employees`, `PUT /employees/:id/accesses/...` e `/settings/catalog`;
  - o analista recebe 403 nas mesmas gravações de operação.
- [x] T033 [US3] Tela:
  - `lib/api.ts` (`DemoRole` com `manager`);
  - `DemoRoleProvider` (`canOperate`, leitura do armazenamento local);
  - `RoleSwitcher` com a opção "Gestor da plataforma";
  - `AuditTrail` com o rótulo do gestor.
- [x] T034 [US3] Páginas e componentes que usam `isAdmin` para operar passam a usar `canOperate`: `PartnersPage`, `GroupDetailPage`, `StoresPage`, `OverviewPage`, `BrandsPage`, `GroupsPage`, `PartnerDetailPage`, `RootLayout` (onde for operação) e `StoresActions`. `EmployeesPage`, `EmployeeDetailPage`, Configurações e os menus continuam `isAdmin`.
- [x] T035 [US3] Conferir no navegador, conforme `quickstart.md` passos 6–7.

---

## Phase 5: Acabamento

- [x] T036 [P] Configurações na tela:
  - `features/settings` ganha a seção "Pessoas da Farmarcas" (Departamentos, Ocupações) em `catalogKinds.ts` e `SettingsView`;
  - a coluna "Em uso" usa `inUse` com a unidade de cada lista.
- [x] T037 [P] Atualizar `specs/003-backoffice-fase-2/spec.md` (nota em FR-010/012/016 apontando para a spec 005) e `specs/004-configuracoes-atributos/spec.md` (seção de pessoas).
- [x] T038 Rodar prettier, eslint, tsc, Vitest e integração na API e na tela, `sync-templates.sh` e `check-repo.sh`.
- [x] T039 Fazer o `quickstart.md` inteiro no navegador, em desktop e em largura de celular. Ao final, devolver o seletor de papel para Administrador.

---

## Dependências

- A Fundação (T001–T008) bloqueia tudo. T009–T013 dependem de T001–T003.
- A **US1** vem primeiro (MVP).
- A **US2** depende da US1: usa o perfil e as abas.
- A **US3** é independente da US2 no código da API, mas o teste T032 usa os acessos da US2.
- T036 pode correr junto da US1, porque só mexe em Configurações.

## Paralelo

- Fundação: T004, T005 e T006 juntos, depois de T001–T003.
- US1: T009, T010, T012, T015 e T016 juntos.
- US2: T021 junto da tela T026, depois de T022.

## Estratégia

1. Fundação e US1 no navegador: perfil com Dados gerais.
2. US2: acessos por sistema.
3. US3: gestor no Backoffice.
4. Acabamento.
