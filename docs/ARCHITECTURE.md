🏗️ Arquitetura de Missão Crítica: Base Template MÁXIMA

Este documento detalha os pilares arquiteturais que permitem que este template escale do MVP (Vendedor de Brigadeiro) ao Enterprise (NASA/Supermercado Global) sem necessidade de refatoração estrutural.

1. O Princípio do DNA e do Cérebro
   A base é dividida em duas camadas de responsabilidade:

DNA (Código): O mínimo viável para execução. Se o desenvolvedor precisa deletar algo para começar, o DNA falhou.

Cérebro (Documentação/Guias): A inteligência para lidar com complexidade. A complexidade não é imposta, é disponibilizada sob demanda.

2. Camada de Dados: Resiliência e Agnosticismo
   Não consumimos o Supabase (ou qualquer DB) diretamente nos componentes.

2.1 Result Pattern (Tratamento de Erros de Elite)
Abstraímos falhas de rede e banco através do tipo Result<T, E>.

Por quê? Força o desenvolvedor a tratar o erro no momento da chamada, evitando telas brancas e comportamentos imprevisíveis.

Uso: const { data, error } = await supabase.getUser();

2.2 Camada de Adaptação (Anti-Lock-in)
O pacote @repo/supabase exporta Fábricas de Clients. Se houver necessidade de migrar para PostgreSQL puro, Oracle ou uma API de terceiros, a mudança ocorre estritamente dentro do pacote, mantendo o apps/web intacto.

3. Design System: Primitivos vs. Composição
   O pacote @repo/ui segue a filosofia de Componentes Atômicos.

Regra de Ouro: Componentes em @repo/ui devem ser "burros" e puros. Eles não possuem lógica de negócio, não fazem fetch de dados e não dependem de contextos do apps/.

Composição: A lógica de negócio reside no apps/, que compõe os primitivos do @repo/ui. Isso permite que o design system seja compartilhado entre um App de Vendas e um Painel Administrativo com necessidades visuais distintas.

4. Segurança e Isolamento (Multi-tenancy)
   Para escala Enterprise, o isolamento de dados é nativo via Row Level Security (RLS).

Escalabilidade: Toda query ao banco deve ser filtrada por user_id ou tenant_id no nível do banco (RLS), e não na aplicação. Isso garante que, mesmo com um bug no front-end, o dado de um cliente nunca vaze para outro.

5. DX (Developer Experience) e Rigor Técnico

Verificação de Build: O t3-env garante que o sistema falhe no build-time se faltarem variáveis de ambiente, nunca em runtime.

Contratos de Tipo: O database.types.ts é a única fonte de verdade. Alterações no banco geram erros de tipo imediatos no código, prevenindo bugs de integração.

🚀 Guia de Escala (The MEGA-TECH Path)

Como adicionar Internacionalização (i18n)?

Não instale libs pesadas de imediato. Use a estrutura de dictionaries nativa do Next.js App Router. Mova as traduções para um pacote @repo/i18n apenas quando houver mais de 3 apps consumindo os mesmos termos.

Como adicionar Observabilidade?

Integre o OpenTelemetry no pacote @repo/logger. No nível Enterprise, conecte os traces a ferramentas como Datadog ou New Relic sem alterar a sintaxe de log no apps/.

Como lidar com Processamento em Background?

Sistemas de missão crítica (ex: emissão de Nota Fiscal ou Manobra de Satélite) não rodam no request principal. Use o guia de Idempotência + Filas (Inngest/Upstash) para garantir que a falha de uma etapa não comprometa a transação financeira ou operacional.

# Guia de Arquitetura — Escala MEGA-TECH

> Este documento é o "manual do arquiteto". Ele não está no código porque nem todo projeto precisa.
> Leia quando seu projeto crescer além do MVP.

---

## Por Que as Coisas São Assim

### Packages separados em vez de pastas no app

O `@repo/supabase` existe como package porque:

- Se você adicionar `apps/admin`, ele importa o mesmo client tipado sem duplicar código.
- Se o banco mudar uma coluna, você ajusta em UM lugar (o package) — não em 50 arquivos.
- O package é o "amortecedor" entre o banco e os apps.

### Result Pattern em vez de try/catch

```typescript
type Result<T> = { data: T; error: null } | { data: null; error: AppError };
```

Isso força o dev a tratar erros. Sem isso, um `undefined` silencioso causa tela branca em produção.

### Env validation no build-time

Se `SUPABASE_URL` não estiver definida, o Next.js **nem sobe**. Isso evita 90% dos tickets de "funciona na minha máquina".

---

### Configurações pnpm e Gerenciamento de Dependências

**Por que `.npmrc` está vazio?**

O arquivo `.npmrc` na raiz do projeto está propositalmente vazio. Isso é uma decisão técnica deliberada para manter o template universal e seguro.

**Defaults do pnpm são otimizados para monorepos:**

- Estrutura estrita de `node_modules` (evita "phantom dependencies")
- Validação rigorosa de `peerDependencies`
- Workspace resolution automática via `pnpm-workspace.yaml`

**Por que NÃO usar `shamefully-hoist=true`?**

`shamefully-hoist` move dependências para o `node_modules` raiz, criando uma estrutura similar ao npm tradicional. Isso parece conveniente, mas compromete segurança:

**Problemas de `shamefully-hoist`:**

- Cria "phantom dependencies" — dependências que funcionam mas não estão declaradas no `package.json`
- Perde a garantia estrita de versões que o pnpm oferece
- Pode causar conflitos em monorepos grandes
- Em nível Enterprise (NASA), isso é inaceitável — você quer controle total sobre o que está instalado

**Quando usar `shamefully-hoist`:**
Apenas em edge cases específicos identificados pelo desenvolvedor:

- Ferramentas legadas que não funcionam com estrutura pnpm
- Problemas de compatibilidade específicos que não têm solução alternativa
- Adicione localmente no projeto quando identificar o problema, não no template

**Por que NÃO usar `auto-install-peers=true`?**

`auto-install-peers` instala automaticamente `peerDependencies`, o que parece conveniente mas compromete validação:

**Problemas de `auto-install-peers`:**

- Perde validação de peer dependencies
- Pode instalar versões incompatíveis
- Quebra o propósito estrito do pnpm
- Em nível Enterprise, você quer controle total sobre dependências

**Decisão do template:**
Mantenha defaults seguros do pnpm. Se um projeto específico precisar de configurações especiais, o desenvolvedor adiciona localmente após identificar o problema real.

---

### Configurações Turborepo

**Por que `turbo.json` é minimalista?**

O `turbo.json` atual define apenas as tarefas essenciais (`build`, `lint`, `check-types`, `dev`) com configurações básicas de cache e dependências. Isso é deliberado:

**Razões:**

- Cada projeto pode ter tarefas específicas (test, e2e, storybook, etc.)
- Cache e outputs são configurados por tarefa para evitar cache poisoning
- Configurações adicionais podem ser adicionadas quando necessário pelo projeto

**Otimização de Cache com Outputs:**

O cache do Turborepo está configurado com outputs vazios para `lint` e `check-types`, o que significa que o Turbo memoriza o sucesso da execução. Se o código não mudar, o check leva milissegundos. Para `build`, outputs específicos (`.next/**`, `dist/**`) são definidos para permitir cache inteligente de artefatos de build.

**Trade-off:**
Template minimalista vs configuração completa. A decisão é manter minimalista para não engessar projetos que não precisam de tarefas específicas.

---

### Configurações TypeScript

**Por que `tsconfig.json` herda de `@repo/typescript-config`?**

Centralização de configurações TypeScript garante consistência em todo o monorepo:

**Benefícios:**

- Alterações de configuração em um lugar afetam todos os packages
- Garante que todos os packages usam as mesmas regras estritas
- Facilita upgrade de versões do TypeScript

**Estrutura:**

- `base.json` — Configurações fundamentais (strict, moduleResolution, etc)
- `nextjs.json` — Extende `base.json` com configurações específicas do Next.js

**Trade-off:**
Centralização vs flexibilidade. A decisão é centralizar para garantir consistência, mas cada app pode sobrescrever configurações específicas em seu `tsconfig.json`.

---

### Configurações ESLint

**Por que ESLint usa Flat Config (`.mjs`) em vez de `.eslintrc`?**

ESLint Flat Config é o futuro do ESLint:

**Benefícios:**

- Sintaxe mais clara e programática
- Melhor performance em grandes monorepos
- Compatibilidade com ferramentas modernas

**Estrutura:**

- `@repo/eslint-config/base.mjs` — Configuração base para packages sem React/Next.js
- `@repo/eslint-config/next.mjs` — Configuração para apps Next.js

**Trade-off:**
Nova sintaxe vs compatibilidade legada. A decisão é usar Flat Config porque é o futuro e o template é para projetos modernos.

---

## Guias de Escala

### 1. Repository Pattern (Quando Precisar)

Se o projeto crescer e precisar abstrair o Supabase:

```typescript
// packages/supabase/src/repositories/user.repository.ts
import type { Result } from "../types";

export interface UserRepository {
  getById(id: string): Promise<Result<User>>;
  create(data: CreateUserDTO): Promise<Result<User>>;
}

// Implementação Supabase
export class SupabaseUserRepository implements UserRepository {
  constructor(private client: SupabaseClient) {}

  async getById(id: string): Promise<Result<User>> {
    const { data, error } = await this.client
      .from("users")
      .select()
      .eq("id", id)
      .single();
    if (error) return err(error.message);
    return ok(data);
  }
}
```

**Quando usar:** Quando houver mais de um data source, ou quando testes unitários exigirem mocks do banco.

**Quando NÃO usar:** No MVP. Chamadas diretas ao Supabase são perfeitamente válidas para projetos pequenos.

---

### 2. Multi-tenancy (SaaS)

Para isolar dados entre organizações:

```sql
-- Migration: add_tenant_isolation
ALTER TABLE sua_tabela ADD COLUMN org_id UUID REFERENCES orgs(id);

CREATE POLICY "Tenant isolation"
ON sua_tabela
USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));
```

O RLS do Supabase é nativo para isso. Não precisa de lógica no app — o banco garante isolamento.

---

### 3. Audit Logs (Rastreabilidade)

Para sistemas que exigem rastro imutável:

```sql
-- Migration: create_audit_logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger genérico
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

---

### 4. RBAC (Permissões por Role)

Para controle de acesso granular:

```sql
-- Enum de roles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'member', 'viewer');

-- Coluna na tabela de profiles
ALTER TABLE profiles ADD COLUMN role user_role DEFAULT 'member';

-- Política baseada em role
CREATE POLICY "Admins can see all"
ON sensitive_data
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

### 5. Internacionalização (i18n)

Para apps multi-idioma com Next.js:

```
apps/web/
├── messages/
│   ├── pt-BR.json
│   └── en.json
├── i18n/
│   ├── request.ts
│   └── routing.ts
└── middleware.ts  (adicionar locale detection)
```

Recomendação: Use `next-intl` para App Router. Ele suporta Server Components nativamente.

---

### 6. Background Jobs e Filas

Para processamento assíncrono:

**Opção A: Supabase Edge Functions + pg_net**

```sql
-- Dispara webhook após INSERT
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    'https://seu-app.com/api/webhooks/new-order',
    jsonb_build_object('order_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Opção B: Inngest (recomendado para complexidade)**

```typescript
// apps/web/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processOrder } from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processOrder],
});
```

---

### 7. Observabilidade (OpenTelemetry)

Para rastrear requests em produção:

```typescript
// instrumentation.ts (Next.js)
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const sdk = new NodeSDK({
      /* config */
    });
    sdk.start();
  }
}
```

Providers compatíveis: Vercel (built-in), Datadog, Grafana, Sentry.

---

### 8. Cache e Revalidação (Next.js)

Padrão de tags para evitar dados obsoletos:

```typescript
// Fetch com tag
const { data } = await supabase
  .from("products")
  .select()
  .then((res) => res);

// No Route Handler:
export async function GET() {
  return NextResponse.json(data, {
    headers: { "Cache-Tag": "products" },
  });
}

// Revalidar quando produto mudar:
import { revalidateTag } from "next/cache";
revalidateTag("products");
```

---

### 9. Edge-Runtime Checklist

Para garantir que o app rode na borda (Vercel Edge, Cloudflare):

- [ ] Nenhum package usa `fs`, `path`, ou APIs Node.js pesadas
- [ ] `@repo/supabase` usa apenas `fetch` internamente (já compatível)
- [ ] Middleware do Next.js já roda em Edge por padrão
- [ ] Evitar `crypto.randomUUID()` em Edge — use `uuid` do Supabase

---

### 10. Graceful Degradation

Estruture o app para funcionar "pela metade":

```
apps/web/app/
├── (core)/          # Funcionalidades essenciais (sempre online)
│   ├── dashboard/
│   └── settings/
└── (features)/      # Features adicionais (podem falhar sem derrubar o core)
    ├── analytics/
    └── recommendations/
```

Se o serviço de recomendações cair, o dashboard continua funcionando.

---

## Decisões Arquiteturais (ADRs)

| #   | Decisão                             | Razão                                                       |
| --- | ----------------------------------- | ----------------------------------------------------------- |
| 1   | Supabase em vez de Prisma           | Auth + Realtime + Storage integrados. Menos boilerplate.    |
| 2   | Tailwind v3 em vez de v4            | Estável, maduro, amplamente adotado. v4 ainda em beta.      |
| 3   | Result Pattern em vez de exceptions | Força tratamento de erro. Compatível com Server Components. |
| 4   | shadcn/ui em vez de MUI/Chakra      | Componentes copiáveis, sem lock-in. Usa Radix por baixo.    |
| 5   | Vitest em vez de Jest               | 10x mais rápido, ESM nativo, compatível com Turborepo.      |
| 6   | t3-env em vez de dotenv manual      | Validação em build-time. Type-safe.                         |

---

## Quando Este Template NÃO Serve

- **Apps estáticos puros** (use Astro ou 11ty)
- **APIs sem frontend** (use Hono ou Fastify direto)
- **Apps mobile-only** (use Expo com Supabase diretamente)
- **Sistemas legados** que exigem SQL Server/Oracle (mas o Repository Pattern ajuda na migração)
