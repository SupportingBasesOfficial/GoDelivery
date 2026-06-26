import { z } from "zod";

// ===========================================
// Schemas compartilhados
// ===========================================

export const emailSchema = z
  .string()
  .min(1, "Email é obrigatório")
  .email("Email inválido")
  .max(254, "Email muito longo");

export const passwordSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(128, "Senha muito longa")
  .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Senha deve conter pelo menos um número");

export const phoneSchema = z
  .string()
  .min(10, "Telefone deve ter no mínimo 10 dígitos")
  .max(15, "Telefone muito longo")
  .regex(/^\+?[0-9\s\-()]+$/, "Telefone inválido");

export const slugSchema = z
  .string()
  .min(2, "Slug deve ter no mínimo 2 caracteres")
  .max(50, "Slug muito longo")
  .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens")
  .regex(/^[a-z]/, "Slug deve começar com uma letra")
  .regex(/[a-z0-9]$/, "Slug deve terminar com letra ou número");

export const uuidSchema = z.string().uuid("ID inválido");

// ===========================================
// Auth schemas
// ===========================================

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100, "Nome muito longo"),
  tenantName: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres").max(100),
  tenantSlug: slugSchema,
  phone: phoneSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Senha é obrigatória").max(128),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

// ===========================================
// Order schemas
// ===========================================

export const orderStatusSchema = z.enum([
  "draft",
  "pending_courier",
  "accepted",
  "collected",
  "in_transit",
  "delivered",
  "rejected",
  "cancelled",
]);

export const createOrderSchema = z.object({
  customerName: z.string().min(1, "Nome do cliente é obrigatório").max(100),
  customerPhone: phoneSchema,
  pickupAddress: z.string().min(5, "Endereço de coleta é obrigatório").max(300),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  deliveryAddress: z.string().min(5, "Endereço de entrega é obrigatório").max(300),
  deliveryLat: z.number().min(-90).max(90).optional(),
  deliveryLng: z.number().min(-180).max(180).optional(),
  orderValue: z.number().min(0, "Valor do pedido não pode ser negativo"),
  deliveryFee: z.number().min(0, "Taxa de entrega não pode ser negativa"),
});

export const orderIdSchema = z.object({
  orderId: uuidSchema,
});

export const assignCourierSchema = z.object({
  orderId: uuidSchema,
  courierId: uuidSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ===========================================
// Courier schemas
// ===========================================

export const createCourierSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  licenseNumber: z.string().min(5, "Número da CNH é obrigatório").max(20),
  vehiclePlate: z.string().min(5, "Placa é obrigatória").max(10),
  vehicleType: z.string().min(1, "Tipo de veículo é obrigatório").max(30),
});

export const updateCourierSchema = z.object({
  id: uuidSchema,
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres").max(100),
  phone: phoneSchema,
  licenseNumber: z.string().min(5, "Número da CNH é obrigatório").max(20),
  vehiclePlate: z.string().min(5, "Placa é obrigatória").max(10),
  vehicleType: z.string().min(1, "Tipo de veículo é obrigatório").max(30),
});

export type UpdateCourierInput = z.infer<typeof updateCourierSchema>;

// ===========================================
// Settings schemas
// ===========================================

export const feeRangeSchema = z.object({
  minKm: z.number().min(0, "Distância mínima não pode ser negativa"),
  maxKm: z.number().min(0, "Distância máxima não pode ser negativa"),
  fee: z.number().min(0, "Taxa não pode ser negativa"),
});

export const tenantSettingsSchema = z.object({
  feeRanges: z.array(feeRangeSchema).min(1, "Pelo menos uma faixa de taxa é obrigatória"),
});

export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;

// ===========================================
// Route schemas
// ===========================================

export const routeFiltersSchema = z.object({
  courierId: uuidSchema.optional(),
  vehicleType: z.string().max(30).optional(),
  status: z.string().max(20).optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
});

export const createRouteSchema = z.object({
  courierId: uuidSchema,
});

export const routeOrderSchema = z.object({
  orderId: uuidSchema,
  routeId: uuidSchema,
});

export const endRouteSchema = z.object({
  routeId: uuidSchema,
});

export type RouteFiltersInput = z.infer<typeof routeFiltersSchema>;

// ===========================================
// Report schemas
// ===========================================

export const reportDateRangeSchema = z.object({
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD").optional(),
});

// ===========================================
// Stripe schemas
// ===========================================

export const stripeIdSchema = z.string().min(1).max(100);

// ===========================================
// Helper de validação
// ===========================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`) };
}
