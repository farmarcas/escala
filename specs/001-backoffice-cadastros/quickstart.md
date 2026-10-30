# Quickstart — validar o Backoffice

## Subir
1. `cp .env.example .env` (se ainda não existir).
2. `docker compose up -d --build --wait`. A API aplica as migrations ao iniciar.
3. Carregar os dados de exemplo: `docker compose exec api npm run db:seed`. É idempotente.
4. Abrir http://localhost:3000.

## Roteiro manual
1. **Marcas** (`/marcas`):
   - Adicionar "Marca Teste" e renomear.
   - Desativar: ela vira Histórica.
   - Excluir: dá certo porque tem 0 lojas. "Rede Aurora" não oferece Excluir.
2. **Grupos** (`/grupos`):
   - Novo grupo: recebe o próximo número.
   - Buscar por "Aurora", filtrar Suspensos e filtrar por UF "SP".
3. **Detalhe** (`/grupos/0417`):
   - Adicionar loja com marca ativa: aparece como "Pendente no grupo", e marcas e UFs se atualizam.
   - Tentar o mesmo CNPJ de novo: o erro aparece no campo.
4. **Ciclo de vida**:
   - Suspender com justificativa: o status muda e a aba Auditoria mostra o evento com a justificativa.
   - Restaurar.
5. **Papel**:
   - Trocar para Analista: os botões de escrita somem, o chip "Somente leitura" aparece e o proprietário fica como `F-…`.
   - Recarregar `/grupos/0417`: continua mascarado.
6. **Persistência**: `docker compose restart api web`. Os dados continuam lá.

## Automático
- API: `docker compose exec api npm run lint && docker compose exec api npm test && docker compose exec api npm run test:integration`.
  - Os testes de isolamento ficam em `*.isolation.integration.test.ts`: tenant A × tenant B, rota do backoffice com identidade de tenant e analista sem PII.
- Tela: `scripts/validar-frontend.sh`.
