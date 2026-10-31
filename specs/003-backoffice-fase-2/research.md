# Research: Backoffice Farmarcas — fase 2

## R1. Onde mora o funcionário da Farmarcas

- **Decision:** tabela própria `farmarcas_employees`, sem `economic_group_id`.
  - RLS com duas políticas:
    - `platform_operator`: leitura e escrita para a plataforma.
    - `tenant_angel`: só leitura para o grupo, e só da linha cujo `id` é o `angel_employee_id` do próprio grupo.
  - A subconsulta em `economic_groups` já passa pelo RLS do tenant, então o grupo nunca chega ao Anjo de outro grupo.
- **Rationale:** o funcionário é dado da operadora, não do tenant. A política dá ao grupo o mínimo de que ele precisa (o seu Anjo) sem copiar dado de pessoa.
- **Alternatives considered:**
  - Reaproveitar a tabela `users` do esqueleto do golden path: ela é exemplo genérico, sem área, papel nem situação, e mudar seu sentido confundiria quem usa o template.
  - Copiar nome e contato do Anjo para o grupo: dado duplicado e desatualizado.

## R2. Papel de acesso do funcionário

- **Decision:** coluna `access_role` (`PLATFORM_ADMIN`, `PLATFORM_ANALYST`, `NONE`) só informativa nesta fase. O seletor "Papel de demonstração" continua decidindo o papel da sessão.
- **Rationale:** o Product Vision diz que o papel vem do provedor de identidade. Quando o login chegar, o campo passa a ser preenchido por ele e fica só leitura na tela.
- **Alternatives considered:** fazer o seletor de demonstração escolher um funcionário do cadastro. Recusado agora: muda a demonstração sem ganho para esta fase. Pode entrar junto com "Minhas lojas" do Anjo.

## R3. Anjo do grupo

- **Decision:** coluna `angel_employee_id` em `economic_groups` (FK, opcional).
  - Trocas vão para `audit_events` do grupo, com os nomes do Anjo anterior e do novo no resumo.
  - Funcionário é pessoa da Farmarcas, não do tenant, então o nome pode aparecer.
  - Desligar funcionário é recusado se ele for Anjo de algum grupo (`EMPLOYEE_HAS_PORTFOLIO`).
- **Rationale:** um Anjo por grupo é o que o Gestão 360 consome. A carteira sai de uma consulta simples por `angel_employee_id`.
- **Alternatives considered:** tabela de ligação com vigência (início e fim). Recusada: o histórico já está na auditoria, e o Gestão 360 só precisa do Anjo atual.

## R4. Auditoria de funcionário e parceiro

- **Decision:** `audit_events` ganha `entity_type` (`GROUP`, `EMPLOYEE`, `PARTNER`) e `entity_id`.
  - Linhas antigas recebem `GROUP` e o próprio `economic_group_id`.
  - Funcionário e parceiro gravam com `economic_group_id` nulo: a política do tenant já esconde essas linhas dos grupos.
  - A tabela continua somente acréscimo (o papel `app_runtime` não tem UPDATE nem DELETE nela).
- **Rationale:** uma trilha só, com as mesmas garantias, e a tela de histórico reaproveita o componente de auditoria.
- **Alternatives considered:** tabelas de auditoria por cadastro. Recusada: regras repetidas.

## R5. Bloqueio da loja corta o acesso do grupo

- **Decision:**
  - A loja ganha `blocked_at`, `blocked_reason` e `blocked_by`.
  - `loadStore` (store-page) recusa com 403 `STORE_BLOCKED` quando a identidade é de tenant e a loja está bloqueada. É o ponto por onde passam todas as rotas da página da loja.
  - As rotas que chegam por id e não por código também precisam desse corte. São elas a ação em solicitação, os documentos e o download. Elas resolvem a loja e aplicam a mesma checagem.
  - A lista "Minhas lojas" continua trazendo a loja, com `isBlocked: true`, para a tela mostrar o selo.
- **Rationale:** um ponto só de decisão, testado por integração em leitura e gravação.
- **Alternatives considered:** esconder a loja bloqueada pelo RLS do tenant. Recusada: a loja sumiria de "Minhas lojas", e a pessoa não saberia por quê.

## R6. Exportação CSV

- **Decision:** rota `GET …/export` em cada lista, com os mesmos filtros da listagem e sem paginação (teto de 5.000 linhas).
  - Separador `;`, BOM UTF-8, `\r\n`, aspas duplas com escape. Datas `dd/mm/aaaa`.
  - Gerado por uma função pura `toCsv(columns, rows)`.
  - O conteúdo usa a mesma visão (com pseudonimização) que a tela.
  - Proteção contra fórmula: valores que começam com `=`, `+`, `-` ou `@` ganham um apóstrofo na frente.
- **Rationale:** Excel em português abre `;` com acento certo quando há BOM. Fazer na API garante todas as linhas filtradas, não só a página da tela.
- **Alternatives considered:**
  - Biblioteca de CSV: dependência nova para um formato simples.
  - Gerar na tela: só exportaria a página carregada.

## R7. Ações em lote

- **Decision:**
  - `POST /stores/bulk` com `{ action: 'BLOCK' | 'UNBLOCK', codes: number[] (1–200), justification }`.
  - `POST /economic-groups/bulk-angel` com `{ numbers: number[] (1–200), employeeId }`.
  - Uma transação: cada item que muda gera o seu registro na auditoria do grupo dele. Os que já estão no estado pedido são pulados.
  - Resposta `{ changed, skipped }`.
  - A regra de "o que muda e o que pula" é função pura testada.
- **Rationale:** a auditoria é por grupo e a resposta diz exatamente o que aconteceu.
- **Alternatives considered:** chamar a rota individual N vezes pela tela. Recusada: lento e sem atomicidade.

## R8. Etapa da loja

- **Decision:** enum `store_stage` (`PROSPECTING`, `SETUP`, `OPENED`).
  - Na migration, as lojas existentes recebem `OPENED` se têm `opened_at`, senão `PROSPECTING`.
  - Regras puras em `stage.ts`:
    - avançar é livre;
    - voltar exige justificativa;
    - `OPENED` exige data de inauguração, que grava `opened_at`.
  - A mudança vai para a auditoria do grupo e para o histórico da loja.
- **Rationale:** etapa e situação são independentes, como a especificação pede.

## R9. "Dados desatualizados (+90 dias)"

- **Decision:** a loja fica marcada quando todas estas condições valem:
  - não está `INACTIVE`;
  - `greatest(updated_at, coalesce(validated_at, created_at)) < now() - 90 days`.

  Vira filtro `alert=outdated` na lista de lojas, ao lado de `docAlert` e `hasOpenRequest`. A regra fica numa expressão SQL única, no repositório de lojas.
- **Rationale:** é a leitura mais direta do texto do protótipo, e o prazo fica numa constante para ajustar quando a operação validar.

## R10. Transferência de titularidade

- **Decision:** `POST /economic-groups/:number/owner-transfer` com `{ name, email, phone, justification }`.
  - Na mesma transação:
    - o proprietário atual recebe `deleted_at`;
    - o novo é criado com pseudônimo novo;
    - a auditoria registra "Titularidade transferida de F-aaaa para F-bbbb", com a justificativa.
  - Recusado para grupo arquivado (`GROUP_ARCHIVED`) e para grupo sem proprietário (aí é "Editar grupo").
- **Rationale:** o histórico guarda só códigos, nunca nome ou contato (pseudonimização).

## R11. Cartão Alelo

- **Decision:** tabela `group_benefit_cards`, uma por grupo (único por `economic_group_id`).
  - Colunas: `store_id` (loja ativa do mesmo grupo), `holder_name`, `holder_cpf` (11 dígitos validados), `holder_birth_date`, `card_number` (só dígitos) e `holder_pseudonym`.
  - RLS de tenant igual às demais.
  - A API nunca devolve o número inteiro: devolve `cardLast4`.
  - O administrador recebe nome, CPF (com máscara) e nascimento. O analista recebe só `holderPseudonym`.
  - Trocar o titular gera pseudônimo novo e um registro de auditoria sem dados pessoais.
- **Rationale:** minimização (LGPD). Ninguém precisa ver o número inteiro pela tela.
- **Alternatives considered:** guardar só os 4 últimos dígitos. Recusada por ora: o cadastro pede o número, e a integração futura com a Alelo vai precisar dele. Fica registrado como ponto a validar com o jurídico (D6).

## R12. Telas sem protótipo (Funcionários e Parceiros)

- **Decision:** seguir o padrão das listas de Grupos e Marcas.
  - Peças: `KpiGrid` com 4 indicadores, barra de filtros, tabela com `Row` clicável, "Exibindo X de Y", modal de formulário e página de detalhe com cabeçalho e abas (Dados / Histórico).
  - Parceiros têm abas de tipo no lugar do filtro de status, como os grupos.
- **Rationale:** consistência visual sem inventar componente novo.

## R13. Números do Início

- **Decision:** uma rota de leitura, `GET /api/v1/backoffice/home/map`, faz uma consulta SQL agregada por UF sobre lojas não excluídas, não `INACTIVE` e de grupo não arquivado. Ela devolve, para cada UF com presença:
  - lojas, grupos (distintos), grupos com proprietário e cidades (distintas);
  - as 4 cidades com mais lojas;
  - as marcas com contagem;
  - os 3 grupos com mais lojas.

  A rota também devolve os totais do Brasil: lojas, grupos distintos e grupos com proprietário. Um grupo com lojas em vários estados conta uma vez no Brasil e uma vez em cada estado.

  Regiões, % da rede, lojas por grupo, faixas de cor e "Outras" na divisão por marca são contas da tela, em funções puras testadas.
- **Rationale:** com cerca de 1.800 lojas, a consulta leva poucos milissegundos e sempre bate com as listas, que usam os mesmos filtros de UF. Não vale manter uma cópia agregada.
- **Alternatives considered:**
  - Tabela ou visão materializada atualizada de madrugada (o "Atualizado às 06h" do protótipo): números defasados das listas, sem ganho no volume atual.
  - Mandar todas as lojas para a tela agregar: tráfego à toa e regra espalhada.

## R14. Desenho do mapa

- **Decision:** os contornos dos 27 estados vêm do protótipo (svg-maps/brazil, CC BY 4.0), copiados para um módulo de dados da tela (`features/home/lib/brazil-geometry.ts`), com o crédito no arquivo e no rodapé da tela.
  - O mapa é um `<svg>` desenhado pelo React.
  - O zoom é um `transform` animado no grupo, como no protótipo, e respeita `prefers-reduced-motion`.
  - Pelo teclado, o estado é escolhido na tabela "Estados" (linhas focáveis, Enter abre). O mapa é uma imagem com descrição, para não somar 27 paradas de Tab antes dos cartões. A tabela também traz os mesmos números para quem não lê cores.
  - As 5 faixas de cor usam a escala laranja do protótipo como tokens do tema (`--color-map-1` a `--color-map-5` e `--color-map-empty`), com versão para o tema escuro.
- **Rationale:** igual ao protótipo aprovado, sem biblioteca de mapas nem serviço externo.
- **Alternatives considered:**
  - Biblioteca de mapas (Leaflet ou D3-geo com TopoJSON): dependência e peso grandes para um mapa de 27 formas.
  - Imagem estática: sem clique nem zoom.

## R15. Rotas da tela

- **Decision:** "/" passa a ser o Início, e a Visão geral vai para "/visao-geral".
  - Os atalhos do Início levam a `/grupos?uf=SP` e `/lojas?uf=SP`. A lista de lojas já lê os filtros da URL. A de grupos passa a ler `uf` da URL também.
  - Os links que apontavam para "/" como Visão geral são atualizados: menu lateral, menu do celular e caminho (breadcrumb).
- **Rationale:** a primeira tela do protótipo é o Início.
