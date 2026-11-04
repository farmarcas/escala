# Pesquisa e decisões — Perfil do funcionário e acesso aos sistemas

## R1. Acesso por sistema

- **Decisão**: tabela nova `employee_system_accesses` (funcionário, sistema, papel, concedido em/por, encerrado em/por). Um acesso vigente por funcionário e sistema, garantido por índice único parcial `WHERE revoked_at IS NULL`. Trocar o papel encerra o acesso vigente e abre outro.
- **Motivo**: cada pessoa pode ter vários sistemas, e as datas de início e fim de cada acesso ficam guardadas. Isso permite mostrar "encerrado em" depois do desligamento.
- **Alternativas**:
  - Coluna por sistema no funcionário: cada sistema novo exigiria migration, e as datas se perdem.
  - JSON no funcionário: sem validação no banco.

## R2. Sistemas e papéis

- **Decisão**: enums `suite_system` (`BACKOFFICE`, `GESTAO_360`, `ESCALA`) e `suite_role` (`ADMIN`, `MANAGER`, `ANALYST`). A situação de cada sistema ("No ar" ou "Em desenvolvimento") e o resumo de cada papel ficam numa constante da API (`suite-systems.ts`), devolvida por `GET /employees/access-options`.
- **Motivo**: a lista de sistemas é fixa nesta entrega (o cadastro de sistemas ficou fora). A tela não repete as regras, só mostra o que a API manda.

## R3. Departamento e ocupação

- **Decisão**:
  - `catalog_kind` ganha `DEPARTMENT` e `OCCUPATION`. As duas listas usam o mesmo cadastro de Configurações da spec 004 (`settings-catalog`), numa seção nova "Pessoas da Farmarcas" (slugs `departments` e `occupations`).
  - O funcionário guarda `department_id` e `occupation_id`, com chave estrangeira para `catalog_items`.
  - A rota de catálogo da página da loja passa a filtrar só os 8 tipos da loja.
- **Motivo**: a tela, a regra de desativar, a de excluir sem uso e o histórico já existem.
- **Contagem "em uso"**:
  - Nas listas de pessoas, conta funcionários não excluídos.
  - O campo da API `storesInUse` vira `inUse`, e a tela mostra a unidade de cada lista ("lojas" ou "pessoas").
- **Alternativas**: tabelas próprias de departamento e ocupação (mais um CRUD inteiro, igual ao que já existe).

## R4. Dados atuais (migration com cópia e retirada)

- **Decisão**: uma migration faz tudo na ordem abaixo. Não há outro consumidor das colunas antigas: o Gestão 360 ainda não existe, e a API e a tela mudam juntas.
  1. Cria as colunas novas.
  2. Cria os departamentos a partir das 6 áreas, com os mesmos rótulos e a mesma ordem.
  3. Cria uma ocupação para cada cargo diferente.
  4. Preenche `department_id` e `occupation_id`.
  5. Telefone com 11 dígitos vira celular; com 10, telefone fixo.
  6. `access_role` vira acesso ao Backoffice: `PLATFORM_ADMIN` → `ADMIN`, `PLATFORM_ANALYST` → `ANALYST`, `NONE` → nenhum.
  7. Retira `phone`, `area`, `job_title`, `access_role` e os enums `employee_area` e `employee_access_role`.
- Os ids criados na migration usam `gen_random_uuid()`, porque o Postgres 16 não gera UUIDv7. Os ids continuam únicos e só a ordem natural se perde, o que é aceitável para listas pequenas. A decisão fica registrada no comentário da migration.
- O seed `20261031130000_funcionarios_e_anjos.sql` é reescrito com as colunas novas. Num banco novo, ele roda depois da migration.

## R5. Papel Gestor no Backoffice

- **Decisão**:
  - `PlatformRole` ganha `PLATFORM_MANAGER`.
  - O guarda `requirePlatformRole(role)` vira `requirePlatformRoles(...roles)`, com dois atalhos:
    - `operators` (admin e gestor): marcas, grupos, lojas, parceiros e as gravações da página da loja pelo lado da plataforma.
    - `adminOnly`: funcionários (gravações e acessos) e Configurações.
  - `isPlatformAdmin`, usado para tirar a máscara dos dados do proprietário, vira `canSeeOwnerData` (admin e gestor).
  - Na página da loja, `isAnalyst` passa a ser `role === 'PLATFORM_ANALYST'`.
  - O provedor de demonstração aceita `x-demo-role=manager` (sujeito `OP-05`).
- **Motivo**: a regra fica num lugar só por rota, e o analista continua com o comportamento de hoje.

## R6. Regras do acesso

Ficam em funções puras (`access-rules.ts`), com teste:
- **Último administrador**: tirar, rebaixar ou desligar quem é o último administrador ativo do Backoffice é recusado com 409 `LAST_ADMIN`.
- **Desligar e religar**: desligar encerra todos os acessos vigentes, na mesma transação. Religar não devolve acessos.
- **Funcionário desligado** não recebe acesso (409 `EMPLOYEE_TERMINATED`).
- **Próprio acesso (FR-023)**: precisa ligar a identidade de quem está usando ao cadastro de funcionário, e isso só existe com o login. Os papéis de demonstração (OP-02, OP-05, OP-07) não são funcionários do cadastro. A regra fica pronta na função (`isSelf(actorEmail, employee)`) e passa a valer quando o provedor de identidade trouxer o e-mail. Até lá, ela não bloqueia nada. Fica anotado na spec.

## R7. Histórico

- **Decisão**: o histórico continua na auditoria do funcionário (`entity_type = EMPLOYEE`). Cada mudança de acesso grava, por exemplo, `ACCESS_GRANTED` com o resumo "Backoffice: sem acesso → Gestor". As outras ações seguem o mesmo padrão: `ACCESS_CHANGED`, `ACCESS_REVOKED` e `ACCESS_REVOKED_BY_TERMINATION`. As mudanças de dados usam o resumo "Campo: antes → depois" (helper como o de `settings-catalog/audit-summary.ts`).
- **Rótulo do papel**: o rótulo "Gestor da plataforma" entra nos três lugares que traduzem papéis: a página da loja (`presenters.ts`), a trilha de auditoria (`AuditTrail`) e o CSV.

## R8. Gravação ao mesmo tempo

- **Decisão**: o funcionário ganha `version`. O PATCH dos dados recebe a versão lida e, se ela não bater, devolve 409 `VERSION_CONFLICT`. Os acessos são gravados um a um e não precisam de versão: cada troca encerra o vigente, e o índice único segura a corrida.

## R9. Anjo

- **Decisão**: os blocos de Anjo (detalhe do grupo, lista de lojas, página da loja e escolha do Anjo) continuam com as chaves `jobTitle` e `phone` na resposta. `jobTitle` passa a ser o nome da ocupação, e `phone` o celular (ou o fixo, se não houver celular).
- **Motivo**: troca só a origem do dado, sem mexer em quatro telas.

## R10. Tela

- **Abas**: o perfil usa o `Tabs` existente, com as abas Dados gerais e Sistemas e acesso.
- **Dados gerais**: a edição é na própria aba, com "Editar", depois "Salvar" ou "Cancelar".
- **Sistemas e acesso**: um cartão por sistema, com:
  - a chave "Tem acesso";
  - os papéis em `SegmentedControl`;
  - o resumo do papel escolhido;
  - a data de início.

  Cada mudança grava na hora. Erros como `LAST_ADMIN` aparecem no cartão.
- **Gênero**: lista fechada em `SelectField`.
- **Departamento e ocupação**: vêm de `GET /employees/options`, que traz os itens ativos e mais o valor atual da pessoa, se estiver desativado.
- **Papéis na tela**: o contexto de papel ganha `canOperate` (admin ou gestor). As páginas que hoje usam `isAdmin` para operar passam a usar `canOperate`. Funcionários, Configurações e o menu continuam com `isAdmin`.

## R11. Testes

- **Vitest**: regras de acesso (último administrador, desligar, resumo do histórico), validação de celular e fixo, conversão do papel antigo, resumo das mudanças.
- **Supertest**:
  - CRUD com os campos novos;
  - acesso por sistema (conceder, trocar, tirar, histórico);
  - último administrador;
  - desligar encerra acessos;
  - lista e filtro por acesso;
  - o gestor edita grupo, loja e parceiro, mas recebe 403 em funcionários e Configurações;
  - o analista recebe 403 em tudo que grava;
  - opções de departamento e ocupação;
  - catálogo da loja sem os tipos de pessoas.
