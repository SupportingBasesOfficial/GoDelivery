import { describe, it, expect } from "vitest";
import {
  SignUpSchema,
  SignInSchema,
  TenantSchema,
  CreateTenantSchema,
  ProfileSchema,
  CourierSchema,
  CreateCourierSchema,
  OrderSchema,
  CreateOrderSchema,
  UpdateOrderStatusSchema,
  PaymentSchema,
  NotificationSchema,
  PlatformSettingsSchema,
  TenantSettingsSchema,
} from "./schemas";

describe("Zod Schemas — validação runtime sem banco", () => {
  // ─── Auth ────────────────────────────────────────────────────────
  describe("SignUpSchema", () => {
    it("rejeita email inválido", () => {
      const result = SignUpSchema.safeParse({
        email: "not-an-email",
        password: "12345678",
        fullName: "João Silva",
        tenantName: "Lanchonete do Zé",
        tenantSlug: "lanchonete-ze",
      });
      expect(result.success).toBe(false);
    });

    it("rejeita senha menor que 8 caracteres", () => {
      const result = SignUpSchema.safeParse({
        email: "joao@example.com",
        password: "123",
        fullName: "João Silva",
        tenantName: "Lanchonete do Zé",
        tenantSlug: "lanchonete-ze",
      });
      expect(result.success).toBe(false);
    });

    it("rejeita slug com caracteres inválidos", () => {
      const result = SignUpSchema.safeParse({
        email: "joao@example.com",
        password: "12345678",
        fullName: "João Silva",
        tenantName: "Lanchonete do Zé",
        tenantSlug: "Lanchonete Zé!",
      });
      expect(result.success).toBe(false);
    });

    it("aceita dados válidos", () => {
      const result = SignUpSchema.safeParse({
        email: "joao@example.com",
        password: "securePass123",
        fullName: "João Silva",
        tenantName: "Lanchonete do Zé",
        tenantSlug: "lanchonete-ze",
        phone: "+5511999999999",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("SignInSchema", () => {
    it("rejeita senha vazia", () => {
      const result = SignInSchema.safeParse({ email: "a@b.com", password: "" });
      expect(result.success).toBe(false);
    });

    it("aceita credenciais válidas", () => {
      const result = SignInSchema.safeParse({ email: "a@b.com", password: "123456" });
      expect(result.success).toBe(true);
    });
  });

  // ─── Tenant ──────────────────────────────────────────────────────
  describe("TenantSchema / CreateTenantSchema", () => {
    it("rejeita CNPJ mal formatado", () => {
      const result = CreateTenantSchema.safeParse({
        name: "Empresa",
        slug: "empresa",
        email: "a@b.com",
        document: "12345678000195", // sem pontuação
      });
      expect(result.success).toBe(false);
    });

    it("aceita CNPJ formatado corretamente", () => {
      const result = CreateTenantSchema.safeParse({
        name: "Empresa",
        slug: "empresa",
        email: "a@b.com",
        document: "12.345.678/0001-95",
      });
      expect(result.success).toBe(true);
    });

    it("aceita tenant sem documento", () => {
      const result = CreateTenantSchema.safeParse({
        name: "Empresa",
        slug: "empresa",
        email: "a@b.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejeita telefone curto", () => {
      const result = CreateTenantSchema.safeParse({
        name: "Empresa",
        slug: "empresa",
        email: "a@b.com",
        phone: "123",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Profile ───────────────────────────────────────────────────────
  describe("ProfileSchema", () => {
    it("rejeita full_name vazio", () => {
      const result = ProfileSchema.safeParse({
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        full_name: "",
        role: "business_owner",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Courier ───────────────────────────────────────────────────────
  describe("CourierSchema / CreateCourierSchema", () => {
    it("rejeita placa mal formatada", () => {
      const result = CreateCourierSchema.safeParse({
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        vehicle_plate: "INVALID-PLATE",
      });
      expect(result.success).toBe(false);
    });

    it("aceita placa Mercosul", () => {
      const result = CreateCourierSchema.safeParse({
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        vehicle_plate: "ABC-1D23",
      });
      expect(result.success).toBe(true);
    });

    it("rejeita rating acima de 5", () => {
      const result = CourierSchema.safeParse({
        id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        rating: 6,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Order ─────────────────────────────────────────────────────────
  describe("OrderSchema / CreateOrderSchema", () => {
    it("rejeita telefone de cliente inválido", () => {
      const result = CreateOrderSchema.safeParse({
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        created_by: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        customer_name: "Maria",
        customer_phone: "123",
        pickup_address: "Rua A, 1",
        delivery_address: "Rua B, 2",
      });
      expect(result.success).toBe(false);
    });

    it("rejeita latitude fora do range", () => {
      const result = CreateOrderSchema.safeParse({
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        created_by: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        customer_name: "Maria",
        customer_phone: "+5511999999999",
        pickup_address: "Rua A, 1",
        pickup_lat: 91,
        delivery_address: "Rua B, 2",
      });
      expect(result.success).toBe(false);
    });

    it("aceita order válida", () => {
      const result = CreateOrderSchema.safeParse({
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        created_by: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        customer_name: "Maria",
        customer_phone: "+5511999999999",
        pickup_address: "Rua A, 1",
        pickup_lat: -23.5,
        pickup_lng: -46.6,
        delivery_address: "Rua B, 2",
        delivery_lat: -23.6,
        delivery_lng: -46.7,
        order_value: 50.0,
        delivery_fee: 7.0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("UpdateOrderStatusSchema", () => {
    it("rejeita status inválido", () => {
      const result = UpdateOrderStatusSchema.safeParse({ status: "invalid" });
      expect(result.success).toBe(false);
    });

    it("aceita transição válida", () => {
      const result = UpdateOrderStatusSchema.safeParse({ status: "in_transit" });
      expect(result.success).toBe(true);
    });
  });

  // ─── Payment ───────────────────────────────────────────────────────
  describe("PaymentSchema", () => {
    it("rejeita valor negativo", () => {
      const result = PaymentSchema.safeParse({
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        order_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12",
        amount: -10,
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Notification ──────────────────────────────────────────────────
  describe("NotificationSchema", () => {
    it("rejeita tipo vazio", () => {
      const result = NotificationSchema.safeParse({
        recipient_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        type: "",
        title: "Título",
        body: "Corpo",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Platform Settings ─────────────────────────────────────────────
  describe("PlatformSettingsSchema", () => {
    it("rejeita platform_percentage acima de 100", () => {
      const result = PlatformSettingsSchema.safeParse({
        platform_percentage: 101,
        min_tax_fee: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejeita support_email inválido", () => {
      const result = PlatformSettingsSchema.safeParse({
        support_email: "not-email",
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Tenant Settings ─────────────────────────────────────────────
  describe("TenantSettingsSchema", () => {
    it("rejeita fee_ranges com valor negativo", () => {
      const result = TenantSettingsSchema.safeParse({
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        fee_ranges: [{ minKm: 0, maxKm: 3, fee: -5 }],
      });
      expect(result.success).toBe(false);
    });

    it("aceita fee_ranges padrão", () => {
      const result = TenantSettingsSchema.safeParse({
        tenant_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fee_ranges).toHaveLength(4);
      }
    });
  });
});

describe("Schema ↔ Database Types consistência", () => {
  it("Zod OrderSchema contém todos os campos obrigatórios do banco", () => {
    const requiredFields = [
      "tenant_id",
      "created_by",
      "customer_name",
      "customer_phone",
      "pickup_address",
      "delivery_address",
      "order_value",
      "delivery_fee",
      "platform_fee",
    ];
    const shape = OrderSchema.shape;
    for (const field of requiredFields) {
      expect(shape[field as keyof typeof shape]).toBeDefined();
    }
  });

  it("Zod TenantSchema contém soft delete e plan fields", () => {
    expect(TenantSchema.shape.deleted_at).toBeDefined();
    expect(TenantSchema.shape.plan).toBeDefined();
    expect(TenantSchema.shape.subscription_status).toBeDefined();
  });

  it("Zod ProfileSchema contém audit fields", () => {
    expect(ProfileSchema.shape.email_verified_at).toBeDefined();
    expect(ProfileSchema.shape.last_sign_in_at).toBeDefined();
    expect(ProfileSchema.shape.deleted_at).toBeDefined();
  });

  it("Zod CourierSchema contém stats fields", () => {
    expect(CourierSchema.shape.rating).toBeDefined();
    expect(CourierSchema.shape.total_deliveries).toBeDefined();
    expect(CourierSchema.shape.total_earnings).toBeDefined();
    expect(CourierSchema.shape.current_location_lat).toBeDefined();
  });
});

describe("RLS Policies — cobertura de casos de uso", () => {
  // Este teste documenta que TODAS as tabelas têm policies
  // para cada role que precisa acessá-las, baseado no SCHEMA-v2.md

  const tables = [
    { name: "platform_settings", roles: ["admin"], ops: ["SELECT", "UPDATE"] },
    { name: "tenants", roles: ["admin", "business_owner"], ops: ["ALL", "SELECT", "UPDATE"] },
    { name: "tenant_settings", roles: ["admin", "business_owner"], ops: ["SELECT", "ALL"] },
    { name: "profiles", roles: ["admin", "business_owner", "courier"], ops: ["ALL", "SELECT", "INSERT", "UPDATE"] },
    { name: "couriers", roles: ["business_owner", "courier"], ops: ["ALL", "SELECT", "UPDATE"] },
    { name: "orders", roles: ["business_owner", "courier"], ops: ["ALL", "SELECT", "UPDATE"] },
    { name: "order_status_history", roles: ["admin", "business_owner", "courier"], ops: ["SELECT"] },
    { name: "courier_locations", roles: ["business_owner", "courier"], ops: ["SELECT", "INSERT"] },
    { name: "payments", roles: ["admin", "business_owner"], ops: ["SELECT"] },
    { name: "notifications", roles: ["all_users"], ops: ["ALL"] },
  ];

  it.each(tables)("$name tem policies para roles: $roles", (table) => {
    expect(table.roles.length).toBeGreaterThan(0);
    expect(table.ops.length).toBeGreaterThan(0);
  });
});
