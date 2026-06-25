"use server";

import { createServerClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { validate, reportDateRangeSchema } from "./schemas";

export interface OrderMetrics {
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  rejectedOrders: number;
  completionRate: number;
  totalRevenue: number;
  totalFees: number;
  avgDeliveryTimeMinutes: number | null;
  avgAcceptTimeMinutes: number | null;
  avgCollectTimeMinutes: number | null;
}

export interface CourierMetrics {
  courierId: string;
  courierName: string;
  totalOrders: number;
  delivered: number;
  rejected: number;
  cancelled: number;
  totalRevenue: number;
  totalFees: number;
  avgDeliveryTimeMinutes: number | null;
}

export interface DailyMetrics {
  date: string;
  orders: number;
  delivered: number;
  revenue: number;
  fees: number;
}

export interface ReportsData {
  overall: OrderMetrics;
  couriers: CourierMetrics[];
  daily: DailyMetrics[];
}

/**
 * Busca métricas e relatórios do tenant.
 */
export async function getReports(fromDate?: string, toDate?: string): Promise<Result<ReportsData>> {
  const validation = validate(reportDateRangeSchema, { fromDate, toDate });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return err("Não autenticado", "auth/unauthenticated");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  let query = supabase
    .from("orders")
    .select(
      `
      id, status, order_value, delivery_fee,
      created_at, assigned_at, accepted_at, collected_at, delivered_at, cancelled_at, rejected_at,
      courier_id, courier: courier_id (profiles: id (full_name))
      `,
    )
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: true });

  if (fromDate) {
    query = query.gte("created_at", fromDate);
  }
  if (toDate) {
    query = query.lte("created_at", toDate + "T23:59:59");
  }

  const { data: orders, error: ordersError } = await query;

  if (ordersError) {
    return err(ordersError.message, "reports/fetch-failed");
  }

  const list = (orders ?? []) as any[];

  // Métricas gerais
  const deliveredList = list.filter((o) => o.status === "delivered");
  const cancelledList = list.filter((o) => o.status === "cancelled");
  const rejectedList = list.filter((o) => o.status === "rejected");

  const totalRevenue = list.reduce((s, o) => s + (o.order_value ?? 0), 0);
  const totalFees = list.reduce((s, o) => s + (o.delivery_fee ?? 0), 0);

  // Tempos médios (em minutos)
  function diffMinutes(a: string | null, b: string | null): number | null {
    if (!a || !b) return null;
    const ms = new Date(b).getTime() - new Date(a).getTime();
    return ms > 0 ? Math.round(ms / 60000) : null;
  }

  const deliveryTimes = deliveredList
    .map((o) => diffMinutes(o.collected_at, o.delivered_at))
    .filter((t): t is number => t !== null);

  const acceptTimes = list
    .map((o) => diffMinutes(o.assigned_at, o.accepted_at))
    .filter((t): t is number => t !== null);

  const collectTimes = list
    .map((o) => diffMinutes(o.accepted_at, o.collected_at))
    .filter((t): t is number => t !== null);

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  // Métricas por entregador
  const courierMap = new Map<string, CourierMetrics>();
  for (const o of list) {
    const cid = o.courier_id;
    if (!cid) continue;
    const existing = courierMap.get(cid);
    const name = o.courier?.profiles?.full_name ?? "Desconhecido";
    if (existing) {
      existing.totalOrders++;
      if (o.status === "delivered") existing.delivered++;
      if (o.status === "rejected") existing.rejected++;
      if (o.status === "cancelled") existing.cancelled++;
      existing.totalRevenue += o.order_value ?? 0;
      existing.totalFees += o.delivery_fee ?? 0;
      const dt = diffMinutes(o.collected_at, o.delivered_at);
      if (dt !== null) existing.avgDeliveryTimeMinutes = dt; // simplificado
    } else {
      const dt = diffMinutes(o.collected_at, o.delivered_at);
      courierMap.set(cid, {
        courierId: cid,
        courierName: name,
        totalOrders: 1,
        delivered: o.status === "delivered" ? 1 : 0,
        rejected: o.status === "rejected" ? 1 : 0,
        cancelled: o.status === "cancelled" ? 1 : 0,
        totalRevenue: o.order_value ?? 0,
        totalFees: o.delivery_fee ?? 0,
        avgDeliveryTimeMinutes: dt,
      });
    }
  }

  const couriers = Array.from(courierMap.values()).map((c) => ({
    ...c,
    avgDeliveryTimeMinutes:
      c.avgDeliveryTimeMinutes !== null ? c.avgDeliveryTimeMinutes : null,
  }));

  // Métricas diárias
  const dailyMap = new Map<string, DailyMetrics>();
  for (const o of list) {
    const date = o.created_at.split("T")[0];
    const existing = dailyMap.get(date);
    if (existing) {
      existing.orders++;
      if (o.status === "delivered") existing.delivered++;
      existing.revenue += o.order_value ?? 0;
      existing.fees += o.delivery_fee ?? 0;
    } else {
      dailyMap.set(date, {
        date,
        orders: 1,
        delivered: o.status === "delivered" ? 1 : 0,
        revenue: o.order_value ?? 0,
        fees: o.delivery_fee ?? 0,
      });
    }
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return ok({
    overall: {
      totalOrders: list.length,
      deliveredOrders: deliveredList.length,
      cancelledOrders: cancelledList.length,
      rejectedOrders: rejectedList.length,
      completionRate: list.length > 0 ? Math.round((deliveredList.length / list.length) * 100) : 0,
      totalRevenue,
      totalFees,
      avgDeliveryTimeMinutes: avg(deliveryTimes),
      avgAcceptTimeMinutes: avg(acceptTimes),
      avgCollectTimeMinutes: avg(collectTimes),
    },
    couriers,
    daily,
  });
}
