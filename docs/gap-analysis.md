# 🔍 GAP Analysis — GoDelivery

> Análise honesta do que falta para ser uma plataforma **enterprise/mega-tech** 100% completa.
> Data: 2026-06-23

---

## 📊 Resumo Executivo

| Categoria | Status | Nota |
|-----------|--------|------|
| **Arquitetura & Infra** | 🟡 Parcial | Monorepo ok, mas sem CI/CD, Docker, cache, filas |
| **Banco de Dados** | 🟡 Parcial | Schema completo, migrations criadas, **não aplicadas localmente** |
| **Segurança** | 🟡 Parcial | RLS policies existem, mas sem validação runtime, CSP, 2FA |
| **Web App** | 🟡 Parcial | CRUD básico funcional, mas sem polish UX, relatórios, upload |
| **Mobile App** | 🟠 Mínimo | Login + dashboard simples. Sem navegação, push, offline, mapas |
| **Pagamentos** | 🟡 Parcial | Stripe SetupIntent + PaymentIntent, mas sem checkout UI, invoices |
| **Testes** | 🔴 Crítico | 1 teste unitário. Zero testes de integração, E2E, mobile |
| **Observabilidade** | 🔴 Crítico | Sem Sentry, logs centralizados, métricas, uptime monitoring |
| **DevOps / Deploy** | 🔴 Crítico | Sem CI/CD, sem deploy automatizado, sem ambientes |

---

## 1. 🔴 Critical (Impeditivo para produção)

### 1.1 Testes Automatizados
- **Falta:** Testes unitários para todas as server actions (auth, orders, settings, stripe, admin)
- **Falta:** Testes de integração com Supabase (supabase-test-cli / supabase-js mock)
- **Falta:** Testes E2E (Playwright) para fluxo completo: cadastro → login → criar pedido → pagamento
- **Falta:** Testes no mobile (Jest + React Native Testing Library)
- **Impacto:** Qualquer refatoração pode quebrar funcionalidades silenciosamente

### 1.2 CI/CD Pipeline
- **Falta:** GitHub Actions para:
  - Type-check (`tsc --noEmit`) em PR
  - Lint + Prettier em PR
  - Testes em PR
  - Build e deploy da web (Vercel)
  - Build do mobile (EAS)
  - Aplicação de migrations em staging/prod
- **Impacto:** Deploy manual = erro humano inevitável

### 1.3 Input Validation & Segurança Runtime
- **Falta:** Zod schemas em **todas** as server actions para validação runtime
  - `auth.ts`: validação de email, password strength, slug format
  - `orders.ts`: validação de telefone, endereço, valores positivos
  - `stripe.ts`: validação de IDs, amounts
- **Falta:** Sanitização de inputs (XSS prevention)
- **Falta:** CSRF tokens nas server actions (Next.js 15 tem proteção implícita, mas verificar)
- **Impacto:** SQL injection via Supabase ainda é possível se dados não sanitizados chegarem em raw queries

### 1.4 Migrations Aplicadas & Tipos TypeScript
- **Falta:** Aplicar migrations no Supabase local/remoto
- **Falta:** Sincronizar `database.types.ts` automaticamente (script `sync-db.ps1` depende de Docker)
- **Impacto:** `@ts-nocheck` em 6 arquivos = desenvolvimento sem type safety real no DB

### 1.5 Error Handling Global
- **Falta:** Error Boundaries no React (web e mobile)
- **Falta:** Global error handler para server actions (catch unhandled, log, notify)
- **Falta:** Retry logic com exponential backoff em chamadas Supabase
- **Impacto:** Usuário vê tela em branco ou crasha sem mensagem

---

## 2. 🟠 High (Necessário para MVP confiável)

### 2.1 Web App — Features Ausentes
- **Recuperação de senha** (forgot password flow)
- **Confirmação de email** (Supabase tem, mas precisa de tela)
- **Cadastro de motoboys** pelo empresário (tela + server action)
- **Atribuição manual de motoboy ao pedido** (dispatch não atribui, só muda status)
- **Upload de documentos** (CNH, comprovante de entrega, logo da empresa)
- **Relatórios / Analytics** (gráficos de pedidos, receita, couriers)
- **Exportação CSV/PDF** de pedidos e pagamentos
- **Onboarding wizard** para novos empresários
- **Perfil do usuário** (editar dados, trocar senha)

### 2.2 Mobile App — Reescrever com Navegação
- **Falta:** React Navigation (expo-router ou React Navigation)
- **Falta:** Tela de pedidos disponíveis (para aceitar)
- **Falta:** Push notifications (Expo Notifications + FCM)
- **Falta:** Background location tracking real (agora é foreground only)
- **Falta:** Offline mode (SQLite + sync quando online)
- **Falta:** Comprovante de entrega (câmera → upload foto)
- **Falta:** Integração com Google Maps / Waze para navegação
- **Falta:** Tela de histórico de entregas e ganhos

### 2.3 Realtime & Notificações
- **Falta:** Supabase Realtime para pedidos (business owner vê pedido atualizado sem refresh)
- **Falta:** Push notifications quando:
  - Pedido é aceito por motoboy
  - Pedido muda para "collected", "in_transit", "delivered"
  - Falha no pagamento

### 2.4 Background Jobs & Filas
- **Falta:** Fila para processamento assíncrono de:
  - Cobrança Stripe após entrega (hoje é síncrono na server action)
  - Envio de notificações push
  - Geração de relatórios
  - Cleanup de dados antigos (GDPR/LGPD)
- **Tecnologia:** BullMQ (Redis) ou Supabase Edge Functions + cron

### 2.5 Cache & Performance
- **Falta:** Redis para cache de:
  - Configurações do tenant
  - Lista de pedidos (TTL curto)
  - Sessões
- **Falta:** Next.js ISR para páginas públicas
- **Falta:** Connection pooling no Supabase (PgBouncer em escala)

### 2.6 Multi-Tenancy Avançado
- **Falta:** Subdomínios (`empresa.godelivery.com`) ou path-based routing
- **Falta:** Isolamento completo: middleware verifica `tenant_id` em toda request
- **Falta:** Tenant onboarding com slug único e validação

---

## 3. 🟡 Medium (Polish & Enterprise)

### 3.1 Segurança Enterprise
- **2FA/MFA** (TOTP via Supabase ou Twilio)
- **Password policy** (mínimo 8 chars, complexidade)
- **Session timeout** e revoke em todas as sessões
- **CSP headers** (`Content-Security-Policy` no Next.js config)
- **Rate limiting por IP** (hoje é só por email; falta proteção contra IP flooding)
- **Audit logging completo**: quem criou/editou/deletou o quê, quando, de onde (IP)
- **Honeypot** em forms contra bots

### 3.2 Observabilidade
- **Error tracking:** Sentry (web + mobile)
- **Analytics:** PostHog ou Mixpanel (funnels, cohorts)
- **Performance:** Web Vitals (Next.js built-in) + React Native performance monitor
- **Uptime:** UptimeRobot ou Pingdom
- **Logs:** Datadog / Logtail / Loki
- **Dashboard:** Grafana com métricas de negócio (pedidos/hora, taxa de cancelamento, etc.)

### 3.3 UX/UI Polish
- **Loading states e skeletons** em todas as telas
- **Toast notifications** (sonner ou react-hot-toast)
- **Empty states** ilustrados em todas as listas
- **Modal confirmations** para ações destrutivas (cancelar pedido, deletar)
- **Dark mode**
- **Acessibilidade:** WCAG AA (contraste, ARIA labels, keyboard nav)
- **Responsividade:** mobile-first no web (hoje o web é desktop-only)
- **Design system:** Storybook para componentes compartilhados

### 3.4 Pagamentos Avançados
- **Stripe Checkout UI** (Stripe Elements para capturar cartão no frontend)
- **Invoices/PDF** gerados automaticamente
- **Faturamento mensal** (assinatura) além do pay-as-you-go
- **Coupons e descontos**
- **Tax calculation engine** (calcular taxa de entrega automaticamente por distância)
- **Revenue dashboard** no admin

### 3.5 Legal & Compliance
- **LGPD/GDPR:**
  - Consentimento explícito no cadastro
  - Tela de privacidade e termos de uso
  - Exportação/deleção de dados pessoais (data portability)
  - Retenção automática de dados (anonymize após X anos)
- **Cookie consent banner**
- **DMCA / termos de serviço**

---

## 4. 🟢 Low (Nice to have / Escalar)

### 4.1 Infraestrutura Avançada
- **Kubernetes** (EKS / GKE) para escalar além de serverless
- **CDN** (CloudFront / Cloudflare) para assets
- **Edge Functions** (Supabase Edge Functions ou Cloudflare Workers)
- **Multi-region** (Supabase read replicas)
- **Database sharding** (se milhões de tenants)

### 4.2 Features Avançadas
- **Roteamento otimizado** (algoritmo para atribuir o motoboy mais próximo)
- **Previsão de tempo de entrega** (ML com dados históricos)
- **Chat** entre empresário e motoboy (Supabase Realtime)
- **Avaliações** (cliente avalia entrega, motoboy avalia empresa)
- **Loyalty program** para motoboys
- **White-label** (customização de cores/logo por tenant)

### 4.3 Mobile Avançado
- **Biometria** (Face ID / Touch ID) para login
- **Deep links** (notificação abre tela específica)
- **Widgets** (Android/iOS home screen widgets)
- **Watch app** (Apple Watch / Wear OS para motoboys)
- **Background fetch** para sincronizar pedidos

---

## 🎯 Roadmap Recomendado

### Sprint 1 (Semana 1–2): Fundação
1. Aplicar migrations no Supabase local
2. Sincronizar `database.types.ts` (remover todos `@ts-nocheck`)
3. Adicionar Zod validation em **todas** as server actions
4. Criar GitHub Actions CI (type-check, lint, test)
5. Escrever testes unitários para auth + orders

### Sprint 2 (Semana 3–4): Testes & Deploy
1. Testes E2E com Playwright (fluxo completo de cadastro a pedido)
2. Deploy web na Vercel
3. Configurar Supabase projeto remoto (prod)
4. Adicionar Sentry para error tracking
5. Adicionar PostHog para analytics

### Sprint 3 (Semana 5–6): Mobile
1. Implementar React Navigation no mobile
2. Tela de pedidos disponíveis (aceitar/recusar)
3. Push notifications (Expo + FCM)
4. Background location tracking
5. Upload de comprovante (câmera → Supabase Storage)

### Sprint 4 (Semana 7–8): Polish
1. Realtime para pedidos (web)
2. Recuperação de senha + confirmação de email
3. Cadastro de motoboys pelo empresário
4. Relatórios e gráficos no dashboard
5. Dark mode + responsividade mobile web

### Sprint 5+ (Semana 9+): Enterprise
1. Background jobs (BullMQ/Redis)
2. 2FA/MFA
3. Advanced caching
4. GDPR/LGPD compliance tools
5. White-label customization

---

## 📁 Checklist Rápido

- [x] Monorepo scaffold
- [x] Schema de banco design-first
- [x] Migrations SQL versionadas
- [x] RLS policies escritas
- [x] Auth básico (cadastro, login, logout)
- [x] CRUD de pedidos
- [x] Configuração de taxas
- [x] Stripe integration básica
- [x] Painel de admin funcional
- [x] App mobile (Expo) estrutura básica
- [x] Rate limiting simples
- [ ] **Migrations aplicadas localmente**
- [ ] **Tipos TypeScript sincronizados com DB**
- [ ] **Zod validation em todas as actions**
- [ ] **Testes unitários (>80% coverage)**
- [ ] **Testes E2E (Playwright)**
- [ ] **CI/CD (GitHub Actions)**
- [ ] **Deploy automatizado (Vercel + EAS)**
- [ ] **Recuperação de senha**
- [ ] **Confirmação de email**
- [ ] **Push notifications**
- [ ] **Realtime (pedidos ao vivo)**
- [ ] **Background jobs/filas**
- [ ] **Error tracking (Sentry)**
- [ ] **Analytics (PostHog)**
- [ ] **Cache layer (Redis)**
- [ ] **CSP headers**
- [ ] **2FA/MFA**
- [ ] **Upload de arquivos (Storage)**
- [ ] **Mobile navigation + screens completas**
- [ ] **Offline mode mobile**
- [ ] **Mapas e navegação (mobile)**
- [ ] **Relatórios e dashboards**
- [ ] **GDPR/LGPD compliance**
- [ ] **Onboarding wizard**
- [ ] **Dark mode**
- [ ] **Design system (Storybook)**
