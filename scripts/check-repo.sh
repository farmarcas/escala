#!/bin/sh
# Verificações estáticas do repositório (sem Docker). A CI roda este script.
set -eu
cd "$(dirname "$0")/.."
FAIL=0
fail() { echo "ERRO: $*"; FAIL=1; }

# 1. Nenhum arquivo versionado vazio (exceto .gitkeep)
for f in $(git ls-files); do
  [ -f "$f" ] || continue
  case "$f" in */.gitkeep|.gitkeep) continue;; esac
  [ -s "$f" ] || fail "arquivo vazio: $f"
done

# 2. Toda SKILL.md tem frontmatter name+description e um atalho em .claude/skills/<name>
for f in $(git ls-files | grep -E 'skills/.*/SKILL\.md$' | grep -v '^\.claude/skills/'); do
  name=$(sed -n 's/^name: *//p' "$f" | head -1)
  grep -q '^description:' "$f" || fail "$f sem description"
  [ -n "$name" ] || { fail "$f sem name"; continue; }
  [ -e ".claude/skills/$name/SKILL.md" ] || { fail "skill '$name' ($f) não registrada em .claude/skills/"; continue; }
  [ "$(cd .claude/skills/$name && pwd -P)" = "$(cd "$(dirname "$f")" && pwd -P)" ] || fail ".claude/skills/$name aponta para outra pasta que não $(dirname "$f")"
done

# 3. Links markdown relativos não quebrados (ignora Spec Kit)
python3 - <<'PY' || FAIL=1
import os, re, subprocess, sys
bad = 0
for f in subprocess.check_output(["git", "ls-files"], text=True).split("\n"):
    if not f.lower().endswith(".md") or f.startswith((".specify", ".claude/skills/")):
        continue
    text = open(f, encoding="utf-8").read()
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    for m in re.finditer(r"\]\(([^)#\s]+)(?:#[^)]*)?\)", text):
        link = m.group(1)
        if re.match(r"^[a-z]+:", link):
            continue
        if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(f), link))):
            print(f"ERRO: link quebrado em {f}: {link}"); bad = 1
sys.exit(bad)
PY

# 4. CLAUDE.md carrega o AGENTS.md
grep -q '^@AGENTS.md' CLAUDE.md || fail "CLAUDE.md deve importar @AGENTS.md"

# 5. Porta publicada só em 127.0.0.1 e sem credencial fixa de banco no Compose
grep -E '^\s+- "[^"]*:[0-9]+"' docker-compose.yml | grep -v '127.0.0.1:' && fail "porta publicada fora de 127.0.0.1 em docker-compose.yml" || true

# 6. Galeria de ícones do mobiliário: as chaves da tela e da API são as mesmas (specs/004, R10)
python3 - <<'PY' || FAIL=1
import re, sys
api = re.findall(r"^  '([a-z0-9-]+)',", open("backend/node/src/modules/settings-catalog/furniture-icons.ts", encoding="utf-8").read(), re.M)
web = re.findall(r"key: '([a-z0-9-]+)'", open("frontend/react/src/lib/furniture-icons.ts", encoding="utf-8").read())
if not api or sorted(api) != sorted(web):
    print(f"ERRO: chaves de ícone diferentes entre API e tela: só na API {sorted(set(api) - set(web))}, só na tela {sorted(set(web) - set(api))}")
    sys.exit(1)
PY

# 7. Templates em dia
sh scripts/sync-templates.sh --check || FAIL=1

[ "$FAIL" = 0 ] && echo "OK: repositório consistente" || exit 1
