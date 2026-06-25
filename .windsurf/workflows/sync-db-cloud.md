---
description: Sincronizar types do banco Supabase Cloud (workflow produção)
---

## Pré-requisitos

- Supabase CLI instalado: `npm i -g supabase`
- Projeto linkado ao cloud: `npx supabase link --project-ref knetdzogemmoheqtittl`
- Credenciais no `apps/web/.env.local`

## Passos

// turbo
1. Verificar se projeto está linkado:
   ```powershell
   npx supabase status
   ```

// turbo
2. Verificar migrations pendentes:
   ```powershell
   npx supabase migration list
   ```

// turbo
3. Aplicar migrations no cloud (se houver pendentes):
   ```powershell
   npx supabase db push
   ```

// turbo
4. Sincronizar types TypeScript:
   ```powershell
   .\sync-db.ps1
   ```

// turbo
5. Validar types:
   ```powershell
   pnpm check-types
   ```

## Notas

- Nunca use `--local` — o workflow é 100% cloud
- O `sync-db.ps1` já aponta para `knetdzogemmoheqtittl`
- Se `migration list` mostrar divergências, resolva antes de push
