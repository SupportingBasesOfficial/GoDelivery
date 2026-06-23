/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Tipos gerados do banco real (v2). TODO: ajustar código para novos tipos supabase-js
"use server";

import { createAdminClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";

// ─── Platform Settings ─────────────────────────────────────────────

export interface PlatformSettings {
  id: string;
  min_tax_fee: number;
  platform_percentage: number;
  is_active: boolean;
}

export async function getPlatformSettings(): Promise<Result<PlatformSettings>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("id, min_tax_fee, platform_percentage, is_active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return err(error?.message ?? "Configurações não encontradas", "settings/not-found");
  }

  return ok(data as PlatformSettings);
}

export async function updatePlatformSettings(
  id: string,
  data: Partial<PlatformSettings>,
): Promise<Result<void>> {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").update(data).eq("id", id);

  if (error) {
    return err(error.message, "settings/update-failed");
  }

  return ok(undefined);
}

// ─── Tenants ─────────────────────────────────────────────────────────

export interface TenantAdmin {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export async function getAllTenants(): Promise<Result<TenantAdmin[]>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tenants")
    .select("id, name, slug, email, phone, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return err(error.message, "tenants/fetch-failed");
  }

  return ok(data ?? []);
}

export async function toggleTenantActive(
  tenantId: string,
  isActive: boolean,
): Promise<Result<void>> {
  const admin = createAdminClient();
  const { error } = await admin.from("tenants").update({ is_active: isActive }).eq("id", tenantId);

  if (error) {
    return err(error.message, "tenants/update-failed");
  }

  return ok(undefined);
}

// ─── Orders (global view) ────────────────────────────────────────────

export interface AdminOrder {
  id: string;
  tenant_id: string;
  tenant_name: string;
  status: string;
  customer_name: string;
  delivery_address: string;
  order_value: number;
  delivery_fee: number;
  platform_fee: number;
  created_at: string;
}

export async function getAllOrders(): Promise<Result<AdminOrder[]>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select(
      "id, tenant_id, status, customer_name, delivery_address, order_value, delivery_fee, platform_fee, created_at, tenants(name)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return err(error.message, "orders/fetch-failed");
  }

  const formatted = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    tenant_name: (row.tenants as { name?: string } | null)?.name ?? "—",
    status: String(row.status),
    customer_name: String(row.customer_name),
    delivery_address: String(row.delivery_address),
    order_value: Number(row.order_value),
    delivery_fee: Number(row.delivery_fee),
    platform_fee: Number(row.platform_fee),
    created_at: String(row.created_at),
  }));

  return ok(formatted);
}

// ─── Payments (global view) ──────────────────────────────────────────

export interface AdminPayment {
  id: string;
  tenant_name: string;
  order_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  status: string;
  created_at: string;
}

export async function getAllPayments(): Promise<Result<AdminPayment[]>> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("id, order_id, stripe_payment_intent_id, amount, status, created_at, tenants(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return err(error.message, "payments/fetch-failed");
  }

  const formatted = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    tenant_name: (row.tenants as { name?: string } | null)?.name ?? "—",
    order_id: String(row.order_id),
    stripe_payment_intent_id: String(row.stripe_payment_intent_id),
    amount: Number(row.amount),
    status: String(row.status),
    created_at: String(row.created_at),
  }));

  return ok(formatted);
}

// ─── Audit / Order Status History ────────────────────────────────────

export interface StatusHistoryEntry {
  id: string;
  order_id: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export async function getOrderStatusHistory(orderId?: string): Promise<Result<StatusHistoryEntry[]>> {
  const admin = createAdminClient();
  let query = admin
    .from("order_status_history")
    .select("id, order_id, status, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (orderId) {
    query = query.eq("order_id", orderId);
  }

  const { data, error } = await query;

  if (error) {
    return err(error.message, "history/fetch-failed");
  }

  return ok(data ?? []);
}
