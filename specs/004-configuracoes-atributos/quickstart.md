# Como conferir — Configurações, etapa 1

## Preparar

1. Subir o ambiente: `docker compose up -d --build --wait`. Conferir com `docker compose ps` que os 3 serviços estão `healthy`.
2. A migration nova e o seed novo rodam sozinhos quando a API sobe. Para reaplicar, use `docker compose restart api`.
3. Abrir http://localhost:3000 com o papel **Administrador**, no seletor de papel do topo.

## Roteiro na tela

1. **Menu.** O item **Configurações** aparece no fim do menu. Ao trocar para **Analista**, o item some, e abrir `/configuracoes` mostra "Você não tem acesso a esta área".
2. **Resumo.** Configurações mostra as 8 listas com o número de itens ativos. Mobiliário mostra 12.
3. **Mobiliário com ícone (US1):**
   - Clicar em "Novo mobiliário". O formulário abre com o ícone padrão.
   - Escolher o tipo Expositor: "conta como autosserviço" vem marcado.
   - Abrir a galeria e buscar "geladeira": aparecem os ícones de refrigeração.
   - Escolher um ícone e conferir a prévia.
   - Salvar "Expositor de vitaminas". Ele aparece no fim da lista.
   - Abrir `/lojas/2`, aba Mobiliário. O item novo aparece com o ícone e a quantidade 0, e os 12 itens antigos aparecem com os ícones iniciais.
4. **Outras listas (US2):**
   - Em Serviços, incluir "vacinação" e depois "Vacinação". A segunda tentativa é recusada como nome repetido.
   - Subir "vacinação" até o topo. Em `/lojas/2`, aba Estratégias, o cartão Serviços mostra o item primeiro.
   - Em Estratégias, incluir "Farmácia 24 horas" marcada como usada no módulo Escala.
   - Como dono do grupo (`/grupo/lojas/2`), marcar a estratégia e salvar. A etiqueta "Usada no módulo Escala" aparece.
   - Em PBMs, digitar a operadora "eph": aparece a sugestão "ePharma".
5. **Desativar e excluir (US3):**
   - Desativar um PBM que a loja 2 usa. Em `/lojas/2`, o PBM continua com a marca "desativado", e o grupo consegue desmarcar.
   - Em outra loja, o PBM não aparece como opção.
   - Tentar excluir esse PBM: o sistema recusa, mostra "Em uso por N lojas" e oferece desativar.
   - Excluir "vacinação", que nenhuma loja marcou: o item some da lista e da página da loja.
6. **Histórico (US4).** Em Serviços → Histórico, aparecem a inclusão, a mudança de ordem e a exclusão, com OP-02 e a data.
7. **Gravação ao mesmo tempo.**
   - Abrir o mesmo item em duas abas.
   - Salvar uma alteração na primeira aba.
   - Salvar na segunda: aparece o aviso para recarregar.

## Testes automáticos

```bash
docker compose exec -T api sh -c 'npm run lint && npx tsc --noEmit && npx vitest run && npm run test:integration'
docker compose exec -T web sh -c 'npm run lint && npx tsc --noEmit && npx vitest run'
sh scripts/sync-templates.sh && sh scripts/check-repo.sh
```

Resultado esperado: tudo verde, incluindo os testes novos de acesso (analista recebe 403), de nome repetido, de item em uso, de conflito de versão e de item desativado mantido na loja.
