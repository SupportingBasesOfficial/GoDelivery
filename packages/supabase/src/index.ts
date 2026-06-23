import type { Database } from "./database.types";

export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";
export { createAdminClient } from "./admin";
export { updateSession } from "./middleware";
export { ok, err, fromSupabase } from "./types";
export type { Result, AppError } from "./types";
export type { Tables, Enums, Json } from "./database.types";
export type { Database };

// Re-exportar tipos de enums para conveniência
export type UserRole = Database["public"]["Enums"]["user_role"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type CourierStatus = Database["public"]["Enums"]["courier_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type Plan = Database["public"]["Enums"]["plan"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
