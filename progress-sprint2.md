# Sprint 2 — Testes & Deploy MEGA-TECH: Progresso

## Status: ✅ E2E CONCLUÍDO

### O que foi entregue nesta sessão

#### 1. Testes E2E com Playwright
- Instalado `@playwright/test` no app web
- Configurado `playwright.config.ts` com:
  - webServer automático (`pnpm dev`)
  - Chromium como navegador padrão
  - Trace em primeiro retry
  - Retries no CI
- Criados 3 arquivos de teste E2E:
  - `e2e/public-pages.spec.ts` — 5 testes (home, login, register, navegação)
  - `e2e/auth.spec.ts` — 4 testes (validação, redirecionamento, senhas)
  - `e2e/tracking.spec.ts` — 2 testes (tracking válido/inválido)
- **Total: 11/11 testes E2E passando**

#### 2. CI/CD Atualizado
- Adicionado job `e2e` no `.github/workflows/ci.yml`
- Instala Chromium no runner do GitHub Actions
- Roda `pnpm --filter web test:e2e` em paralelo com quality

#### 3. Configuração de Testes
- `vitest.config.ts` — excluída pasta `e2e/` para evitar conflito com Playwright
- `apps/web/package.json` — adicionado script `test:e2e`

### Checklist do Sprint 2

- [x] Testes E2E com Playwright (11 testes)
- [x] CI com job dedicado de E2E
- [x] Landing page real no web (conversão de visitantes)
- [x] Upload de comprovante de entrega (mobile + web + storage)
- [x] Sentry error tracking (web + mobile)
- [x] Mobile: tela de perfil com estatísticas
- [x] Web: filtros de busca e status em pedidos
- [x] Configuração Vercel deploy
- [x] `pnpm test:run` passando (131/131)
- [x] `pnpm --filter web test:e2e` passando (11/11)
- [x] Gráficos nos relatórios (recharts: pedidos/dia, receita/dia, status pizza, entregadores)
- [x] Rate limiting em actions críticas (auth, orders, couriers, stripe)
- [x] Acessibilidade completa (ARIA labels, focus-visible rings, skip link, aria-invalid, role=alert)
- [x] ETA no tracking público (Haversine + estimativa 25km/h)

### Entregas adicionais nesta sessão

#### Landing page real
- `@/apps/web/app/components/landing-page.tsx` — Hero, features, como funciona, CTA
- `@/apps/web/app/page.tsx` — Integração da landing page
- Testes E2E atualizados para refletir novo conteúdo

#### Upload de comprovante de entrega
- Migration: `20260625000001_add_delivery_proof.sql` — colunas `proof_image_url` e `proof_uploaded_at`
- Migration: `20260625000002_create_delivery_proofs_bucket.sql` — bucket `delivery-proofs` com RLS
- Mobile (`DashboardScreen.tsx`): botão "Enviar comprovante", preview da imagem, upload via `expo-image-picker`
- Web (`track/[id]/page.tsx`): exibição do comprovante na página de tracking
- Server action (`tracking.ts`): retorna `proofImageUrl` e `proofUploadedAt`
- `database.types.ts` sincronizado

#### Sentry (Observabilidade)
- Web: `@sentry/nextjs` configurado com `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `next.config.mjs` integrado com `withSentryConfig`
- Error Boundary (`error.tsx`) captura exceções no Sentry
- Mobile: `@sentry/react-native` + `src/lib/sentry.ts` + integração no `App.tsx`

#### Mobile: Tela de perfil
- `ProfileScreen.tsx` — dados pessoais, veículo, estatísticas (entregas, ganhos)
- Navegação simples entre Dashboard e Profile via estado
- Botão "Perfil" no header do Dashboard

#### Web: Filtros em pedidos
- `RealtimeOrders.tsx` — busca por cliente/telefone/endereço + filtro por status
- Contador "Mostrando X de Y pedidos"
- Botão "Limpar" para resetar filtros

#### Deploy
- `apps/web/vercel.json` — configuração de build para monorepo Turborepo

### Status final

| Verificação | Resultado |
|-------------|-----------|
| Build | ✅ Passando |
| Type-check | ✅ Passando |
| Unit tests | ✅ 131/131 |
| E2E tests | ✅ 11/11 |
| Lint | ✅ Passando |

### Enterprise-grade gaps fechados nesta sessão

#### Security & Hardening
- `middleware.ts` — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `app/not-found.tsx` — página 404 customizada com navegação
- `public/robots.txt` — permite indexação pública, bloqueia /dashboard/ e /api/
- `public/sitemap.xml` — SEO para páginas públicas
- `public/favicon.svg` + `public/manifest.json` — branding e PWA básico
- `app/api/health/route.ts` — health check para monitoramento (já existia)

#### Rate Limiting escalável (custo 0)
- `lib/rate-limit.ts` — TTL automático com cleanup de entradas expiradas a cada 60s
- Evita vazamento de memória em servidores de longa duração
- Pronto para substituir por Redis (Upstash gratuito) quando escalar horizontalmente

#### UX refinada
- `dashboard/loading.tsx` — skeleton para o painel principal
- `dashboard/orders/loading.tsx` — skeleton para lista de pedidos com filtros
- `dashboard/reports/loading.tsx` — skeleton para relatórios com KPIs e gráficos
- `layout.tsx` — metadata com favicon e manifest

### Próxima sessão

Projeto 100% enterprise-grade para single-node. Quando escalar:
1. Redis para rate limit (horizontal scaling)
2. Service Worker para PWA offline
3. CDN para assets estáticos (Cloudflare gratuito)
4. Log aggregation (Logtail/Logzio free tier)
