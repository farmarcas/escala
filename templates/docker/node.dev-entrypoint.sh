#!/bin/sh
# Entrada do container de desenvolvimento da API.
# 1) Reinstala dependências só se package.json/package-lock.json mudaram
#    (o volume de node_modules não é atualizado pelo rebuild da imagem).
# 2) Gera o client do Prisma (o bind mount esconde o que foi gerado na imagem).
# 3) Aplica as migrations pendentes (com o dono do banco), prepara o usuário da
#    aplicação, carrega os dados de exemplo (idempotente) e inicia com hot reload.
set -e

STAMP=node_modules/.deps-hash
HASH=$(cat package.json package-lock.json | md5sum | cut -d' ' -f1)

if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$HASH" ]; then
  echo "Dependências mudaram: instalando..."
  npm ci
  echo "$HASH" > "$STAMP"
fi

npx prisma generate
npx prisma migrate deploy
npm run db:setup
npm run db:seed
exec npm run dev
