# Como conferir — Perfil do funcionário e acesso aos sistemas

## Preparar

1. Subir o ambiente: `docker compose up -d --build --wait`. A migration nova e o seed rodam sozinhos quando a API sobe.
2. Abrir http://localhost:3000 como **Administrador**, pelo seletor de papel do topo.

## Roteiro na tela

1. **Dados que já existiam**:
   - Abrir Funcionários: a coluna "Acessos" mostra "Backoffice · Administrador" ou "Backoffice · Analista" para quem já tinha papel.
   - Os indicadores continuam com os mesmos números.
2. **Perfil, aba Dados gerais (US1)**:
   - Abrir um funcionário: aparecem Voltar, a inicial, o nome, a ocupação, "Colaborador Farmarcas", a situação e as duas abas.
   - Clicar em "Editar", trocar o celular, escolher a ocupação e salvar. As duas mudanças aparecem no histórico.
   - Tentar um celular com 10 dígitos: o campo recusa.
3. **Configurações**:
   - A tela mostra a seção "Pessoas da Farmarcas", com Departamentos (6 itens) e Ocupações.
   - Incluir o departamento "Capacitação e Desenvolvimento". Ele aparece para escolha no perfil.
4. **Sistemas e acesso (US2)**:
   - Ligar o Gestão 360 como Analista e trocar o Backoffice para Gestor. Os dois acessos aparecem na aba, na lista e no histórico.
   - Tirar o acesso ao Gestão 360.
   - Tentar rebaixar o único administrador: aparece a mensagem "O Backoffice precisa ter pelo menos um administrador".
5. **Desligar**: desligar uma pessoa com acesso faz a aba mostrar os acessos encerrados. Ao religar, a pessoa volta sem acesso.
6. **Gestor (US3)**:
   - Trocar o seletor para **Gestor**.
   - Editar um grupo, definir um Anjo, corrigir um dado de uma loja (com motivo) e cadastrar um parceiro. Tudo funciona.
   - Abrir um funcionário: não aparecem "Editar" nem as chaves de acesso.
   - O menu não mostra Configurações, e abrir `/configuracoes` mostra "Você não tem acesso a esta área".
7. **Analista**: trocar o seletor para Analista. Tudo fica só leitura, como antes.

## Testes automáticos

```bash
docker compose exec -T api sh -c 'npm run lint && npx tsc --noEmit && npx vitest run && npm run test:integration'
docker compose exec -T web sh -c 'npm run lint && npx tsc --noEmit && npx vitest run'
sh scripts/sync-templates.sh && sh scripts/check-repo.sh
```
