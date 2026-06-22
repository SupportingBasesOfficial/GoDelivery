#!/bin/bash
# Procura por .env.local ou .env
if [ -f apps/web/.env.local ]; then
  ENV_PATH="apps/web/.env.local"
elif [ -f apps/web/.env ]; then
  ENV_PATH="apps/web/.env"
else
  echo "❌ Nem .env.local nem .env encontrados em apps/web/"
  exit 1
fi

export $(grep -v '^#' "$ENV_PATH" | xargs)
pnpx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" > packages/supabase/src/database.types.ts
echo "✅ Tipos do Supabase sincronizados com sucesso!"
