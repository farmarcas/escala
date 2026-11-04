# Research — 002 Página da loja

## R1. Identidade do grupo (demonstração)
- **Decision**:
  - O provedor de demonstração aceita `x-demo-role: owner` com `x-demo-tenant: <id do grupo>` e devolve `{ kind: 'tenant', role: 'TENANT_ADMIN', tenantId, subject: <pseudônimo do proprietário> }`.
  - A lista de grupos para o seletor vem de `GET /api/v1/demo/tenants`. Essa rota só existe com `DEMO_IDENTITY_ENABLED` e consulta como plataforma.
  - Em produção, nada disso existe (mesma trava de 001).
- **Rationale**: exercita o RLS de verdade, com uma identidade de tenant, sem login. O Keycloak entra depois trocando só o provedor.
- **Alternatives**: simular o grupo dentro do Backoffice. Recusado: furaria o caminho dedicado e não testaria o isolamento.

## R2. Dois caminhos, um módulo
- **Decision**: o módulo `store-page` monta o mesmo router em `/api/v1/backoffice/stores/:code/...` (com `requirePlatform`) e em `/api/v1/tenant/stores/:code/...` (com `requireTenant`).
  - O service recebe a identidade e consulta `permissions.ts`: `canEditBasic`, `canEditOwnerPrivate`, `canEditStrategies`, `canEditTools`, `canEditChannels`, `canUploadDoc(type)`, `canAct(request, step)`, `canValidate`, `canRemind`, `requiresReason`.
- **Rationale**: uma regra só, testada em unidade. A diferença entre os lados fica explícita numa tabela.

## R3. Isolamento das tabelas novas
- **Decision**: cada tabela nova filha de `stores` tem RLS com a política `store_visible`: `USING (EXISTS (SELECT 1 FROM stores s WHERE s.id = store_id))`.
  - Como `stores` já tem RLS, a subconsulta herda o filtro de tenant e de plataforma.
  - Tabelas com `economic_group_id` próprio (histórico, solicitações, documentos) usam também as políticas diretas de 001.
- **Rationale**: uma regra só, sem duplicar a chave do tenant em toda tabela.
- **Alternatives**: copiar `economic_group_id` em todas. Recusado: mais colunas para manter coerentes.

## R4. Campos novos da loja e migração do que já existe
- **Decision**:
  - `stores.name` passa a ser o **apelido**.
  - `stores.address` é **renomeada** para `street` (logradouro da Receita).
  - `opened_at` é a data de inauguração.
  - Colunas novas (todas opcionais): `legal_name`, `state_registration`, `zip`, `number`, `district`, `tax_regime` (enum), `trade_name`, `store_category`, `affiliated_network`, contatos, endereço popular (`pop_*`), estrutura (`own_building`, `area_m2`, `sales_area_m2`, `staff_count`, `demand_system_id`), `no_external_tools`, `validated_at`, `validated_by`, `validation_reminded_at`, `completeness_filled`, `completeness_total`, `version`.
- **Rationale**: expand sem perda (DATABASE.md). O renomear preserva os dados de 001.

## R5. Catálogos
- **Decision**: uma tabela `catalog_items`, de plataforma e sem RLS:
  - `kind` (SERVICE, DEMAND_SYSTEM, PRACTICE_TOOL, PBM, STRATEGY, FURNITURE, EXTERNAL_TOOL, CHANNEL);
  - `group_label` (programa do PBM, grupo do canal, tipo de mobiliário, categoria da ferramenta);
  - `description`, `negotiated_monthly_cents` (centavos, inteiro), `sort`.

  As respostas da loja ficam em `store_catalog_entries`, com:
  - `uses` e `identifier` (canais);
  - `monthly_cost_cents` (ferramentas);
  - `quantity` e `trade_quantity` (mobiliário);
  - `since` (estratégias).

  Itens que o grupo inclui ficam em `store_custom_entries`, filha da loja e com RLS.
- **Rationale**: dinheiro em inteiro de centavos, sem erro de arredondamento (Product Vision §9.10). Uma tabela de catálogo serve às 8 listas.

## R6. Documentos e upload
- **Decision**:
  - `multer` com armazenamento em memória e limite de 10 MB.
  - O tipo do arquivo é conferido pelos primeiros bytes: `%PDF`, JPEG `FFD8FF`, PNG `89504E47`.
  - O arquivo é gravado em `store_document_files.content` (`bytea`), separado de `store_documents` (metadados), para a listagem não carregar arquivos.
  - Download por `GET .../documents/:id/file`, que passa pelo RLS.
- **Alternatives**: volume em disco ou S3. Recusado para agora (ver Complexity Tracking).

## R7. Solicitações
- **Decision**: a definição dos 4 tipos fica em código, em `change-requests/types.ts`:
  - etapas com dono `group | platform | system`;
  - documentos exigidos;
  - schema Zod dos valores pedidos;
  - função `apply(store, values)`.

  As transições ficam numa função pura `transition(request, action, identity)`. Ela devolve o novo estado ou um erro de domínio (`NOT_YOUR_STEP`, `DOCS_MISSING`, `REASON_REQUIRED`, `ALREADY_OPEN`, `CNPJ_TAKEN`).

  Persistência:
  - `store_change_requests`, com `requested_values jsonb`, `current_step`, `status` e `version`;
  - `store_change_request_events` (linha do tempo);
  - anexos em `store_documents.request_id`.

  Ao ficar vigente, `apply` grava na loja na mesma transação, e o histórico e a auditoria do grupo registram.
- **Rationale**: regra testável sem banco. Etapas mudam só em código revisado.

## R8. Preenchimento e validação
- **Decision**: `completeness.ts` lista os 30 campos da US4 e calcula `{ filled, total, missing[] }` a partir da loja, do horário, das respostas de catálogo e dos documentos.
  - O service recalcula e grava `completeness_filled` e `completeness_total` em toda escrita que afeta esses campos.
  - Validação: `status(validatedAt, today)` devolve `never | ok | due_soon (≤30d) | overdue`, com vencimento em +6 meses.
  - Faixas de filtro: Completo = 100%; Falta algo = 80 a 99%; Falta muito < 80%.
- **Rationale**: a lista filtra por coluna, sem recalcular 1.800 lojas.

## R9. Histórico da loja
- **Decision**: `store_history`, somente acréscimo; o usuário da aplicação só tem `INSERT` e `SELECT`. Campos:
  - `kind`: EDIT, REQUEST, DOCUMENT, VALIDATION, REMINDER;
  - `field_label`, `old_value`, `new_value`, `justification`, `request_id`;
  - `actor_kind`, `actor_subject`, `actor_role`.

  "Alterado em … por …" vem do último EDIT por campo.

  Quando o autor é o grupo, o nome exibido é o do proprietário. O Analista da plataforma recebe o pseudônimo.
- **Rationale**: mantém a trilha que o grupo e a Farmarcas veem, sem misturar com a auditoria de plataforma de 001. As solicitações também geram um resumo em `audit_events`.

## R10. Conflito de edição
- **Decision**: `stores.version` (inteiro). Os PATCH mandam `expectedVersion`; se o valor for diferente, a API responde 409 `STORE_VERSION_CONFLICT`. As solicitações usam o mesmo mecanismo.

## R11. Tela: dois lados
- **Decision**:
  - `features/store-page` recebe `side: 'platform' | 'tenant'` e o caminho base da API.
  - A área do grupo usa `AppShell variant="tenant"`, que aplica `data-side="tenant"`. Um bloco CSS troca os tokens: `--color-primary: #006FF7`, menu `#061938`.
  - Rotas: Backoffice `/lojas/:codigo`; grupo `/grupo/lojas` e `/grupo/lojas/:codigo`.
  - O seletor de papel ganha "Proprietário do grupo". Ao escolher, vai para `/grupo/lojas`; ao voltar a Administrador ou Analista, vai para `/`.
- **Rationale**: uma página, dois temas, sem duplicar componentes. O tema por lado está previsto no DS (`handoff/theming.md`).

## R12. Fatias
- **P1**: migration P1 (campos da loja, histórico, solicitações e eventos, documentos e arquivos), área do grupo, página com cabeçalho, Dados, painel de Solicitações, cartão de governança e Histórico básico; lista de Lojas com governança.
- **P2**: horário, estrutura, catálogos (serviços, sistema, boas práticas, PBM, estratégias, mobiliário), seções livres.
- **P3**: ferramentas externas, canais, aba Documentos completa, Responsáveis e filtros do Histórico.

Os documentos já entram na P1 por causa das solicitações, que exigem anexos, e do preenchimento, que conta 4 documentos.
