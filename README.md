# Base Template Universal

> Monorepo Turborepo + Next.js 15 + Supabase + TypeScript.  
> Do vendedor de brigadeiro ao sistema da NASA — mesma fundação.

---

## Stack

| Camada    | Tecnologia              | Papel                                         |
| --------- | ----------------------- | --------------------------------------------- |
| **Build** | Turborepo               | Orquestração de monorepo                      |
| **App**   | Next.js 15.3            | Framework React (App Router)                  |
| **UI**    | shadcn/ui + Tailwind v3 | Design system (Radix primitives)              |
| **Data**  | Supabase                | PostgreSQL + Auth + Storage + Realtime        |
| **Types** | TypeScript 5.9          | Tipagem end-to-end com tipos gerados do banco |
| **Test**  | Vitest                  | Test runner com cobertura V8                  |
| **DX**    | Husky + lint-staged     | Pre-commit guards                             |
| **CI**    | GitHub Actions          | lint → types → build → test                   |

---

## Protocolo de Boot

```powershell
# 1. Clone e instale
git clone <repo-url> && cd base-template
pnpm install

# 2. Suba o Supabase local (requer Docker)
npx supabase start

# 3. Configure variáveis de ambiente
cp apps/web/.env.example apps/web/.env
# Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

**Nota sobre arquivos de ambiente:**
- `.env.example` - Blueprint público, commitado no git (sem valores reais)
- `.env` - Arquivo de desenvolvimento local, **nunca commitado** (contém secrets reais)
- `.env.local` - Opcional para sobrescrever valores locais, **nunca commitado**
- Os scripts `sync-db` aceitam tanto `.env` quanto `.env.local`

# 4. Aplique migrations e sincronize tipos
npx supabase db reset
.\sync-db.ps1

# 5. Desenvolva
pnpm dev          # http://localhost:3000
```

---

## Estrutura do Projeto

```
base-template/
├── apps/
│   └── web/                        # Next.js App Router
│       ├── app/
│       │   ├── api/health/         # Health check endpoint
│       │   ├── layout.tsx          # Root layout
│       │   └── page.tsx            # Landing page
│       ├── env.ts                  # Validação de env (build-time)
│       ├── middleware.ts           # Auth session refresh
│       ├── postcss.config.mjs      # Tailwind config
│       ├── tsconfig.json           # TypeScript config
│       ├── next.config.mjs         # Next.js config
│       └── package.json            # Dependencies
│
├── packages/
│   ├── supabase/                   # @repo/supabase
│   │   └── src/
│   │       ├── client.ts           # createClient() — browser
│   │       ├── server.ts           # createClient() — server
│   │       ├── middleware.ts       # updateSession()
│   │       ├── types.ts            # Result<T>, ok(), err(), Database
│   │       └── database.types.ts   # Tipos gerados do banco
│   ├── ui/                         # @repo/ui (primitivos)
│   │   └── src/
│   │       └── lib/utils.ts        # cn() utility
│   ├── tailwind-config/            # @repo/tailwind-config (globals.css)
│   ├── typescript-config/          # TS configs
│   └── eslint-config/              # ESLint configs
│
├── supabase/
│   ├── migrations/                 # Migrations versionadas
│   └── SCHEMA.md                   # Documentação do banco
│
├── .github/workflows/ci.yml        # CI pipeline
├── vitest.config.ts                # Config global de testes
├── sync-db.ps1                     # Sync de tipos
└── docs/ARCHITECTURE.md            # Guias de escala (MEGA-TECH)
```

---

## Packages

### `@repo/supabase`

Client factories tipadas. Nunca importe `@supabase/ssr` diretamente nos apps.

```typescript
// Client Component
import { createClient } from "@repo/supabase/client";
const supabase = createClient();

// Server Component / Route Handler
import { createClient } from "@repo/supabase/server";
const supabase = await createClient();

// Result Pattern — sem undefined inesperado
import { ok, err, type Result } from "@repo/supabase/types";
async function getUser(id: string): Promise<Result<User>> {
  const { data, error } = await supabase
    .from("users")
    .select()
    .eq("id", id)
    .single();
  if (error) return err(error.message, error.code);
  return ok(data);
}
```

### `@repo/ui`

Utilitário de composição de classes (cn). Adicione componentes primitivos (Button, Card, Input) conforme necessário seguindo o padrão shadcn/ui.

```typescript
import { cn } from "@repo/ui/lib/utils";
```

### `@repo/tailwind-config`

Base CSS compartilhada. Cada app importa via postcss.config.mjs. Adicione tokens de design específicos do projeto ao instanciar.

---

## Fluxo de Desenvolvimento

### Criar uma tabela

```powershell
# 1. Gerar migration
npx supabase migration new create_minha_tabela

# 2. Editar (seguir protocolo do SCHEMA.md)
# 3. Aplicar
npx supabase db reset

# 4. Sync tipos
.\sync-db.ps1

# 5. Atualizar SCHEMA.md
```

### Adicionar componente UI

Adicione componentes primitivos (Button, Card, Input) em `packages/ui/src/` seguindo o padrão shadcn/ui quando necessário para o seu projeto. O template fornece apenas o utilitário `cn()` para composição de classes.

---

## Scripts

| Script                  | Descrição                                       |
| ----------------------- | ----------------------------------------------- |
| `pnpm dev`              | Dev server (todos os apps)                      |
| `pnpm build`            | Build de produção                               |
| `pnpm lint`             | ESLint em todo o monorepo                       |
| `pnpm check-types`      | Type-check em todos os packages                 |
| `pnpm test`             | Vitest em modo watch                            |
| `pnpm test:run`         | Vitest single run (CI)                          |
| `pnpm format`           | Prettier em tudo                                |
| `pnpm clean`            | Remove node_modules e builds de todo o monorepo |
| `pnpm sync-db:win`      | Gera tipos TypeScript do banco (Windows)        |
| `pnpm sync-db:unix`     | Gera tipos TypeScript do banco (Mac/Linux)      |
| `npx supabase start`    | Sobe Supabase local                             |
| `npx supabase db reset` | Reset + aplica migrations                       |

---

## Princípios

1. **YAGNI** — Se não serve ao brigadeiro E à NASA no dia 1, não entra no código.
2. **Migrations** — Zero SQL manual. Toda mudança via `supabase/migrations/`.
3. **RLS** — Toda tabela com Row Level Security. Sem exceção.
4. **Tipos** — `database.types.ts` é a fonte de verdade. `any` é proibido.
5. **Packages** — Código compartilhado vive em `packages/`, nunca duplicado em `apps/`.
6. **Env seguro** — Variáveis validadas no build. Se faltar, o app não sobe.

---

## Arquivos Deletáveis

Este template é projetado para ser agnóstico e anti-lock-in. Se você não usar certas tecnologias, pode deletar os arquivos correspondentes:

### Se não usar Supabase:

- Delete `apps/web/middleware.ts`
- Remova imports de `@repo/supabase` do seu código
- Delete o package `@repo/supabase` se não for usado em nenhum app

### Se não usar Tailwind:

- Delete `apps/web/postcss.config.mjs`
- Remova `@import "@repo/tailwind-config/globals.css"` do `app/layout.tsx`
- Delete o package `@repo/tailwind-config` se não for usado em nenhum app

### O que NÃO deletar (DNA mínimo):

- `apps/web/package.json` - Todo projeto precisa
- `apps/web/tsconfig.json` - Todo projeto TS precisa
- `apps/web/next.config.mjs` - Config básica do Next.js
- `apps/web/app/layout.tsx` - Next.js exige
- `apps/web/app/page.tsx` - Next.js exige
- `apps/web/env.ts` - Validação de env (universal)

---

## Documentação Complementar

- [`supabase/SCHEMA.md`](./supabase/SCHEMA.md) — Banco de dados e protocolo de tabelas
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — Guias de escala para projetos MEGA-TECH
- [`apps/web/.env.example`](./apps/web/.env.example) — Variáveis de ambiente necessárias

---

## FAQ / Troubleshooting

### ❓ Tipos Desatualizados do Supabase?

Certifique-se que o `SUPABASE_PROJECT_ID` está no `.env` e rode o script de sync:

- Windows: `pnpm sync-db:win`
- Mac/Linux: `pnpm sync-db:unix`

### ❓ Build falhando no CI?

Verifique se todas as envs do `env.ts` estão presentes nas variáveis do GitHub/Vercel. O t3-env trava o build se faltar algo.

### ❓ Conflito de Cache?

Rode `pnpm clean` para remover node_modules e builds de todo o monorepo.
