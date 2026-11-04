# Pesquisa e decisões — Configurações, etapa 1 (atributos da loja)

Cada item: decisão, motivo e alternativas descartadas.

## R1. Onde guardar as listas

- **Decisão**: continuar na tabela `catalog_items` (criada na spec 002), com colunas novas: `icon`, `self_service`, `used_by_scale`, `version`, `updated_at` e `deleted_at`.
- **Motivo**: as respostas das lojas (`store_catalog_entries`, `stores.demand_system_id`) já apontam para essa tabela. Ficar nela não exige mover nenhum dado e renomear um item muda em todas as lojas sem esforço extra.
- **Alternativas**: uma tabela por lista (8 tabelas, 8 CRUDs iguais, e as respostas da loja teriam de ser migradas); uma tabela genérica de "atributos" com valores em JSON (perde validação no banco e complica os filtros).

## R2. Campos próprios de cada lista

- **Decisão**: `group_label` continua guardando o "agrupador" de cada lista, com significado por tipo:
  - Mobiliário: código do tipo (`gondola`, `checkout`, `balcao`, `frio`, `expositor`, `sala`, `outro`).
  - PBMs: operadora.
  - Ferramentas externas: categoria.
  - Canais: `prop` ou `terc`.

  `description` também muda de nome na tela conforme a lista:
  - descrição (mobiliário, estratégia);
  - observação da condição (ferramenta externa);
  - "o que a loja informa" (canal).

  A validação por lista fica num esquema Zod por tipo (`discriminatedUnion` em `kind`).
- **Motivo**: a página da loja e os seeds já usam `group_label` e `description` assim. Mudar o nome das colunas agora mexeria em tudo sem ganho para quem usa.
- **Alternativas**: colunas novas para cada campo (`operator`, `category`, `channel_type`) com cópia dos dados. Fica mais explícito, mas dobra a migration e as alterações na página da loja. Pode ser revisto na etapa 2, quando operadora e categoria virarem listas próprias.

## R3. Nome sem repetir (maiúscula, minúscula e acento)

- **Decisão**:
  - O serviço compara o nome normalizado (`normalizeName`, o mesmo das marcas) com os itens não excluídos da mesma lista e recusa com 409 `DUPLICATE_NAME`.
  - No banco, um índice único parcial `(kind, lower(name)) WHERE deleted_at IS NULL` substitui o antigo `(kind, name)`. Esse índice segura a corrida de duas gravações ao mesmo tempo em relação a maiúscula e minúscula.
- **Motivo**: não exige coluna nova. Os seeds atuais continuam inserindo sem mudança, porque o `ON CONFLICT DO NOTHING` deles não nomeia o índice. Também libera o nome de um item excluído.
- **Alternativas**:
  - Coluna `normalized_name`, como nas marcas: os seeds de catálogo teriam de ser reescritos, ou seria preciso um gatilho no banco com remoção de acento.
  - Collation não determinística: o projeto usa `pt_br` determinística e trocá-la afeta a ordenação.

## R4. Excluir

- **Decisão**:
  - Exclusão lógica (`deleted_at`), permitida só quando nenhuma loja usa o item. "Usa" significa ter linha em `store_catalog_entries` ou ser o `demand_system_id` de alguma loja.
  - Se alguma loja usa, a resposta é 409 `IN_USE`, com o número de lojas em `details.stores`.
  - O histórico da loja guarda o nome como texto, então nada se perde.
- **Motivo**: segue a regra de exclusão lógica do `DATABASE.md`. A chave estrangeira com `ON DELETE RESTRICT` continua protegendo as respostas.
- **Alternativas**: apagar de verdade (exige permissão de DELETE para a aplicação e vai contra o padrão); proibir exclusão (as listas ficariam com itens criados por engano).

## R5. Desativado continua na loja que já usa

- **Decisão**:
  - A rota `GET /catalog` da página da loja passa a devolver também os itens desativados (com `active: false`). A tela mostra um item desativado só se a loja já o usa, com a marca "desativado" e sem permitir marcar.
  - Nas gravações da loja, a regra de "item ativo" vira "item ativo **ou** já usado por esta loja":
    - `ensureKind` (serviços, boas práticas, PBMs): aceita ids desativados que já estavam marcados e recusa os que entram agora, com 400 `CATALOG_ITEM_INACTIVE` (código próprio, para a tela mostrar a mensagem).
    - Estratégias: mesma regra.
    - Mobiliário: item desativado com quantidade 0 não pode receber quantidade; com quantidade maior que 0 pode ser mudado, inclusive para 0.
    - Ferramentas e canais: só a resposta que já existe pode ser editada ou removida.
    - Sistema utilizado: o atual continua valendo mesmo desativado; escolher outro exige um ativo.
- **Motivo**: hoje toda gravação exige `active: true`. Desativar um item usado pela loja travaria a edição da página inteira daquela seção.
- **Alternativas**: apagar as respostas ao desativar (perde dado, viola FR-051); não deixar desativar item em uso (as listas nunca encolhem).

## R6. Ordem

- **Decisão**: botões subir e descer por item. A rota `POST /:id/move` troca o lugar com o vizinho mais próximo **da mesma situação** (ativo com ativo, desativado com desativado), que é o vizinho que aparece na tela com o filtro padrão. Os outros itens ficam onde estão. A troca é feita numa transação, e a lista é renumerada porque os seeds antigos podem ter ordens repetidas. Item novo entra com `max(sort) + 1`. Os botões somem enquanto há busca.
- **Motivo**: listas pequenas (até ~40 itens); subir e descer funciona no teclado e no celular sem biblioteca de arrastar.
- **Alternativas**: arrastar e soltar (biblioteca nova e acessibilidade mais difícil); campo numérico de ordem (confuso para quem não é técnico).

## R7. Gravação ao mesmo tempo

- **Decisão**: coluna `version`. Alterar, mover, mudar situação e excluir recebem a `version` lida; se não bater, a resposta é 409 `VERSION_CONFLICT`, igual à página da loja (`versionConflict`).
- **Motivo**: é o padrão que o projeto já usa.

## R8. Histórico

- **Decisão**:
  - O enum `audit_entity` ganha `CATALOG_ITEM`. Cada mudança grava um `audit_events` com `entity_type = CATALOG_ITEM`, `entity_id = id do item`, `action` (`CATALOG_ITEM_CREATED`, `_UPDATED`, `_MOVED`, `_DEACTIVATED`, `_REACTIVATED`, `_DELETED`) e `summary` com o antes e depois (ex.: `Nome: Aferição de Glicemia → Teste de glicemia`).
  - O histórico de uma lista lê os eventos de todos os itens daquele tipo, inclusive os excluídos.
- **Motivo**: reaproveita a auditoria do Backoffice, que é somente acréscimo (sem UPDATE para o usuário da aplicação), e o mesmo componente de tela (`AuditTrail`).
- **Alternativas**: tabela de histórico própria (duplica a auditoria).

## R9. Quem acessa

- **Decisão**:
  - Rotas em `/api/v1/backoffice/settings/catalog`, todas com `requirePlatformRole('PLATFORM_ADMIN')`, inclusive as de leitura. O analista recebe 403 e o grupo nem entra no prefixo do Backoffice.
  - No banco, `catalog_items` ganha RLS: leitura para todos, e inclusão e alteração só com `app.actor_kind = 'platform'`.
  - Na tela, o item de menu e as rotas `/configuracoes` só aparecem para o administrador. Para os outros papéis aparece "Você não tem acesso a esta área".
- **Motivo**: a spec pede que nem a leitura seja aberta ao analista (FR-002). O RLS impede o grupo de gravar nas listas mesmo por um caminho esquecido.

## R10. Galeria de ícones

- **Decisão**:
  - Um registro fixo no front, `lib/furniture-icons.ts`, com cerca de 40 ícones do Lucide (a biblioteca que o Backoffice já usa). Cada entrada tem chave estável em kebab-case, componente, rótulo em português, grupo e palavras de busca.
  - O banco guarda só a chave. Chave desconhecida ou vazia mostra o ícone padrão (`package`).
  - A busca ignora acento e maiúscula.
  - A API valida a chave contra uma lista de chaves igual à da tela. Os containers da API e da tela não enxergam a pasta um do outro, por isso quem confere que as duas listas são iguais é o `scripts/check-repo.sh` (roda na CI).
- **Motivo**: nenhuma dependência nova, visual igual ao resto e escolha simples.
- **Alternativas**: todos os ~1.500 ícones do Lucide (difícil de escolher, pacote maior); enviar imagem própria (armazenamento, tamanho e moderação; fora do escopo).

## R11. Dados que já existem

- **Decisão**:
  - A migration aplica estas regras aos itens que já existem:
    - `self_service = true` para mobiliário de tipo `gondola` e `expositor`;
    - `used_by_scale = true` e corte do sufixo " · usada no módulo Escala" da descrição, nas estratégias;
    - ícone inicial por tipo de mobiliário.
  - Um seed novo (`20261101120000_configuracoes_atributos.sql`) aplica as mesmas regras por id, de forma idempotente, com o ícone específico de cada um dos 12 itens.
- **Motivo**: num banco novo, os seeds rodam depois das migrations. Sem o seed, os itens de exemplo ficariam sem ícone.

## R12. Testes

- **Vitest (regras puras)**:
  - esquema por lista (campos aceitos e obrigatórios);
  - cálculo da troca de ordem;
  - regra "pode manter item desativado";
  - montagem do resumo do histórico (antes e depois);
  - busca da galeria sem acento;
  - padrão de autosserviço pelo tipo.
- **Supertest (integração)**:
  - CRUD do administrador;
  - 403 para o analista e ausência de acesso para o grupo;
  - nome repetido com acento diferente (409);
  - exclusão de item em uso (409) e sem uso (some da página da loja);
  - conflito de versão (409);
  - loja mantém item desativado e não consegue marcá-lo de novo;
  - etiqueta do Escala vinda de `usedByScale`;
  - histórico com um evento por ação.
