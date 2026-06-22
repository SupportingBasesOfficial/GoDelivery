# SETUP.md — Protocolo de Instanciação de Novo Projeto

> Execute este protocolo completo ao criar qualquer novo projeto a partir do base-template.
> Cada passo é obrigatório. Nenhum é opcional.

---

## Por que este protocolo existe

O base-template é DNA universal — mente limpa, sem projeto específico.
Este protocolo garante que cada projeto instanciado nasce com:

- A corrente de type-safety fechada (DB → tipos → services → UI)
- Contexto AI funcionando (`.windsurfrules` + `.cursorrules`)
- CI completo (lint → types → build → test)
- Documentação viva do banco (`supabase/SCHEMA.md`)
- Workflow de sync de tipos (`sync-db.ps1`)

Sem seguir este protocolo, o projeto nasce com pontas soltas estruturais.

---

## Checklist de Instanciação

### Passo 1 — Scaffold do repositório

```powershell
# Clone ou copie o base-template
git clone <base-template-url> <nome-do-projeto>
cd <nome-do-projeto>

# Reinicialize o git
Remove-Item -Recurse -Force .git
git init
git branch -m main
```

### Passo 2 — Identidade do projeto

Editar `package.json` raiz:

- [ ] `name`: `@[org]/[projeto]`
- [ ] `description`: descrição do projeto
- [ ] `author`: nome da organização
- [ ] `repository.url`: URL do repo GitHub

### Passo 3 — Criar `.windsurfrules` específico do projeto

Copiar o template abaixo e preencher os campos marcados com `[...]`:

```markdown
# [Nome do Projeto] — Diretrizes para IA

## Contexto deste Workspace

Instanciado do base-template em: E:\Projects_templates\base-template
Regras universais de stack: E:\Projects_templates\base-template\.windsurfrules

## Fontes de Conhecimento

- [caminho para docs institucionais do projeto]
- supabase/SCHEMA.md — estado atual do banco

## Regras Específicas deste Projeto

[adicionar aqui as regras específicas do projeto]

## Fontes de Verdade

- database.types.ts — gerado por .\sync-db.ps1 — nunca editar manualmente
- supabase/migrations/ — fonte de verdade do schema
- supabase/SCHEMA.md — documentação viva do banco
```

- [ ] `.windsurfrules` criado e preenchido
- [ ] `.cursorrules` criado (versão compacta do mesmo conteúdo)

### Passo 4 — Supabase e banco

```powershell
# Inicializar Supabase local
npx supabase init

# Atualizar project_id em supabase/config.toml
# project_id = "nome-do-projeto"
```

- [ ] `supabase/config.toml` com `project_id` correto
- [ ] `supabase/SCHEMA.md` criado (usar o scaffold do base-template)
- [ ] `sync-db.ps1` com caminhos corretos para o projeto

### Passo 5 — Variáveis de ambiente

- [ ] `apps/web/.env.example` com todas as variáveis necessárias
- [ ] `apps/admin/.env.example` com todas as variáveis (incluindo `SUPABASE_SERVICE_ROLE_KEY`) - se criar apps/admin
- [ ] Copiar `.env.example` para `.env` e preencher com valores locais

**Nota sobre arquivos de ambiente:**

- `.env.example` - Blueprint público, commitado no git (sem valores reais)
- `.env` - Arquivo de desenvolvimento local, **nunca commitado** (contém secrets reais)
- `.env.local` - Opcional para sobrescrever valores locais, **nunca commitado**
- Os scripts `sync-db.ps1` e `sync-db.sh` aceitam tanto `.env` quanto `.env.local`

### Passo 6 — CI

- [ ] `.github/workflows/ci.yml` com placeholder env vars para build
- [ ] `SKIP_ENV_VALIDATION=true` no step de types e build
- [ ] `concurrency` group configurado
- [ ] Node.js version alinhada com OPERATIONS.md do projeto

### Passo 7 — Primeira execução

```powershell
pnpm install
npx supabase start
pnpm test:run        # deve passar
pnpm check-types     # deve passar
pnpm lint            # deve passar
```

- [ ] Todos os três passando antes do primeiro commit

### Passo 8 — Primeiro commit

```bash
git add -A
git commit -m "chore: scaffold inicial do projeto — instanciado do base-template"
git remote add origin <url-do-repo>
git push -u origin main
```

- [ ] CI passando no GitHub após o push

---

## O que NÃO fazer

- Nunca iniciar desenvolvimento antes de todos os 8 passos estarem completos
- Nunca criar tabelas sem migration (`supabase migration new`)
- Nunca editar `database.types.ts` manualmente
- Nunca commitar sem `pnpm check-types && pnpm lint && pnpm test:run` passando
- Nunca contaminar o base-template com regras ou código específicos de projeto

---

## Referência Rápida pós-instanciação

| Ação                 | Comando                                           |
| -------------------- | ------------------------------------------------- |
| Dev                  | `pnpm dev`                                        |
| Build                | `pnpm build`                                      |
| Testes               | `pnpm test:run`                                   |
| Type check           | `pnpm check-types`                                |
| Nova migration       | `supabase migration new YYYYMMDDHHMMSS_descricao` |
| Sync tipos           | `.\sync-db.ps1` (após `supabase db reset`)        |
| Subir Supabase local | `npx supabase start`                              |
| Reset banco          | `npx supabase db reset`                           |
