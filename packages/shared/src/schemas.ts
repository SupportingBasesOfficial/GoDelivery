/**
 * Zod Schemas — Contratos de validação para TODAS as entidades GoDelivery.
 * Fonte de verdade para validação runtime (server actions, forms, API).
 */
import { z } from "zod";

// ─── Helpers reutilizáveis ──────────────────────────────────────────

const uuid = z.string().uuid();
const timestamp = z.string().datetime().optional();
const nullableTimestamp = z.string().datetime().nullable().optional();
const money = z.number().min(0).multipleOf(0.01);
const nullableString = z.string().nullable().optional();
const optionalBoolean = z.boolean().optional();
const slugRegex = /^[a-z0-9-]+$/;
const phoneRegex = /^\+?\d{10,15}$/;
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

// ─── Enums ──────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(["admin", "business_owner", "courier"]);
export const OrderStatusSchema = z.enum([
  "draft",
  "pending_courier",
  "accepted",
  "collected",
  "in_transit",
  "delivered",
  "rejected",
]);
export const CourierStatusSchema = z.enum(["offline", "available", "busy"]);
export const PaymentStatusSchema = z.enum(["pending", "paid", "failed", "refunded"]);
export const PlanSchema = z.enum(["free", "basic", "pro", "enterprise"]);
export const SubscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
]);

// ─── Platform Settings ─────────────────────────────────────────────

export const PlatformSettingsSchema = z.object({
  id: uuid.optional(),
  min_tax_fee: money.default(5.0),
  platform_percentage: z.number().min(0).max(100).default(20.0),
  is_active: z.boolean().default(true),
  maintenance_mode: z.boolean().default(false),
  support_email: z.string().email().nullable().optional(),
  created_at: timestamp,
  updated_at: timestamp,
});

export const UpdatePlatformSettingsSchema = PlatformSettingsSchema.partial().omit({
  id: true,
  created_at: true,
});

// ─── Tenant ─────────────────────────────────────────────────────────

export const TenantSchema = z.object({
  id: uuid.optional(),
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugRegex, "Slug deve conter apenas letras minúsculas, números e hífens"),
  document: z
    .string()
    .refine((v: string) => !v || cnpjRegex.test(v) || cpfRegex.test(v), {
      message: "Documento deve ser CNPJ (00.000.000/0000-00) ou CPF (000.000.000-00)",
    })
    .nullable()
    .optional(),
  email: z.string().email(),
  phone: z
    .string()
    .regex(phoneRegex, "Telefone deve ter 10-15 dígitos")
    .nullable()
    .optional(),
  address: nullableString,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  logo_url: nullableString,
  primary_color: z.string().regex(hexColorRegex).nullable().optional().default("#3B82F6"),
  stripe_customer_id: nullableString,
  plan: PlanSchema.default("free"),
  subscription_status: SubscriptionStatusSchema.default("trialing"),
  is_active: z.boolean().default(true),
  deleted_at: nullableTimestamp,
  created_at: timestamp,
  updated_at: timestamp,
});

export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  stripe_customer_id: true,
  deleted_at: true,
  created_at: true,
  updated_at: true,
});

export const UpdateTenantSchema = CreateTenantSchema.partial();

// ─── Tenant Settings ────────────────────────────────────────────────

export const FeeRangeSchema = z.object({
  minKm: z.number().min(0),
  maxKm: z.number().min(0),
  fee: money,
});

export const TenantSettingsSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  fee_ranges: z.array(FeeRangeSchema).default([
    { minKm: 0, maxKm: 3, fee: 5 },
    { minKm: 3, maxKm: 5, fee: 7 },
    { minKm: 5, maxKm: 8, fee: 10 },
    { minKm: 8, maxKm: 999, fee: 15 },
  ]),
  created_at: timestamp,
  updated_at: timestamp,
});

export const UpdateTenantSettingsSchema = TenantSettingsSchema.partial().omit({
  id: true,
  tenant_id: true,
  created_at: true,
});

// ─── Profile ──────────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: uuid,
  tenant_id: uuid.nullable().optional(),
  role: UserRoleSchema.default("business_owner"),
  full_name: z.string().min(1).max(255),
  phone: z.string().regex(phoneRegex).nullable().optional(),
  avatar_url: nullableString,
  email_verified_at: nullableTimestamp,
  last_sign_in_at: nullableTimestamp,
  is_active: z.boolean().default(true),
  deleted_at: nullableTimestamp,
  created_at: timestamp,
  updated_at: timestamp,
});

export const UpdateProfileSchema = ProfileSchema.partial().omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

// ─── Courier ──────────────────────────────────────────────────────────

export const CourierSchema = z.object({
  id: uuid,
  tenant_id: uuid,
  vehicle_type: nullableString,
  vehicle_plate: z
    .string()
    .regex(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i)
    .nullable()
    .optional(),
  license_number: z.string().min(5).max(20).nullable().optional(),
  status: CourierStatusSchema.default("offline"),
  current_location_lat: z.number().min(-90).max(90).nullable().optional(),
  current_location_lng: z.number().min(-180).max(180).nullable().optional(),
  last_location_at: nullableTimestamp,
  rating: z.number().min(0).max(5).nullable().optional().default(5),
  total_deliveries: z.number().int().min(0).default(0),
  total_earnings: money.default(0),
  fcm_token: nullableString,
  created_at: timestamp,
  updated_at: timestamp,
});

export const CreateCourierSchema = CourierSchema.omit({
  current_location_lat: true,
  current_location_lng: true,
  last_location_at: true,
  rating: true,
  total_deliveries: true,
  total_earnings: true,
  created_at: true,
  updated_at: true,
});

export const UpdateCourierSchema = CourierSchema.partial().omit({
  id: true,
  tenant_id: true,
  created_at: true,
  updated_at: true,
});

// ─── Order ──────────────────────────────────────────────────────────

export const OrderSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  courier_id: uuid.nullable().optional(),
  created_by: uuid,
  status: OrderStatusSchema.default("draft"),
  customer_name: z.string().min(1).max(255),
  customer_phone: z.string().regex(phoneRegex),
  pickup_address: z.string().min(1).max(500),
  pickup_lat: z.number().min(-90).max(90).nullable().optional(),
  pickup_lng: z.number().min(-180).max(180).nullable().optional(),
  delivery_address: z.string().min(1).max(500),
  delivery_lat: z.number().min(-90).max(90).nullable().optional(),
  delivery_lng: z.number().min(-180).max(180).nullable().optional(),
  distance_km: z.number().min(0).default(0),
  estimated_minutes: z.number().int().min(0).nullable().optional(),
  order_value: money.default(0),
  delivery_fee: money.default(0),
  platform_fee: money.default(0),
  rejection_reason: nullableString,
  delivered_at: nullableTimestamp,
  deleted_at: nullableTimestamp,
  created_at: timestamp,
  updated_at: timestamp,
});

export const CreateOrderSchema = OrderSchema.omit({
  id: true,
  courier_id: true,
  status: true,
  platform_fee: true,
  rejection_reason: true,
  delivered_at: true,
  deleted_at: true,
  created_at: true,
  updated_at: true,
});

export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  rejection_reason: z.string().min(1).optional(),
});

// ─── Order Status History ───────────────────────────────────────────

export const OrderStatusHistorySchema = z.object({
  id: uuid.optional(),
  order_id: uuid,
  status: OrderStatusSchema,
  notes: nullableString,
  created_by: uuid.nullable().optional(),
  created_at: timestamp,
});

// ─── Courier Location ────────────────────────────────────────────────

export const CourierLocationSchema = z.object({
  id: uuid.optional(),
  courier_id: uuid,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).nullable().optional(),
  recorded_at: timestamp,
});

// ─── Payment ────────────────────────────────────────────────────────

export const PaymentSchema = z.object({
  id: uuid.optional(),
  tenant_id: uuid,
  order_id: uuid,
  stripe_payment_intent_id: nullableString,
  stripe_invoice_id: nullableString,
  amount: money,
  status: PaymentStatusSchema.default("pending"),
  receipt_url: nullableString,
  paid_at: nullableTimestamp,
  created_at: timestamp,
  updated_at: timestamp,
});

// ─── Notification ───────────────────────────────────────────────────

export const NotificationSchema = z.object({
  id: uuid.optional(),
  recipient_id: uuid,
  type: z.string().min(1).max(50),
  title: z.string().min(1).max(255),
  body: z.string().min(1).max(1000),
  data: z.record(z.unknown()).nullable().optional(),
  is_read: z.boolean().default(false),
  expires_at: nullableTimestamp,
  created_at: timestamp,
});

// ─── Auth ───────────────────────────────────────────────────────────

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(255),
  tenantName: z.string().min(1).max(255),
  tenantSlug: z
    .string()
    .min(1)
    .max(100)
    .regex(slugRegex, "Slug deve conter apenas letras minúsculas, números e hífens"),
  phone: z.string().regex(phoneRegex).optional(),
});

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Export types ───────────────────────────────────────────────────

export type PlatformSettings = z.infer<typeof PlatformSettingsSchema>;
export type UpdatePlatformSettings = z.infer<typeof UpdatePlatformSettingsSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type CreateTenant = z.infer<typeof CreateTenantSchema>;
export type UpdateTenant = z.infer<typeof UpdateTenantSchema>;
export type TenantSettings = z.infer<typeof TenantSettingsSchema>;
export type UpdateTenantSettings = z.infer<typeof UpdateTenantSettingsSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type Courier = z.infer<typeof CourierSchema>;
export type CreateCourier = z.infer<typeof CreateCourierSchema>;
export type UpdateCourier = z.infer<typeof UpdateCourierSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type CreateOrder = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderStatus = z.infer<typeof UpdateOrderStatusSchema>;
export type OrderStatusHistory = z.infer<typeof OrderStatusHistorySchema>;
export type CourierLocation = z.infer<typeof CourierLocationSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type SignUp = z.infer<typeof SignUpSchema>;
export type SignIn = z.infer<typeof SignInSchema>;
