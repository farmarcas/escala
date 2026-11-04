# Contrato HTTP — Perfil do funcionário e acesso aos sistemas

Prefixo: `/api/v1/backoffice`.

Regras gerais:
- Erros seguem `{ error: { code, message, details } }`.
- Leitura: os três papéis da plataforma (Administrador, Gestor, Analista).
- Gravação em funcionários: só `PLATFORM_ADMIN`. Gestor e analista recebem 403.

## Funcionário

### `GET /employees/:id`

```json
{
  "id": "…",
  "name": "Adriana Oliveira",
  "email": "adriana.oliveira@farmarcas.com.br",
  "gender": "FEMALE",
  "mobile": "11960348829",
  "landline": null,
  "department": { "id": "…", "name": "Sucesso do associado", "active": true },
  "occupation": { "id": "…", "name": "Analista de relacionamento", "active": true },
  "status": "ACTIVE",
  "terminatedAt": null,
  "version": 3,
  "createdAt": "…",
  "accesses": [
    { "system": "BACKOFFICE", "role": "MANAGER", "grantedAt": "…", "grantedBy": "OP-02", "revokedAt": null }
  ],
  "portfolio": [{ "number": 417, "name": "Grupo Aurora Norte", "status": "ACTIVE", "storeCount": 12 }],
  "portfolioCount": 1
}
```

`accesses` traz os vigentes. Depois do desligamento, traz os encerrados no desligamento, com `revokedAt`.

### `POST /employees` e `PATCH /employees/:id`

```json
{ "name": "…", "email": "…", "gender": "FEMALE", "mobile": "(11) 96034-8829", "landline": "", "departmentId": "…", "occupationId": "…" }
```

- No `PATCH`, os campos são opcionais, com `version` obrigatório.
- `mobile`: obrigatório no `POST` e não pode ficar vazio no `PATCH`. São 11 dígitos com DDD.
- `landline`: opcional, 10 dígitos com DDD. Vazio vira nulo.
- `departmentId` e `occupationId`: o item tem de ser do tipo certo e não pode estar excluído. Item desativado só é aceito se for o valor atual da pessoa. Do contrário, a resposta é 400 `CATALOG_ITEM_INACTIVE`.
- Erros:
  - 409 `EMPLOYEE_EMAIL_TAKEN` (já existe);
  - 409 `VERSION_CONFLICT`;
  - 400 `VALIDATION_ERROR`.

### `POST /employees/:id/status`

Mesmo corpo de hoje (`{ action: "terminate" | "rehire", justification }`).
- Desligar encerra todos os acessos vigentes e registra `ACCESS_REVOKED_BY_TERMINATION`.
- Desligar o último administrador ativo do Backoffice responde 409 `LAST_ADMIN`.

### `GET /employees/options`

Para os três papéis. Traz os departamentos e as ocupações ativos, na ordem de Configurações, e as regras de acesso.

```json
{
  "departments": [{ "id": "…", "name": "Comercial" }],
  "occupations": [{ "id": "…", "name": "Analista" }],
  "systems": [
    { "system": "BACKOFFICE", "label": "Backoffice", "isLive": true, "description": "Cadastro de grupos, lojas, marcas, parceiros e funcionários" },
    { "system": "GESTAO_360", "label": "Gestão 360", "isLive": false, "description": "Chamados e planos de ação dos grupos" },
    { "system": "ESCALA", "label": "Escala", "isLive": false, "description": "Escala de horários das lojas" }
  ],
  "roles": [
    { "role": "ADMIN", "label": "Administrador", "rules": { "BACKOFFICE": ["…"], "default": ["…"] } },
    { "role": "MANAGER", "label": "Gestor", "rules": { "BACKOFFICE": ["…"], "default": ["…"] } },
    { "role": "ANALYST", "label": "Analista", "rules": { "BACKOFFICE": ["…"], "default": ["…"] } }
  ]
}
```

## Acesso

### `PUT /employees/:id/accesses/:system`

`:system` é um destes: `BACKOFFICE`, `GESTAO_360`, `ESCALA`.

```json
{ "role": "MANAGER" }
```

`{ "role": null }` tira o acesso.

- 200: devolve o funcionário (mesmo formato do `GET`).
- Papel igual ao vigente: não muda nada e responde 200.
- 409 `LAST_ADMIN`: tirar ou rebaixar o último administrador ativo do Backoffice.
- 409 `EMPLOYEE_TERMINATED`: dar acesso a funcionário desligado.
- 403: gestor ou analista.

## Lista

### `GET /employees`

- Sai o filtro `accessRole` e entra `access`. Ele aceita vários valores `SISTEMA:PAPEL` e o valor `NONE`. Exemplo: `?access=BACKOFFICE:ADMIN,GESTAO_360:ANALYST`.
- Sai o filtro `area` e entra `department`, com uma lista de ids.
- Cada linha traz `department`, `occupation` (nome) e `accesses` (`[{ system, role }]`).
- Os facets passam a ser `department`, `access` e `status`.
- `GET /employees/stats`: `admins` passa a contar quem tem acesso vigente `BACKOFFICE:ADMIN` e está ativo.
- `GET /employees/export`: as colunas Área, Cargo e Papel viram Departamento, Ocupação, Celular, Telefone fixo e Acessos (ex.: `Backoffice: Gestor; Gestão 360: Analista`).

## Configurações (spec 004)

- `GET /settings/catalog` ganha `section` em cada lista. As seções são `store` (as 8 listas atuais) e `people` (`departments` e `occupations`).
- Rotas novas: `/settings/catalog/departments` e `/settings/catalog/occupations`, com os mesmos comportamentos das outras listas. Os campos são só `name`.
- O campo `storesInUse` vira `inUse`. Ele conta lojas nas listas da loja e funcionários não excluídos nas listas de pessoas. Em `IN_USE`, `details` passa a ser `[{ "inUse": N }]`.

## Papel Gestor nas outras rotas

- `PLATFORM_MANAGER` passa a valer onde hoje só o administrador grava. São as rotas de marcas, grupos (inclusive Anjo, titularidade, Cartão Alelo e lote), lojas (etapa, bloqueio, lote) e parceiros, e as gravações da plataforma na página da loja.
- Dados pessoais do proprietário: o gestor recebe sem máscara, como o administrador.
- Continuam só do administrador: `/employees` (gravações e acessos) e `/settings/*`.
- `x-demo-role=manager` é a identidade de demonstração `OP-05` / `PLATFORM_MANAGER`.

## Página da loja

- `GET /catalog` traz só os 8 tipos da loja e nunca `DEPARTMENT` nem `OCCUPATION`.
- Bloco do Anjo: `jobTitle` traz o nome da ocupação e `phone` traz o celular, ou o fixo se não houver celular.
