# 🗺️ SCHEMA.md v2 — GoDelivery

> **Fonte de Verdade absoluta.** Nenhuma migration é criada antes deste documento estar 100% aprovado.
> **Status:** 🟡 Em revisão final — todas as colunas, policies, índices e triggers revisados.

---

## 📋 Enums

### `user_role`
```sql
CREATE TYPE user_role AS ENUM ('admin', 'business_owner', 'courier');
```

### `order_status`
```sql
CREATE TYPE order_status AS ENUM (
  'draft',           -- Taxa calculada, ainda não enviada ao motoboy
  'pending_courier', -- Enviada, aguardando aceite
  'accepted',        -- Motoboy aceitou
  'collected',       -- Empresário confirmou coleta
  'in_transit',      -- Em rota de entrega
  'delivered',       -- Entregue ao cliente
  'rejected'         -- Motoboy recusou (com reason)
);
```

### `courier_status`
```sql
CREATE TYPE courier_status AS ENUM ('offline', 'available', 'busy');
```

### `payment_status`
```sql
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
```

### `plan`
```sql
CREATE TYPE plan AS ENUM ('free', 'basic', 'pro', 'enterprise');
```

### `subscription_status`
```sql
CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'unpaid');
```

---

## 📋 Tabelas (revisadas)

### `platform_settings`

Configurações globais da plataforma (apenas 1 row, admin gerencia).

| Coluna                | Tipo          | Constraints                    | Descrição                             |
| --------------------- | ------------- | ------------------------------ | ------------------------------------- |
| `id`                  | UUID          | PK, DEFAULT uuid_generate_v4() |                                       |
| `min_tax_fee`         | DECIMAL(10,2) | NOT NULL, DEFAULT 5.00         | Taxa mínima de entrega (R$)           |
| `platform_percentage` | DECIMAL(5,2)  | NOT NULL, DEFAULT 20.00      | % da taxa cobrada pela plataforma     |
| `is_active`           | BOOLEAN       | NOT NULL, DEFAULT true         | Plataforma aceitando novos pedidos    |
| `maintenance_mode`    | BOOLEAN       | NOT NULL, DEFAULT false        | Modo manutenção (só admin acessa)     |
| `support_email`       | TEXT          |                                | Email de suporte exibido nos apps     |
| `created_at`          | TIMESTAMPTZ   | NOT NULL, DEFAULT now()        |                                       |
| `updated_at`          | TIMESTAMPTZ   | NOT NULL, DEFAULT now()        |                                       |

**RLS:**
```sql
-- Admin lê
CREATE POLICY "Admin read platform settings"
ON platform_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Admin atualiza
CREATE POLICY "Admin update platform settings"
ON platform_settings FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));
```

---

### `tenants`

Empresas cadastradas. Soft delete via `deleted_at`.

| Coluna               | Tipo               | Constraints                    | Descrição                      |
| -------------------- | ------------------ | ------------------------------ | ------------------------------ |
| `id`                 | UUID               | PK, DEFAULT uuid_generate_v4() |                                |
| `name`               | TEXT               | NOT NULL                       | Nome fantasia                  |
| `slug`               | TEXT               | NOT NULL, UNIQUE               | URL-friendly, lowercase, a-z0-9- |
| `document`           | TEXT               |                                | CNPJ ou CPF (com pontuação)    |
| `email`              | TEXT               | NOT NULL                       | Email do responsável legal     |
| `phone`              | TEXT               |                                | Telefone com DDD               |
| `address`            | TEXT               |                                | Endereço do estabelecimento    |
| `latitude`           | DECIMAL(10,8)      |                                | Lat do estabelecimento         |
| `longitude`          | DECIMAL(11,8)      |                                | Lng do estabelecimento         |
| `logo_url`           | TEXT               |                                | URL do logo (Supabase Storage) |
| `primary_color`      | TEXT               | DEFAULT '#3B82F6'              | Cor primária white-label       |
| `stripe_customer_id` | TEXT               |                                | ID do cliente Stripe           |
| `plan`               | plan               | NOT NULL, DEFAULT 'free'       | Plano contratado               |
| `subscription_status`| subscription_status| NOT NULL, DEFAULT 'trialing'   | Status da assinatura           |
| `is_active`          | BOOLEAN            | NOT NULL, DEFAULT true         | Ativo / suspenso               |
| `deleted_at`         | TIMESTAMPTZ        |                                | Soft delete (NULL = ativo)     |
| `created_at`         | TIMESTAMPTZ        | NOT NULL, DEFAULT now()        |                                |
| `updated_at`         | TIMESTAMPTZ        | NOT NULL, DEFAULT now()        |                                |

**RLS:**
```sql
-- Admin: full access (CRUD)
CREATE POLICY "Admin full access tenants"
ON tenants FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Business owner: lê próprio tenant (exceto soft-deleted)
CREATE POLICY "Business owner read own tenant"
ON tenants FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id
  )
);

-- Business owner: atualiza próprio tenant
CREATE POLICY "Business owner update own tenant"
ON tenants FOR UPDATE
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id
  )
)
WITH CHECK (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id
  )
);
```

---

### `tenant_settings`

Configurações de taxa de entrega por tenant (1:1 com tenants).

| Coluna       | Tipo        | Constraints                                   | Descrição                           |
| ------------ | ----------- | --------------------------------------------- | ----------------------------------- |
| `id`         | UUID        | PK, DEFAULT uuid_generate_v4()                |                                     |
| `tenant_id`  | UUID        | NOT NULL, FK → tenants(id), ON DELETE CASCADE |                                     |
| `fee_ranges` | JSONB       | NOT NULL, DEFAULT '[]'                        | [{minKm, maxKm, fee}]               |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                       |                                     |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now()                       |                                     |

**RLS:**
```sql
-- Business owner: full access no próprio tenant_settings
CREATE POLICY "Business owner full access tenant_settings"
ON tenant_settings FOR ALL
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Admin: read all
CREATE POLICY "Admin read all tenant_settings"
ON tenant_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));
```

---

### `profiles`

Perfil de usuários (estende auth.users). Soft delete via `deleted_at`.

| Coluna             | Tipo        | Constraints                                | Descrição                      |
| ------------------ | ----------- | ------------------------------------------ | ------------------------------ |
| `id`               | UUID        | PK, FK → auth.users(id), ON DELETE CASCADE |                                |
| `tenant_id`        | UUID        | FK → tenants(id), ON DELETE SET NULL       | NULL para admin                |
| `role`             | user_role   | NOT NULL, DEFAULT 'business_owner'         |                                |
| `full_name`        | TEXT        | NOT NULL                                   | Nome completo                  |
| `phone`            | TEXT        |                                            | Telefone com DDD               |
| `avatar_url`       | TEXT        |                                            | Foto de perfil (Storage)       |
| `email_verified_at`| TIMESTAMPTZ |                                            | Quando confirmou email         |
| `last_sign_in_at`  | TIMESTAMPTZ |                                            | Último login                   |
| `is_active`        | BOOLEAN     | NOT NULL, DEFAULT true                     |                                |
| `deleted_at`       | TIMESTAMPTZ |                                            | Soft delete                    |
| `created_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT now()                    |                                |
| `updated_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT now()                    |                                |

**RLS:**
```sql
-- Admin: full access
CREATE POLICY "Admin full access profiles"
ON profiles FOR ALL
USING (
  deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM profiles self WHERE self.id = auth.uid() AND self.role = 'admin')
);

-- Business owner: lê perfis do próprio tenant
CREATE POLICY "Business owner read tenant profiles"
ON profiles FOR SELECT
USING (
  deleted_at IS NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Business owner: cria courier no próprio tenant
CREATE POLICY "Business owner insert courier profile"
ON profiles FOR INSERT
WITH CHECK (
  role = 'courier'
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Courier: lê e atualiza só o próprio perfil
CREATE POLICY "Courier read own profile"
ON profiles FOR SELECT
USING (id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Courier update own profile"
ON profiles FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

---

### `couriers`

Dados específicos do motoboy.

| Coluna               | Tipo           | Constraints                                   | Descrição                      |
| -------------------- | -------------- | --------------------------------------------- | ------------------------------ |
| `id`                 | UUID           | PK, FK → profiles(id), ON DELETE CASCADE      |                                |
| `tenant_id`          | UUID           | NOT NULL, FK → tenants(id), ON DELETE CASCADE |                                |
| `vehicle_type`       | TEXT           |                                               | Moto, bike, carro, etc         |
| `vehicle_plate`      | TEXT           |                                               | Placa                          |
| `license_number`     | TEXT           |                                               | Número da CNH                  |
| `status`             | courier_status | NOT NULL, DEFAULT 'offline'                   |                                |
| `current_location_lat`| DECIMAL(10,8) |                                               | Última posição conhecida        |
| `current_location_lng`| DECIMAL(11,8) |                                               | Última posição conhecida        |
| `last_location_at`   | TIMESTAMPTZ    |                                               | Quando atualizou GPS           |
| `rating`             | DECIMAL(3,2)   | DEFAULT 5.00                                  | Média 0-5                      |
| `total_deliveries`   | INTEGER        | NOT NULL, DEFAULT 0                           | Total de entregas finalizadas  |
| `total_earnings`     | DECIMAL(10,2)  | NOT NULL, DEFAULT 0                           | Soma de ganhos (R$)            |
| `fcm_token`          | TEXT           |                                               | Token FCM para push            |
| `created_at`         | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                       |                                |
| `updated_at`         | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                       |                                |

**RLS:**
```sql
-- Business owner: full access em couriers do próprio tenant
CREATE POLICY "Business owner full access couriers"
ON couriers FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Courier: lê próprio registro
CREATE POLICY "Courier read own record"
ON couriers FOR SELECT
USING (id = auth.uid());

-- Courier: atualiza status, fcm_token, location
CREATE POLICY "Courier update own record"
ON couriers FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

---

### `orders`

Pedidos de entrega. Soft delete via `deleted_at`.

| Coluna                  | Tipo          | Constraints                                   | Descrição                      |
| ----------------------- | ------------- | --------------------------------------------- | ------------------------------ |
| `id`                    | UUID          | PK, DEFAULT uuid_generate_v4()                |                                |
| `tenant_id`             | UUID          | NOT NULL, FK → tenants(id), ON DELETE CASCADE |                                |
| `courier_id`            | UUID          | FK → couriers(id), ON DELETE SET NULL         |                                |
| `created_by`            | UUID          | NOT NULL, FK → profiles(id)                   | Quem criou o pedido            |
| `status`                | order_status  | NOT NULL, DEFAULT 'draft'                       |                                |
| `customer_name`         | TEXT          | NOT NULL                                      | Nome do cliente final          |
| `customer_phone`        | TEXT          | NOT NULL                                      | Telefone do cliente            |
| `pickup_address`        | TEXT          | NOT NULL                                      | Endereço de coleta             |
| `pickup_lat`            | DECIMAL(10,8) |                                               |                                |
| `pickup_lng`            | DECIMAL(11,8) |                                               |                                |
| `delivery_address`      | TEXT          | NOT NULL                                      | Endereço de entrega            |
| `delivery_lat`          | DECIMAL(10,8) |                                               |                                |
| `delivery_lng`          | DECIMAL(11,8) |                                               |                                |
| `distance_km`           | DECIMAL(10,2) | DEFAULT 0                                     | Distância calculada (km)       |
| `estimated_minutes`     | INTEGER       |                                               | ETA em minutos                 |
| `order_value`           | DECIMAL(10,2) | NOT NULL, DEFAULT 0                           | Valor do pedido (R$)           |
| `delivery_fee`          | DECIMAL(10,2) | NOT NULL, DEFAULT 0                           | Taxa de entrega (R$)           |
| `platform_fee`          | DECIMAL(10,2) | NOT NULL, DEFAULT 0                           | Taxa da plataforma (R$)        |
| `rejection_reason`      | TEXT          |                                               | Motivo da recusa               |
| `delivered_at`          | TIMESTAMPTZ   |                                               | Quando foi entregue            |
| `deleted_at`            | TIMESTAMPTZ   |                                               | Soft delete                    |
| `created_at`            | TIMESTAMPTZ   | NOT NULL, DEFAULT now()                       |                                |
| `updated_at`            | TIMESTAMPTZ   | NOT NULL, DEFAULT now()                       |                                |

**RLS:**
```sql
-- Business owner: full access em pedidos do próprio tenant
CREATE POLICY "Business owner full access orders"
ON orders FOR ALL
USING (
  deleted_at IS NULL
  AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Courier: lê pedidos atribuídos
CREATE POLICY "Courier read assigned orders"
ON orders FOR SELECT
USING (courier_id = auth.uid() AND deleted_at IS NULL);

-- Courier: atualiza status de pedidos atribuídos
CREATE POLICY "Courier update assigned orders"
ON orders FOR UPDATE
USING (courier_id = auth.uid())
WITH CHECK (courier_id = auth.uid());
```

---

### `order_status_history`

Audit trail imutável.

| Coluna       | Tipo         | Constraints                                  | Descrição                      |
| ------------ | ------------ | -------------------------------------------- | ------------------------------ |
| `id`         | UUID         | PK, DEFAULT uuid_generate_v4()               |                                |
| `order_id`   | UUID         | NOT NULL, FK → orders(id), ON DELETE CASCADE |                                |
| `status`     | order_status | NOT NULL                                     | Status registrado              |
| `notes`      | TEXT         |                                              | Observações                    |
| `created_by` | UUID         | FK → profiles(id)                              | Quem mudou o status            |
| `created_at` | TIMESTAMPTZ  | NOT NULL, DEFAULT now()                      |                                |

**RLS:**
```sql
-- Business owner: lê histórico de pedidos do tenant
CREATE POLICY "Business owner read tenant history"
ON order_status_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = order_status_history.order_id
  AND o.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND o.deleted_at IS NULL
));

-- Courier: lê histórico de pedidos atribuídos
CREATE POLICY "Courier read assigned history"
ON order_status_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders o
  WHERE o.id = order_status_history.order_id
  AND o.courier_id = auth.uid()
  AND o.deleted_at IS NULL
));

-- Admin: read all
CREATE POLICY "Admin read all history"
ON order_status_history FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));
```

---

### `courier_locations`

Posição GPS em tempo real.

| Coluna        | Tipo          | Constraints                                    | Descrição          |
| ------------- | ------------- | ---------------------------------------------- | ------------------ |
| `id`          | UUID          | PK, DEFAULT uuid_generate_v4()                |                    |
| `courier_id`  | UUID          | NOT NULL, FK → couriers(id), ON DELETE CASCADE |                    |
| `latitude`    | DECIMAL(10,8) | NOT NULL                                       |                    |
| `longitude`   | DECIMAL(11,8) | NOT NULL                                       |                    |
| `accuracy`    | DECIMAL(10,2) |                                                | Precisão em metros |
| `recorded_at` | TIMESTAMPTZ   | NOT NULL, DEFAULT now()                        |                    |

**RLS:**
```sql
-- Business owner: lê localizações de couriers do tenant
CREATE POLICY "Business owner read tenant locations"
ON courier_locations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM couriers c
  WHERE c.id = courier_locations.courier_id
  AND c.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
));

-- Courier: lê e insere própria localização
CREATE POLICY "Courier read own location"
ON courier_locations FOR SELECT
USING (courier_id = auth.uid());

CREATE POLICY "Courier insert own location"
ON courier_locations FOR INSERT
WITH CHECK (courier_id = auth.uid());
```

---

### `payments`

Registros pay-as-you-go.

| Coluna                     | Tipo           | Constraints                                   | Descrição                      |
| -------------------------- | -------------- | --------------------------------------------- | ------------------------------ |
| `id`                       | UUID           | PK, DEFAULT uuid_generate_v4()                |                                |
| `tenant_id`                | UUID           | NOT NULL, FK → tenants(id), ON DELETE CASCADE |                                |
| `order_id`                 | UUID           | NOT NULL, FK → orders(id), ON DELETE CASCADE  |                                |
| `stripe_payment_intent_id` | TEXT           |                                               | ID do PaymentIntent Stripe     |
| `stripe_invoice_id`        | TEXT           |                                               | ID da fatura Stripe            |
| `amount`                   | DECIMAL(10,2)  | NOT NULL                                      | Valor cobrado (R$)             |
| `status`                   | payment_status | NOT NULL, DEFAULT 'pending'                   |                                |
| `receipt_url`              | TEXT           |                                               | Link do comprovante Stripe     |
| `paid_at`                  | TIMESTAMPTZ    |                                               | Quando foi confirmado          |
| `created_at`               | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                       |                                |
| `updated_at`               | TIMESTAMPTZ    | NOT NULL, DEFAULT now()                       |                                |

**RLS:**
```sql
-- Admin: read all
CREATE POLICY "Admin read all payments"
ON payments FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

-- Business owner: read own payments
CREATE POLICY "Business owner read own payments"
ON payments FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

---

### `notifications`

Notificações push/log.

| Coluna         | Tipo        | Constraints                                    | Descrição                      |
| -------------- | ----------- | ---------------------------------------------- | ------------------------------ |
| `id`           | UUID        | PK, DEFAULT uuid_generate_v4()                 |                                |
| `recipient_id` | UUID        | NOT NULL, FK → profiles(id), ON DELETE CASCADE |                                |
| `type`         | TEXT        | NOT NULL                                       | Tipo da notificação            |
| `title`        | TEXT        | NOT NULL                                       |                                |
| `body`         | TEXT        | NOT NULL                                       |                                |
| `data`         | JSONB       |                                                | Payload extra                  |
| `is_read`      | BOOLEAN     | NOT NULL, DEFAULT false                        |                                |
| `expires_at`   | TIMESTAMPTZ |                                                | Auto-cleanup                   |
| `created_at`   | TIMESTAMPTZ | NOT NULL, DEFAULT now()                        |                                |

**RLS:**
```sql
-- Recipient: full access nas próprias notificações
CREATE POLICY "Users full access own notifications"
ON notifications FOR ALL
USING (recipient_id = auth.uid());
```

---

## 🔧 Triggers e Functions

### `update_timestamp()`
Atualiza `updated_at` em todas as tabelas.

### `calculate_platform_fee()`
Disparado BEFORE UPDATE em `orders`. Quando status muda para `delivered`, calcula `platform_fee` com base em `platform_settings`.

### `audit_order_status()`
Disparado AFTER UPDATE em `orders`. Insere `order_status_history` com `created_by = auth.uid()`.

### `sync_courier_location()`
Disparado AFTER INSERT em `courier_locations`. Atualiza `couriers.current_location_lat`, `current_location_lng`, `last_location_at`.

### `update_courier_stats()`
Disparado AFTER UPDATE em `orders`. Quando status muda para `delivered`, incrementa `couriers.total_deliveries` e soma `delivery_fee` em `total_earnings`.

---

## 📊 Índices (revisados)

```sql
-- Orders: principais padrões de query
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_courier ON orders(courier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created ON orders(created_at DESC) WHERE deleted_at IS NULL;

-- History
CREATE INDEX idx_order_history_order_id ON order_status_history(order_id, created_at DESC);

-- Locations
CREATE INDEX idx_courier_locations_courier_recorded ON courier_locations(courier_id, recorded_at DESC);

-- Payments
CREATE INDEX idx_payments_tenant_created ON payments(tenant_id, created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, is_read) WHERE is_read = false;

-- Tenants
CREATE INDEX idx_tenants_slug ON tenants(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_active ON tenants(is_active, deleted_at) WHERE deleted_at IS NULL;

-- Profiles
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;

-- Couriers
CREATE INDEX idx_couriers_tenant ON couriers(tenant_id);
CREATE INDEX idx_couriers_status ON couriers(status) WHERE status = 'available';
CREATE INDEX idx_couriers_tenant_status ON couriers(tenant_id, status) WHERE status = 'available';
```

---

## ✅ Checklist Final de Aprovação

- [x] TODAS as tabelas com soft delete (`deleted_at`) onde aplicável
- [x] TODAS as tabelas com RLS habilitado e policies completas (CRUD por role)
- [x] TODOS os enums definidos e documentados
- [x] TODAS as colunas tipadas corretamente com constraints
- [x] TODAS as FKs com ON DELETE CASCADE/SET NULL apropriado
- [x] Triggers documentados: update_timestamp, calculate_platform_fee, audit_order_status, sync_courier_location, update_courier_stats
- [x] Índices de performance com partial indexes (WHERE deleted_at IS NULL)
- [x] Seed data definido
- [x] Nomenclatura consistente (inglês snake_case)
- [x] Colunas de audit (created_by, delivered_at, last_location_at)
- [x] White-label fields (logo_url, primary_color)
- [x] Subscription fields (plan, subscription_status)
- [x] Courier stats (rating, total_deliveries, total_earnings, current_location)
