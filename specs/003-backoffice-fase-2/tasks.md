# Tasks: Backoffice Farmarcas — fase 2

**Input**: `specs/003-backoffice-fase-2/` (plan, spec, research, data-model, contracts/api.md, quickstart)

**Tests**: incluídos (FR-082 e SC-000).
- Vitest cobre as regras puras.
- Supertest cobre as rotas e o isolamento.

Caminhos: a API fica em `backend/node/` e a tela em `frontend/react/`.

Entrega em quatro fatias. Ao fim de cada fatia, os testes passam e a tela é conferida no navegador. Em cada uma também rodam prettier, tsc e eslint (API e tela), `scripts/sync-templates.sh` e `scripts/check-repo.sh`.

---

# Fatia 0 (P1) — Início: mapa da rede

## Phase 1: US0 — API

- [x] T001 [US0] Criar `src/modules/home/home.repository.ts` com uma consulta SQL agregada por UF, seguindo a regra de `data-model.md` (Fatia 0). A consulta devolve:
  - lojas, grupos distintos, grupos com proprietário e cidades distintas;
  - as 4 cidades principais;
  - as marcas com contagem;
  - os 3 grupos principais;
  - os totais do Brasil (grupos distintos, sem somar estados).
- [x] T002 [US0] Criar `src/modules/home/home.routes.ts` com `GET /home/map`, por `withActor` e com o formato de `contracts/api.md`, e montar em `backoffice.routes.ts`.
- [x] T003 [US0] Teste de integração `src/modules/home/home.routes.integration.test.ts`:
  - totais e números de uma UF batem com `GET /stores?uf=` e `GET /economic-groups?uf=`;
  - loja inativa e grupo arquivado não entram;
  - grupo com lojas em 2 UFs conta 1 vez no Brasil;
  - analista recebe o mesmo, e tenant recebe 403.

## Phase 2: US0 — tela

- [x] T004 [P] [US0] Extrair a geometria dos 27 estados do protótipo para `src/features/home/lib/brazil-geometry.ts`:
  - formato `[path, x, y, largura, altura, nome]`;
  - crédito svg-maps/brazil (CC BY 4.0) no topo do arquivo.
- [x] T005 [P] [US0] Regras puras em `src/features/home/lib/map-metrics.ts` + `map-metrics.test.ts`:
  - regiões e a UF de cada uma;
  - as 4 medidas, com valor, texto e as 5 faixas do protótipo;
  - totais por região, % da rede, lojas por grupo;
  - divisão por marca (3 maiores e "Outras");
  - ranking, estados sem presença e enquadramento (zoom) do Brasil, da região e da UF.
- [x] T006 [P] [US0] Tokens do mapa em `src/styles/globals.css`: `--color-map-1..5` e `--color-map-empty`, também no tema escuro. Registrar no Tailwind.
- [x] T007 [US0] `src/features/home/hooks/useHomeMap.ts` (`useApiQuery`) e `types.ts`.
- [x] T008 [US0] Componentes em `src/features/home/components/`:
  - `BrazilMap.tsx`:
    - SVG com zoom animado (respeita `prefers-reduced-motion`);
    - etiquetas UF e valor;
    - dica ao passar o mouse;
    - estados focáveis pelo teclado (Enter seleciona);
    - clique no fundo sobe um nível.
  - `MetricSwitch.tsx`, `MapLegend.tsx` e `RegionCards.tsx`.
  - `UfPanel.tsx`: indicadores, cidades, barra de marcas, grupos (link) e atalhos.
  - `StatesTable.tsx`: colunas do FR-105, barra da medida e "Sem presença".
  - `HomeView.tsx`: grade mapa + coluna da direita, que no celular vira uma coluna só.
- [x] T009 [US0] Rotas e menu:
  - `app/HomePage.tsx` em "/";
  - `OverviewPage` em "/visao-geral";
  - `MenuRail` e `MobileNav` com Início no topo e Visão geral logo abaixo;
  - breadcrumb "Início";
  - links que levavam a "/" como Visão geral revistos (`RoleSwitcher`, `NotFoundPage`).
- [x] T010 [US0] `useGroupsList` passa a ler `uf` da URL (`/grupos?uf=SP`), como `useStores` já faz.
- [x] T011 [US0] Conferir no navegador o roteiro "Fatia 0" de `quickstart.md`:
  - desktop 1440;
  - celular 375, sem rolagem lateral;
  - papel Analista;
  - console sem erro.

---

# Fatia 1 (P1) — Funcionários e Anjo

## Phase 3: Base

- [x] T020 `prisma/schema.prisma`:
  - enums `EmployeeArea`, `EmployeeAccessRole`, `EmployeeStatus` e `AuditEntity`;
  - model `FarmarcasEmployee`;
  - `EconomicGroup.angelEmployeeId`;
  - `AuditEvent.entityType` e `entityId`.
- [x] T021 Migration `<ts>_backoffice_fase2_p1` (`--create-only` e SQL editado):
  - e-mail único sem diferenciar maiúsculas (índice parcial);
  - CHECK de telefone;
  - RLS de `farmarcas_employees`: `platform_operator` e `tenant_angel` só leitura (R1);
  - backfill de `audit_events` (`GROUP`, `economic_group_id`);
  - índices `angel_employee_id` e `(entity_type, entity_id, created_at)`.
- [x] T022 `scripts/db-setup.ts` com as permissões de `app_runtime` na tabela nova. `audit_events` segue só com INSERT e SELECT.
- [x] T023 `modules/audit`:
  - `recordAudit` recebe `entityType` e `entityId`; os chamadores de grupo passam `GROUP`;
  - nova função `listAuditByEntity`.
- [x] T024 Seed `seeds/<ts>_funcionarios_e_anjos.sql`, idempotente:
  - cerca de 12 funcionários fictícios nas 6 áreas, incluindo Juliana Prado, Isabela Nunes e Marília Duarte como Anjos;
  - Anjos ligados aos grupos de exemplo (um grupo fica sem Anjo).

## Phase 4: US1 — cadastro de funcionários

- [x] T030 [P] [US1] Regras puras em `src/modules/employees/employee-status.ts` + teste: desligar exige motivo e carteira vazia (`EMPLOYEE_HAS_PORTFOLIO`); religar exige motivo; transições inválidas.
- [x] T031 [US1] `src/modules/employees/`: `employees.schemas.ts`, `.repository.ts`, `.service.ts` (+ `.service.test.ts`), `.controller.ts` e `.routes.ts`.
  - Rotas da Fatia 1 em `contracts/api.md`: lista, stats, detalhe com carteira, criar, editar, status e histórico.
  - Escrita só do admin.
  - Montar em `backoffice.routes.ts`.
- [x] T032 [US1] Teste de integração `employees.routes.integration.test.ts`:
  - e-mail repetido devolve 409;
  - analista recebe 403 na escrita;
  - desligar com carteira devolve 409;
  - o histórico registra as mudanças;
  - tenant recebe 403.
- [x] T033 [P] [US1] Tela `src/features/employees/`:
  - `types.ts`, `labels.ts` (áreas e papéis), hooks de lista, stats, detalhe e mutações;
  - `EmployeesKpis`, `EmployeesToolbar`, `EmployeesTable`, `EmployeeFormModal`, `EmployeeStatusModal`;
  - `EmployeeDetailView`, com Dados, Carteira e Histórico (reaproveitando `features/audit`).
- [x] T034 [US1] `app/EmployeesPage.tsx` e `app/EmployeeDetailPage.tsx`, rotas `/funcionarios` e `/funcionarios/:id`, breadcrumb com o nome (`usePageTitle`). "Funcionários" sai de "Em desenvolvimento" no `MenuRail` e no `MobileNav`.

## Phase 5: US2 — Anjo do grupo

- [x] T040 [US2] API do grupo:
  - `PUT /economic-groups/:number/angel`:
    - recusa funcionário não ativo e grupo arquivado;
    - grava na auditoria com o Anjo anterior e o novo.
  - `POST /economic-groups/bulk-angel` com `{ changed, skipped }`. A regra pura de alteradas e puladas fica em `src/shared/bulk.ts` + teste.
  - Filtros `angelId` e `withoutAngel`, `angel` nas visões e selo `NO_ANGEL`.
- [x] T041 [US2] Lojas e página da loja:
  - `GET /stores` com filtro `angelId` e `angel` em cada item;
  - `store-page` devolve `angel` nos dois caminhos (o lado do grupo lê pela política `tenant_angel`).
- [x] T042 [US2] Testes de integração:
  - definir, trocar e retirar o Anjo, com auditoria;
  - lote com puladas;
  - filtro por Anjo;
  - o tenant A vê o próprio Anjo na página da loja e não lê o funcionário que é Anjo só do grupo B (gate de isolamento em `tenant.isolation.integration.test.ts`).
- [x] T043 [P] [US2] Tela de grupos:
  - coluna e selo "Sem Anjo" em `GroupsTable`;
  - filtro por Anjo em `GroupsToolbar`;
  - seleção de linhas e "Atribuir Anjo" em lote;
  - bloco Anjo no detalhe com "Definir Anjo" / "Trocar Anjo" (`AngelPickerModal`, só funcionários ativos).
- [x] T044 [P] [US2] Tela de lojas e página da loja:
  - coluna e filtro Anjo em `StoresView`;
  - `ResponsiblesTab` mostra o Anjo real (nome, cargo, e-mail, telefone) no lugar do aviso.
- [x] T045 [US2] Conferir no navegador o roteiro "Fatia 1" de `quickstart.md`, incluindo o lado do grupo.

---

# Fatia 2 (P2) — Parceiros, etapa e bloqueio

## Phase 6: Base

- [x] T050 `schema.prisma`:
  - enums `PartnerType`, `PartnerStatus` e `StoreStage`;
  - models `Partner` e `PartnerContact`;
  - `Store.stage`, `blockedAt`, `blockedReason` e `blockedBy`.
- [x] T051 Migration `<ts>_backoffice_fase2_p2`:
  - CNPJ único parcial;
  - contato principal único parcial;
  - CHECK de motivo quando bloqueada;
  - RLS só da plataforma em `partners` e `partner_contacts`;
  - backfill de `stage` (`OPENED` se `opened_at`).
  - Permissões em `db-setup.ts`.
- [x] T052 Seed `seeds/<ts>_parceiros_e_lojas.sql`, idempotente:
  - cerca de 10 parceiros fictícios (indústrias e distribuidores) com contatos, um deles sem principal;
  - lojas de exemplo em Prospecção e Montagem;
  - uma loja bloqueada.

## Phase 7: US3 — Parceiros

- [x] T060 [P] [US3] Regra pura `src/modules/partners/primary-contact.ts` + teste: marcar principal tira o anterior; exige e-mail ou telefone.
- [x] T061 [US3] `src/modules/partners/`, com as rotas da Fatia 2 em `contracts/api.md`:
  - lista com abas por tipo, stats, detalhe, criar, editar, status, contatos e histórico;
  - CNPJ validado com `shared/br/cnpj.ts`;
  - escrita só do admin.
- [x] T062 [US3] Teste de integração `partners.routes.integration.test.ts`: CNPJ inválido e repetido, contato principal único, analista 403, tenant 403, histórico.
- [x] T063 [P] [US3] Tela `src/features/partners/`:
  - KPIs, abas Todos / Indústrias / Distribuidores, busca, filtro de situação e tabela;
  - `PartnerFormModal`;
  - `PartnerDetailView`, com Dados, Contatos (`ContactFormModal`, remover, marcar principal) e Histórico.
- [x] T064 [US3] Rotas `/parceiros` e `/parceiros/:id`. "Parceiros" sai de "Em desenvolvimento".

## Phase 8: US4 — Etapa e bloqueio da loja

- [x] T070 [P] [US4] Regra pura `src/modules/stores/stage.ts` + teste:
  - avançar é livre;
  - voltar exige justificativa;
  - `OPENED` exige `openedAt`.
- [x] T071 [US4] API:
  - `PATCH /stores/:code/stage`;
  - `POST /stores/:code/block` e `/unblock`;
  - auditoria do grupo e histórico da loja;
  - filtros `stage`, `blocked` e `alert=outdated` (R9, prazo em constante);
  - `isBlocked` e `isOutdated` nas visões.
- [x] T072 [US4] Corte do grupo:
  - `store-page.service.ts` `loadStore` recusa 403 `STORE_BLOCKED` para tenant;
  - mesma checagem nas rotas que resolvem a loja por id (ação em solicitação, documentos, download);
  - `GET /tenant/stores` traz `isBlocked`.
- [x] T073 [US4] Testes de integração:
  - etapa (avançar, voltar sem motivo, Inaugurada sem data);
  - bloquear e desbloquear com auditoria;
  - tenant recebe 403 em leitura e gravação da loja bloqueada, e as outras lojas seguem normais;
  - filtro "desatualizada".
- [x] T074 [P] [US4] Tela do operador:
  - colunas Etapa, Situação e Bloqueio e os filtros correspondentes em `StoresView`;
  - alerta "Dados desatualizados (+90 dias)" no filtro;
  - no cabeçalho da página da loja: etapa com "Mudar etapa" (`StageModal`) e "Bloquear / Desbloquear" (`BlockModal`, com motivo, via portal).
  - Etapa no formulário de nova loja.
- [x] T075 [P] [US4] Tela do grupo:
  - "Minhas lojas" mostra o selo "Bloqueada", sem link;
  - a página da loja trata `STORE_BLOCKED` com a mensagem "Loja bloqueada pela Farmarcas".
- [x] T076 [US4] Conferir no navegador o roteiro "Fatia 2" de `quickstart.md`.

---

# Fatia 3 (P3) — Titularidade, Alelo, lote e exportação

## Phase 9: Base

- [x] T080 `schema.prisma`: model `GroupBenefitCard`.
- [x] T081 Migration `<ts>_backoffice_fase2_p3`:
  - `group_benefit_cards` com RLS de tenant;
  - CHECKs de CPF e número do cartão;
  - índice único parcial de proprietário ativo por grupo, se ainda não existir.
  - Permissões em `db-setup.ts`.
- [x] T082 [P] `src/shared/br/cpf.ts` + teste (validação e máscara).
- [x] T083 [P] `src/shared/http/csv.ts` + teste: `;`, BOM, aspas, quebras de linha, proteção contra fórmula, datas `dd/mm/aaaa`.

## Phase 10: US5 — Transferir titularidade

- [x] T090 [US5] `POST /economic-groups/:number/owner-transfer`:
  - service com testes unitários: sem proprietário, arquivado, pseudônimo novo;
  - repository numa transação: exclui o anterior e cria o novo;
  - auditoria "Titularidade transferida de F-… para F-…".
- [x] T091 [US5] Teste de integração: transferência, auditoria sem dados pessoais, analista 403.
- [x] T092 [P] [US5] Tela:
  - "Transferir titularidade" no bloco do proprietário (só admin) e `OwnerTransferModal`, com justificativa;
  - no `GroupFormModal`, a nota sobre a troca de proprietário aponta para essa ação.

## Phase 11: US6 — Cartão Alelo

- [x] T100 [US6] `PUT /economic-groups/:number/benefit-card`:
  - loja ativa do grupo;
  - CPF válido;
  - pseudônimo novo ao trocar de titular;
  - auditoria sem dados pessoais.
  - `benefitCard` no detalhe com a visão por papel (R11).
- [x] T101 [US6] Testes:
  - unitário da visão (`cardLast4`, CPF mascarado, analista só código);
  - integração: loja de outro grupo, loja inativa, analista sem CPF nem número.
- [x] T102 [P] [US6] Tela:
  - seção "Informações do Cartão Alelo" no `GroupFormModal`: titular, "Alterar titular", CPF, nascimento, número e loja com busca (só ativas);
  - bloco "Cartão Alelo" no detalhe, com aviso de loja inativa;
  - visão do analista.

## Phase 12: US7 — Lote e exportação

- [x] T110 [US7] `POST /stores/bulk` (BLOCK e UNBLOCK): uma transação, um registro por loja, `{ changed, skipped }`. A regra de puladas usa `shared/bulk.ts`.
- [x] T111 [US7] Rotas `GET …/export` em lojas, grupos, funcionários e parceiros:
  - mesmos filtros da lista;
  - visão por papel;
  - `toCsv`;
  - teto de 5.000 linhas;
  - `Content-Disposition` com data.
- [x] T112 [US7] Testes de integração:
  - lote com puladas;
  - CSV com BOM e `;`;
  - CSV do analista sem dado pessoal;
  - filtros respeitados.
- [x] T113 [P] [US7] Tela:
  - seleção na tabela de lojas, com "Selecionar todas as filtradas";
  - "Ações (N)": Exportar selecionadas, Bloquear lojas, Desbloquear lojas (`BulkBlockModal`, com motivo e resultado);
  - "Exportar CSV" nas quatro listas, com download pelo `api.ts`.
- [x] T114 [US7] Conferir no navegador o roteiro "Fatia 3" de `quickstart.md` e abrir o CSV numa planilha.

---

## Phase 13: Acabamento

- [x] T120 Atualizar `specs/001-backoffice-cadastros/spec.md` (FR-001: menu e Início) e `specs/002-pagina-da-loja/spec.md` (Anjo e bloqueio), apontando para 003.
- [x] T121 Rodar `scripts/sync-templates.sh` e `scripts/check-repo.sh`, e a bateria completa de testes da API e da tela.
- [x] T122 Marcar as tarefas concluídas neste arquivo.

## Dependencies

- A Fatia 0 só depende do que já existe. As fatias 1, 2 e 3 dependem do código, não da Fatia 0.
- Na Fatia 1: T020–T024 vêm antes de US1, e US1 vem antes de US2, porque o Anjo precisa de funcionário.
- Na Fatia 2: T050–T052 vêm antes. US3 e US4 são independentes entre si.
- Na Fatia 3: T080–T083 vêm antes. US5, US6 e US7 são independentes. US7 usa `csv.ts` e `bulk.ts`.

## Parallel

- **Fatia 0:** T004, T005 e T006 em paralelo com T001–T003.
- **Fatia 1:** T030 em paralelo com T031. T033 em paralelo com T031–T032, a partir do contrato. T043 em paralelo com T044.
- **Fatia 2:** US3 (T060–T064) em paralelo com US4 (T070–T076). T074 em paralelo com T075.
- **Fatia 3:** T082 em paralelo com T083. US5, US6 e US7 em paralelo.

## Implementation Strategy

1. **MVP:** Fatia 0 (Início). É entregue, conferida no navegador e mostrada antes de seguir.
2. Fatia 1 destrava o Gestão 360. Pausa para conferência.
3. Fatia 2, depois Fatia 3. Cada uma é fechada com testes, navegador e commit quando a pessoa pedir.
