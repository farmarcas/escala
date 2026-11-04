# Quickstart — validar a fase 2

Pré-requisito: ambiente no ar (`docker compose up -d --build --wait`). As migrations e os seeds da fase rodam na subida da API.

Testes automáticos:

```bash
docker compose exec -T api sh -c 'npx vitest run && npm run test:integration'
docker compose exec -T web sh -c 'npx tsc --noEmit && npx eslint .'
```

## Fatia 0 — Início

1. Abrir http://localhost:3000. A primeira tela é Início, e "Visão geral" aparece logo abaixo no menu.
2. Os estados com loja estão pintados, e os outros aparecem como "Sem presença".
3. Escolher "Grupos": as cores, as etiquetas, a legenda e a ordem da tabela mudam.
4. Clicar em "Sudeste": o mapa aproxima, e a tabela mostra só ES, MG, RJ e SP.
5. Clicar em SP:
   - o painel mostra lojas, grupos, proprietário, marcas, cidades e grupos principais;
   - "Ver lojas de SP" leva a `/lojas?uf=SP`, com o mesmo total de lojas.
6. Trocar para Analista: os mesmos números aparecem, sem nenhum nome de pessoa.
7. No celular (375 px), não há rolagem lateral, e o mapa vem antes dos cartões.

## Fatia 1 — Funcionários e Anjo

1. Abrir Funcionários e criar uma pessoa da área "Sucesso do associado".
2. No Grupo Aurora Norte, clicar em "Definir Anjo" e escolher essa pessoa:
   - o nome aparece no grupo, nas lojas e na página da loja;
   - a auditoria do grupo registra a troca.
3. Tentar desligar a pessoa: aparece a recusa "passe os grupos a outro Anjo antes".
4. Entrar como Proprietário do grupo: a página da loja mostra o Anjo, e nenhuma rota do grupo lista outros funcionários.

## Fatia 2 — Parceiros, etapa e bloqueio

1. Criar uma indústria com dois contatos e marcar um como principal. Filtrar por Distribuidores: ela some.
2. Na lista de Lojas, mudar a etapa de uma loja para Inaugurada: a data é pedida.
3. Bloquear uma loja com motivo e entrar como Proprietário do grupo:
   - a loja aparece com o selo "Bloqueada" e não abre;
   - pela API do grupo, a resposta é 403 `STORE_BLOCKED`.
4. Desbloquear a loja: ela volta a abrir.

## Fatia 3 — Titularidade, Alelo, lote e exportação

1. Transferir a titularidade de um grupo: a auditoria mostra "Titularidade transferida de F-… para F-…".
2. Cadastrar o Cartão Alelo. Como Analista, aparecem só o código do titular e "Pseudonimizado".
3. Marcar 3 lojas e bloquear em lote: a tela mostra "3 alteradas, 0 puladas".
4. Exportar a lista de lojas filtrada e abrir o arquivo numa planilha: os acentos estão certos e há uma coluna por campo.
