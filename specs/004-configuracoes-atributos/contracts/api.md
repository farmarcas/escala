# Contrato HTTP — Configurações, etapa 1

Prefixo: `/api/v1/backoffice/settings/catalog`. Todas as rotas exigem `PLATFORM_ADMIN`, inclusive as de leitura.
- O analista recebe 403 `FORBIDDEN`.
- O grupo não entra no prefixo do Backoffice.
- Erros seguem o formato `{ error: { code, message, details } }`.

`:kind` é um destes valores: `furniture`, `services`, `demand-systems`, `practice-tools`, `pbms`, `strategies`, `external-tools`, `channels`. Qualquer outro valor devolve 404.

## `GET /`

Resumo das 8 listas para a tela Configurações.

```json
{ "data": [{ "kind": "furniture", "label": "Mobiliário", "active": 12, "inactive": 0 }] }
```

## `GET /:kind?status=active|inactive|all&q=`

- `status` é `active` por padrão.
- `q` busca em nome e em `groupLabel`, sem diferença de acento ou maiúscula.
- A resposta vem na ordem da lista.

```json
{
  "data": [
    {
      "id": "…",
      "name": "Gôndolas",
      "groupLabel": "gondola",
      "description": "Corredores de autosserviço",
      "negotiatedMonthlyCents": null,
      "icon": "shelving",
      "selfService": true,
      "usedByScale": false,
      "active": true,
      "position": 1,
      "storesInUse": 37,
      "version": 3,
      "updatedAt": "2026-11-01T12:00:00.000Z"
    }
  ],
  "meta": { "suggestions": ["ePharma", "Funcional"] }
}
```

`meta.suggestions` traz os valores distintos de `groupLabel` da lista: as operadoras, nos PBMs, e as categorias, nas Ferramentas externas. Nas outras listas vem vazio.

## `POST /:kind`

Corpo com os campos da lista (ver `data-model.md`, "Campos por lista"). Campo de outra lista é recusado.

```json
{ "name": "Expositor de vitaminas", "groupLabel": "expositor", "description": "Torre de suplementos", "icon": "display-stand", "selfService": true }
```

Respostas:
- 201 com o item criado (mesmo formato da lista). O item entra no fim da lista, ativo.
- 400 `VALIDATION_ERROR` para campo faltando, inválido ou de outra lista. Também vale para ícone fora da galeria.
- 409 `DUPLICATE_NAME` se a lista já tem esse nome (sem diferença de acento ou maiúscula). `details` é `[{ "existing": "Nome que já existe" }]`.

## `PATCH /:kind/:id`

```json
{ "version": 3, "name": "Gôndolas de autosserviço" }
```

Respostas:
- 200 com o item atualizado.
- 400, ou 409 `DUPLICATE_NAME`, nos mesmos casos do `POST`.
- 409 `VERSION_CONFLICT` se a versão não bate.
- 404 se o item não existe, foi excluído ou é de outra lista.

## `POST /:kind/:id/move`

```json
{ "version": 3, "direction": "up" }
```

Troca a posição com o vizinho mais próximo da mesma situação (ativo com ativo, desativado com desativado); os demais ficam onde estão. Responde 200 com a lista na nova ordem (mesmo formato do `GET /:kind?status=all`).
- 409 `VERSION_CONFLICT` se a versão não bate.
- Pedir para subir o primeiro ou descer o último não faz nada e responde 200.

## `POST /:kind/:id/status`

```json
{ "version": 3, "active": false }
```

Responde 200 com o item. Desativar não mexe nas respostas das lojas.

## `DELETE /:kind/:id?version=3`

- 204 quando dá certo.
- 409 `IN_USE` se alguma loja usa o item. `details` é `[{ "stores": N }]` e a mensagem é "Em uso por N lojas. Desative em vez de excluir."
- 409 `VERSION_CONFLICT` se a versão não bate.

## `GET /:kind/audit-events?page=1&pageSize=20`

Histórico de todos os itens da lista, inclusive os excluídos, do mais recente para o mais antigo. O formato é o mesmo de `/partners/:id/audit-events`.

```json
{ "data": [{ "id": "…", "at": "…", "action": "CATALOG_ITEM_UPDATED", "summary": "Serviços · Aferição de Glicemia: Nome: Aferição de Glicemia → Teste de glicemia", "actorSubject": "OP-02", "actorRole": "PLATFORM_ADMIN", "justification": null }], "meta": { "page": 1, "pageSize": 20, "total": 1 } }
```

## Mudanças na página da loja (`/api/v1/backoffice` e `/api/v1/tenant`)

### `GET /catalog`

Passa a trazer também os itens desativados, com campos novos. Os excluídos não aparecem.

```json
{ "id": "…", "kind": "FURNITURE", "name": "Gôndolas", "groupLabel": "gondola", "description": "…", "negotiatedMonthlyCents": null, "icon": "shelving", "selfService": true, "usedByScale": false, "active": true }
```

### Gravações da loja

Estas gravações seguem a regra "item ativo, ou já usado por esta loja" (research R5):
- serviços, boas práticas e PBMs;
- estratégias;
- mobiliário;
- ferramentas e canais;
- sistema utilizado.

Marcar agora um item desativado devolve 400 `CATALOG_ITEM_INACTIVE`, com a mensagem "Este item foi desativado pela Farmarcas".
