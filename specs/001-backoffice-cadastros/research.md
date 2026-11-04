# Research — 001 Backoffice cadastros

## R1. Identidade sem login (provedor plugável)
- **Decision**: a identidade vem de uma interface `IdentityProvider`, que devolve `{ subject, kind: 'platform' | 'tenant', role, tenantId? }`.
  - Nesta entrega existe só o provedor de demonstração. Ele lê o cabeçalho `x-demo-role: admin | analyst` e devolve uma identidade de plataforma (`PLATFORM_ADMIN` ou `PLATFORM_ANALYST`). Sem cabeçalho, vale `PLATFORM_ANALYST`, o mais restrito.
  - O provedor de demonstração só é ligado se `DEMO_IDENTITY_ENABLED=true`, valor que só o Compose local define. Em `NODE_ENV=production`, a API se recusa a subir com ele ligado.
  - As rotas de escrita usam `requirePlatformRole('PLATFORM_ADMIN')`. O analista recebe 403 `FORBIDDEN`, e o proprietário vem mascarado para ele.
- **Rationale**: o Product Vision (§6, invariante de identidade) diz que tenant e papéis nunca vêm do cliente e que identidade simulada não pode existir em produção. Com a interface, o Keycloak entra depois trocando só o provedor.
- **Alternatives**: login de verdade. Rejeitado: é uma lacuna conhecida, fora do escopo, e exigiria improvisar um padrão.

## R2. Chave primária e número do GE
- **Decision**: PK UUIDv7 (`uuid(7)`) em todas as tabelas, igual a `users`. O número do GE é um `Int` único com `autoincrement()` (sequência do Postgres), exibido com 4 dígitos. O código da loja segue a mesma ideia: sequência `Int`, exibida como `LJ-NNN`. O seed grava os números do protótipo e ajusta as sequências com `setval`.
- **Rationale**: mantém um padrão único de PK no schema (DATABASE.md). O número continua sendo a chave de negócio nas rotas (`/economic-groups/0417`).
- **Alternatives**: usar o número do GE como PK. Rejeitado: misturaria tipos de PK no schema.

## R3. Nome de marca único ignorando maiúsculas e acentos
- **Decision**: coluna `normalized_name`, preenchida pelo service (NFD, remove acentos, minúsculas, espaços colapsados), com índice único parcial `WHERE deleted_at IS NULL`.
- **Rationale**: evita depender da extensão `unaccent` e deixa a regra testável num helper puro.

## R4. Exclusão
- **Decision**:
  - Marca: exclusão lógica (`deleted_at`), só com 0 lojas.
  - Grupo: nunca excluído (arquivar é status).
  - Loja: não é excluída nesta entrega.
  - `audit_events`: tabela append-only, sem `deleted_at` nem `updated_at` (tabela técnica, justificada).

## R5. Proprietário (PII)
- **Decision**: tabela `group_owners` (1:1 opcional com o grupo), com nome, e-mail, telefone e `pseudonym` único no formato `F-XXXXX` (5 caracteres de `[0-9A-Z]`, gerado na criação, estável).
- **LGPD**:
  - Minimização: só os três campos de contato.
  - Mascaramento: o analista nunca recebe esses campos.
  - Retenção e anonimização definitivas ficam para quando houver troca de titularidade (fora do escopo). Registrado como pendência.

## R6. Collation
- **Decision**: criar a collation `pt_br` (ICU) na migration e aplicá-la a nome do grupo, razão social, nome da loja, cidade, endereço e nome da marca.
- **Rationale**: ordenar em português (DATABASE.md).

## R7. Dados derivados
- **Decision**:
  - Marcas e UFs do grupo, contagem PDV/CD, KPIs de grupos e de marcas: calculados por consulta (agregações do Prisma ou `$queryRaw` parametrizado). Nada disso é gravado.
  - Selos: "Sem proprietário" sai de `owner IS NULL`. "Aguardando ativação" fica fora (depende de convite).

## R8. Tela: TypeScript, Tailwind 4 e roteamento
- **Decision**: migrar `frontend/react` para TypeScript (`.tsx`), Tailwind 4 via `@tailwindcss/vite`, React Router 6 (`createBrowserRouter`) e `clsx` + `tailwind-merge`.
  - Rotas: `/`, `/grupos`, `/grupos/:numero`, `/lojas`, `/marcas`.
  - Dados: hooks por feature com `fetch` e um helper `api.ts` que injeta `x-demo-role` e converte o erro padrão. Nenhuma biblioteca de cache por enquanto.
- **Rationale**: a skill `component-development` exige TypeScript, e a `styling-tailwind` exige Tailwind 4 com tokens. As rotas permitem link direto para um grupo.
- **Alternatives**: TanStack Query. Adiado: o volume de telas ainda não justifica (constituição VII).

## R9. Tokens visuais
- **Decision**: mapear os tokens do Alquimia DS (`project/handoff/tokens.css`) para os nomes semânticos exigidos (`background`, `foreground`, `primary`, `muted`, `border`, `destructive`, `ring`, raios).
  - Tokens extras: `surface`, `success`, `warning`, `info`, `brand-soft`, `navy-*`.
  - `primary` = laranja `#F25C05` do Backoffice (decisão da spec).
  - Fonte Inter, carregada do Google Fonts.
- **Rationale**: as regras não negociáveis do handoff são cinzas azulados, raios 4/6/8/999, foco com borda de 2px e hover só com cor.

## R11. Multi-tenant: GE = tenant
- **Decision**:
  1. **Chave de tenant em toda tabela do tenant**: `group_owners`, `stores` e `audit_events` têm `economic_group_id` (FK para `economic_groups.id`). Em `group_owners` e `stores` é NOT NULL. Em `audit_events` é opcional, só para eventos de catálogo (marcas). `brands` é catálogo de plataforma, sem tenant.
  2. **Caminho dedicado do operador**: todas as rotas desta entrega ficam em `/api/v1/backoffice/*`. Só identidades de plataforma (`kind: 'platform'`) entram nelas. Identidade de tenant recebe 403. A futura suíte do associado terá o próprio prefixo (`/api/v1/tenant/*`), sempre filtrada pelo `tenantId` da credencial.
  3. **Isolamento no banco (RLS)**: a migration já liga Row Level Security em `group_owners`, `stores` e `audit_events`, com duas políticas:
     - `tenant_isolation`: só a linha cujo `economic_group_id = current_setting('app.tenant_id')`.
     - `platform_operator`: tudo quando `current_setting('app.actor_kind') = 'platform'`.

     A API define essas variáveis em cada transação (`set_config(..., true)`) por um helper `withActor(identity, fn)`. O app conecta com um usuário do banco que não é dono das tabelas (`app_runtime`), para o RLS valer de fato. As migrations continuam com o usuário dono.
  4. **Teste de isolamento como gate**:
     - Testes de integração provam que a identidade de tenant A não lê nem grava linha do tenant B, mesmo indo direto ao repository com `withActor`.
     - Rota do backoffice com identidade de tenant devolve 403.
     - O analista nunca recebe nome, e-mail ou telefone do proprietário.
- **Rationale**: Product Vision §9, invariantes 1, 5, 6 e 11: isolamento imposto no banco, operador por caminho dedicado, testes de isolamento como gate de build. Ligar o RLS agora evita refazer as tabelas quando a suíte do associado chegar.
- **Alternatives**:
  - Filtrar só no código (`where economicGroupId`). Rejeitado: o documento exige que o isolamento seja imposto no banco.
  - Um schema por tenant. Rejeitado: cerca de 500 tenants, e o documento fixa uma aplicação e um banco.

## R10. Validação de CNPJ
- **Decision**: helper puro `isValidCnpj` (dígitos verificadores, rejeita sequências repetidas). Grava só os dígitos (14 caracteres). A tela exibe com máscara.
- **Unicidade**: índice único parcial no CNPJ da loja.
