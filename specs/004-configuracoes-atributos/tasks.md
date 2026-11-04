# Tasks: Configurações do Backoffice — etapa 1 (atributos da loja)

**Input**: `specs/004-configuracoes-atributos/` (plan, spec, research, data-model, contracts/api.md, quickstart)

**Tests**: incluídos (SC-004 exige testes de acesso; research R12).
- Vitest cobre as regras puras.
- Supertest cobre as rotas, o acesso e a regra do item desativado.

Caminhos: a API fica em `backend/node/` e a tela em `frontend/react/`.

Ao fim de cada fase:
- rodam prettier, tsc, eslint e os testes (API e tela);
- rodam `scripts/sync-templates.sh` e `scripts/check-repo.sh`;
- a tela é conferida no navegador.

---

## Phase 1: Fundação (bloqueia todas as histórias)

- [x] T001 Alterar `prisma/schema.prisma`:
  - Em `CatalogItem`, criar as colunas novas:
    - `icon String?`;
    - `selfService Boolean @default(false) @map("self_service")`;
    - `usedByScale Boolean @default(false) @map("used_by_scale")`;
    - `version Int @default(1)`;
    - `updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(3)`;
    - `deletedAt DateTime? @map("deleted_at") @db.Timestamptz(3)`.
  - Ainda em `CatalogItem`, tirar o `@@unique([kind, name])`, criar `@@index([kind, sort])` e corrigir o comentário errado "Trilha append-only" acima do model.
  - Em `AuditEntity`, criar o valor `CATALOG_ITEM`.
- [x] T002 Gerar `prisma/migrations/20261101120000_configuracoes_atributos/migration.sql` com `prisma migrate dev --create-only` dentro do container da API e editar à mão:
  - criar o índice único parcial `catalog_items_kind_name_active_uidx` em `(kind, lower(name)) WHERE deleted_at IS NULL`;
  - criar o RLS em `catalog_items`: `catalog_read` (`FOR SELECT USING (true)`) e `platform_write` (`FOR INSERT` / `FOR UPDATE` com `current_setting('app.actor_kind', true) = 'platform'`);
  - acertar os dados existentes conforme `data-model.md` ("Dados existentes"): `self_service` para `gondola` e `expositor`, ícone por tipo, e o `used_by_scale` com o corte do sufixo ` · usada no módulo Escala` (sem diferença de maiúsculas).
- [x] T003 [P] Criar `seeds/20261101120000_configuracoes_atributos.sql`, idempotente e por id, com o ícone específico de cada um dos 12 mobiliários de exemplo, o `self_service` e a estratégia "Expansão de horário" com `used_by_scale = true` e descrição "Abrir mais horas ou dias".
- [x] T004 [P] Em `src/modules/audit/audit.types.ts`, acrescentar `'CATALOG_ITEM'` a `AuditEntityType`. Em `src/modules/audit/audit.repository.ts`, criar `listAuditByEntities(tx, type, ids, page, pageSize)`.
- [x] T005 [P] Criar `src/modules/settings-catalog/catalog-kinds.ts` com:
  - o mapa slug ↔ `CatalogKind` (`furniture`, `services`, `demand-systems`, `practice-tools`, `pbms`, `strategies`, `external-tools`, `channels`);
  - o rótulo de cada lista;
  - os tipos de mobiliário `gondola`, `checkout`, `balcao`, `frio`, `expositor`, `sala`, `outro`;
  - os tipos de canal `prop` e `terc`;
  - `defaultSelfService(type)` (true para `gondola` e `expositor`).

  Escrever também o teste `catalog-kinds.test.ts`.
- [x] T006 [P] Criar `src/modules/settings-catalog/furniture-icons.ts` com as cerca de 40 chaves válidas da galeria (kebab-case, incluindo `package`, `shelving`, `scan-barcode`, `counter`, `refrigerator`, `display-stand`, `door-open` e `monitor`).
- [x] T007 Página da loja lê os campos novos:
  - em `src/modules/store-page/structure/structure.service.ts`, `catalog()` devolve os itens não excluídos, ativos e desativados, com `icon`, `selfService`, `usedByScale` e `active`;
  - em `frontend/react/src/features/store-page/types.ts`, `CatalogItem` ganha esses campos;
  - em `hooks/useCatalog.ts`, `byKind` continua devolvendo só os ativos, e um `byKindForStore(kind, usedIds)` novo devolve os ativos mais os desativados que a loja usa;
  - todas as consultas a `catalogItem` filtram `deletedAt: null`.
- [x] T008 Subir o ambiente, conferir que a migration e o seed aplicam (`docker compose logs api`) e que a página da loja continua igual. Rodar os testes da API e da tela.

**Checkpoint**: banco pronto e página da loja sem mudança visível.

---

## Phase 2: US1 — Incluir um novo mobiliário com ícone (P1) 🎯 MVP

**Teste independente**: incluir "Expositor de vitaminas" com ícone e vê-lo na aba Mobiliário de uma loja, com quantidade 0.

### API

- [x] T009 [P] [US1] Criar `src/modules/settings-catalog/settings-catalog.schemas.ts`:
  - `kind` validado pelo slug;
  - um esquema Zod por lista, conforme `data-model.md` ("Campos por lista"), com estes limites:
    - `name` "1 a 80 caracteres, sem espaço nas pontas";
    - `description` "até 200 caracteres";
    - `groupLabel` "até 60" (operadora e categoria);
    - `negotiatedMonthlyCents` "≥ 0 ou vazio".
  - mobiliário: `groupLabel` obrigatório entre os 7 tipos e `icon` obrigatório entre as chaves de `furniture-icons.ts`;
  - canal: `groupLabel` `prop`|`terc` e `description` obrigatória;
  - campo de outra lista é recusado (`strict`);
  - `version` obrigatório no PATCH;
  - teste `settings-catalog.schemas.test.ts`.
- [x] T010 [P] [US1] Criar `src/modules/settings-catalog/audit-summary.ts`, que monta o texto "Lista · Item: Campo: antes → depois; …" só com os campos que mudaram e usa rótulos em português. Escrever o teste `audit-summary.test.ts`.
- [x] T011 [US1] Criar `src/modules/settings-catalog/settings-catalog.repository.ts` com:
  - `summary()`: ativos e desativados por kind;
  - `list(kind, status, q)`: na ordem de `sort`, com `storesInUse` (lojas não excluídas com `store_catalog_entries` ou `demand_system_id`, numa consulta agrupada) e `position`;
  - `suggestions(kind)`: `group_label` distintos;
  - `findByNormalizedName(kind, name)`;
  - `create`, `update(id, version, data)` com `updateMany` filtrado por `version`.
- [x] T012 [US1] Criar `src/modules/settings-catalog/settings-catalog.service.ts` com:
  - `list`, `summary`, `create` (entra com `sort = max + 1`) e `update`;
  - nome repetido gera 409 `DUPLICATE_NAME`, com `details.existing`, comparando com `normalizeName`;
  - versão diferente gera `versionConflict()`;
  - violação do índice único (P2002) vira `DUPLICATE_NAME`;
  - cada gravação chama `recordAudit` com `entity: { type: 'CATALOG_ITEM', id }`, `economicGroupId: null` e as actions do `data-model.md`;
  - tudo dentro de `withActor`.
- [x] T013 [US1] Criar `settings-catalog.controller.ts` e `settings-catalog.routes.ts` com `GET /`, `GET /:kind`, `POST /:kind` e `PATCH /:kind/:id`, todas com `requirePlatformRole('PLATFORM_ADMIN')`. Montar em `src/modules/backoffice/backoffice.routes.ts` como `/settings/catalog`.
- [x] T014 [US1] Teste `settings-catalog.routes.integration.test.ts`:
  - o administrador cria um mobiliário com ícone e o vê no `GET /:kind` e no `GET /catalog` da página da loja;
  - o analista recebe 403 em todas as rotas;
  - o tenant não acessa `/api/v1/backoffice/settings`;
  - "gondolas" é recusado porque "Gôndolas" já existe (409 `DUPLICATE_NAME`);
  - ícone fora da galeria dá 400;
  - campo de outra lista dá 400;
  - PATCH com versão velha dá 409 `VERSION_CONFLICT`;
  - um evento de auditoria por gravação;
  - o banco recusa INSERT em `catalog_items` com `app.actor_kind = 'tenant'` (RLS).

### Tela

- [x] T015 [P] [US1] Criar `frontend/react/src/lib/furniture-icons.ts` com o registro da galeria (chave, componente Lucide, rótulo, grupo e palavras de busca), nos grupos: expositores e gôndolas, caixa e check-out, refrigeração, balcão e atendimento, salas, telas e sinalização, outros. Criar também:
  - `furnitureIcon(key)`, que devolve `package` quando a chave não existe;
  - `searchIcons(term)`, sem diferença de acento ou maiúscula;
  - o teste `furniture-icons.test.ts` (chaves únicas, padrão e busca). A igualdade das chaves com `backend/node/src/modules/settings-catalog/furniture-icons.ts` é conferida em `scripts/check-repo.sh`, porque os containers não enxergam a pasta um do outro.
- [x] T016 [P] [US1] Criar `src/features/settings/types.ts` e `src/features/settings/catalogKinds.ts`, com o slug, o rótulo, o rótulo do botão "Novo …" e os campos do formulário de cada lista.
- [x] T017 [P] [US1] Criar os hooks em `src/features/settings/hooks/useCatalogList.ts`: `useCatalogSummary` e `useCatalogList` (com `status`, `q`, recarga e as gravações). O rascunho, os erros e o aviso de conflito de versão ficaram dentro do `CatalogItemModal`, como nos outros formulários do projeto.
- [x] T018 [US1] Criar `src/features/settings/components/IconPicker.tsx`:
  - grade de ícones por grupo, com campo de busca;
  - seleção por clique e por teclado (setas e Enter), `role="listbox"` e `aria-selected`;
  - rótulo do ícone escolhido.
  - Estilo conforme `styling-tailwind`.
- [x] T019 [US1] Criar `src/features/settings/components/CatalogItemModal.tsx` sobre o `Modal` existente:
  - os campos da lista (`TextField`, `SelectField`, `TextArea`, checkbox);
  - o tipo de mobiliário preenche o autosserviço (`defaultSelfService`);
  - o `IconPicker` abre com `package` selecionado;
  - prévia "como aparece na loja" (ícone, nome, tipo e descrição);
  - Salvar e Cancelar.
- [x] T020 [US1] Criar `src/features/settings/components/CatalogSummaryGrid.tsx` (cartões das 8 listas, com o número de ativos e link) e `CatalogItemsTable.tsx`. A tabela usa o `Table` existente e mostra:
  - ícone (no mobiliário), nome, campos próprios, situação e "em N lojas";
  - o botão "Alterar";
  - o botão "Novo …" no cabeçalho.
- [x] T021 [US1] Criar `src/features/settings/components/NoAccess.tsx` e as páginas `src/app/SettingsPage.tsx` (`/configuracoes`) e `src/app/SettingsCatalogPage.tsx` (`/configuracoes/atributos/:lista`, com 404 para lista desconhecida), ambas mostrando `NoAccess` para quem não é administrador. Registrar as duas em `src/app/router.tsx`, com migalhas "Configurações › Mobiliário".
- [x] T022 [US1] Em `src/components/layout/MenuRail.tsx`, criar o item "Configurações" (ícone `Settings`) no fim do menu da plataforma, visível só quando o papel for `admin`.
- [x] T023 [US1] Em `src/features/store-page/components/FurnitureTab.tsx`:
  - mostrar o ícone (`furnitureIcon`) ao lado do nome;
  - o cartão "Gôndolas e expositores" passa a somar os itens com `selfService`;
  - os rótulos de tipo continuam em `TYPE_LABEL`, movido para `src/lib/furniture-icons.ts` ou para um arquivo compartilhado.
- [x] T024 [US1] Conferir no navegador, conforme `quickstart.md` passos 1–3, como Administrador e como Analista.

**Checkpoint**: US1 completa. O administrador inclui mobiliário com ícone e a loja vê o item.

---

## Phase 3: US2 — Manter as outras 7 listas (P1)

**Teste independente**: incluir "Vacinação", subir para o topo e ver a ordem na loja. A estratégia nova, marcada para o Escala, mostra a etiqueta.

- [x] T025 [US2] API de mover:
  - `POST /:kind/:id/move` com `{ version, direction }`, que troca o `sort` com o vizinho não excluído numa transação;
  - as pontas não fazem nada;
  - auditoria `CATALOG_ITEM_MOVED` com "subiu para a posição N".
  - A regra pura de troca fica em `settings-catalog/move.ts`, com teste `move.test.ts`.
- [x] T026 [US2] Teste de integração da US2:
  - criar em cada uma das 8 listas com os campos certos, e campo de outra lista recusado;
  - `meta.suggestions` dos PBMs traz as operadoras;
  - mover reflete no `GET /catalog`;
  - estratégia com `usedByScale` aparece com o campo na página da loja;
  - `q` busca sem diferença de acento em nome e `groupLabel`.
- [x] T027 [P] [US2] Em `CatalogItemModal.tsx`, cobrir os campos de todas as listas:
  - operadora e categoria com sugestões (`datalist` a partir de `meta.suggestions`);
  - "usada no módulo Escala";
  - valor mensal em reais, convertido para centavos e vazio permitido;
  - canal próprio ou de terceiro e "o que a loja informa".
- [x] T028 [P] [US2] Em `CatalogItemsTable.tsx`, criar:
  - o campo de busca (`SearchField`);
  - os botões subir e descer por item (desabilitados nas pontas, com `aria-label` "Subir Nome" e "Descer Nome");
  - o aviso "em uso por N lojas, o nome muda em todas" antes de salvar uma renomeação.
- [x] T029 [US2] Em `src/features/store-page/components/StrategiesTab.tsx`, a etiqueta "Usada no módulo Escala" passa a vir de `usedByScale` (sai o `splitDescription`).
- [x] T030 [US2] Conferir no navegador, conforme `quickstart.md` passo 4.

---

## Phase 4: US3 — Desativar e excluir sem estragar o cadastro das lojas (P2)

**Teste independente**: desativar um PBM em uso: ele fica na loja que usa e some das outras. Excluir um item em uso é recusado; um item sem uso some.

- [x] T031 [US3] API:
  - `POST /:kind/:id/status` com `{ version, active }`, com auditoria `_DEACTIVATED` ou `_REACTIVATED`;
  - `DELETE /:kind/:id?version=`, que preenche `deleted_at` só com `storesInUse = 0`; caso contrário, 409 `IN_USE` com `details.stores` e a mensagem "Em uso por N lojas. Desative em vez de excluir.";
  - auditoria `_DELETED`.
- [x] T032 [US3] Regra "ativo ou já usado por esta loja" (research R5), com a função pura `allowedSelection(current, next, activeIds)` em `src/modules/store-page/structure/inactive-rule.ts` e o teste `inactive-rule.test.ts`. Aplicar:
  - em `ensureKind` (serviços, boas práticas, PBMs);
  - nas estratégias;
  - no mobiliário (desativado com quantidade 0 não recebe quantidade);
  - no sistema utilizado;
  - em `tools-channels.service.ts`.

  Marcar um item desativado agora devolve 400 com a mensagem "Este item foi desativado pela Farmarcas".
- [x] T033 [US3] Teste de integração da US3:
  - desativar não muda `store_catalog_entries`;
  - a loja mantém e desmarca o PBM desativado, mas não o marca de novo;
  - mobiliário desativado pode ir a 0, mas não sobe a partir de 0;
  - o sistema utilizado desativado continua;
  - excluir em uso dá 409 `IN_USE`;
  - excluir sem uso faz o item sumir de `GET /catalog`;
  - reativar devolve o item às opções;
  - o nome de um item excluído pode ser reusado.
- [x] T034 [P] [US3] Tela de configurações:
  - filtro de situação (`SegmentedControl`: Ativos, Desativados, Todos);
  - ações Desativar e Reativar;
  - Excluir com confirmação, que mostra a recusa `IN_USE` com o botão "Desativar".
- [x] T035 [P] [US3] Página da loja:
  - `StructureSection.tsx` (serviços, boas práticas, PBMs, sistema), `StrategiesTab.tsx`, `FurnitureTab.tsx`, `ChannelsTab.tsx` e a aba de ferramentas usam `byKindForStore`;
  - item desativado mostra a marca "desativado" e, na edição, só permite desmarcar ou zerar;
  - lista sem opção mostra "Nenhuma opção disponível".
- [x] T036 [US3] Conferir no navegador, conforme `quickstart.md` passo 5, como Administrador e como dono do grupo.

---

## Phase 5: US4 — Histórico das configurações (P3)

**Teste independente**: renomear um serviço e ver "Nome: antes → depois" no histórico da lista, com OP-02 e a data.

- [x] T037 [US4] API: `GET /:kind/audit-events?page&pageSize`, com os eventos de todos os itens do kind (inclusive os excluídos), via `listAuditByEntities`, mais recentes primeiro. Escrever o teste de integração: um evento por ação, em ordem.
- [x] T038 [US4] Tela: botão "Histórico" na página da lista, abrindo o `AuditTrail` existente (`src/features/audit/components/AuditTrail.tsx`) com paginação.
- [x] T039 [US4] Conferir no navegador, conforme `quickstart.md` passo 6.

---

## Phase 6: Acabamento

- [x] T040 Conflito de versão na tela: o modal mostra "Este item foi alterado por outra pessoa. Recarregue para ver a versão atual" e um botão "Recarregar". Conferir com duas abas (`quickstart.md` passo 7).
- [x] T041 [P] Atualizar `specs/002-pagina-da-loja/spec.md` com uma nota: listas mantidas em Configurações (spec 004), etiqueta do Escala por campo, item desativado.
- [x] T042 Rodar prettier, eslint, tsc, Vitest e integração na API e na tela, `sh scripts/sync-templates.sh` e `sh scripts/check-repo.sh`. Tudo verde.
- [x] T043 Conferência final do `quickstart.md` inteiro no navegador, em desktop e em largura de celular.

---

## Dependências

- A Fundação (T001–T008) bloqueia tudo.
- **US1** (T009–T024) é o MVP e vem primeiro. US2, US3 e US4 usam o módulo, as rotas e as telas criados nela.
- **US2** e **US3** são independentes entre si depois da US1. US3 toca a página da loja (T032, T035); US2 só toca `StrategiesTab` (T029).
- **US4** depende só da US1 (a auditoria já é gravada desde T012).
- O Acabamento vem por último.

## Paralelo

- Fundação: T003, T004, T005 e T006 juntos, depois de T001 e T002.
- US1: T009, T010, T015, T016 e T017 juntos; depois T011 → T012 → T013 → T014 (API) e T018 → T019 → T020 → T021 (tela).
- US2: T027 e T028 juntos, depois de T025.
- US3: T034 e T035 juntos, depois de T031 e T032.

## Estratégia

1. Fundação e US1, conferidas no navegador. Neste ponto já dá para incluir mobiliário com ícone, o pedido principal.
2. US2: as outras listas.
3. US3: desativar e excluir.
4. US4: histórico.
5. Acabamento.

Cada fase termina com os testes verdes e a tela conferida.
