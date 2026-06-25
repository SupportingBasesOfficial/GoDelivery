"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { validate, routeFiltersSchema, createRouteSchema, routeOrderSchema, endRouteSchema } from "./schemas";

export interface RouteWithOrders {
  id: string;
  courier_id: string;
  courier_name: string | null;
  courier_email: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  total_distance_km: number | null;
  estimated_duration_min: number | null;
  created_at: string;
  orders: {
    id: string;
    status: string;
    customer_name: string;
    customer_phone: string;
    pickup_address: string;
    delivery_address: string;
    order_value: number;
    delivery_fee: number;
    assigned_at: string | null;
    accepted_at: string | null;
    collected_at: string | null;
    in_transit_at: string | null;
    delivered_at: string | null;
    cancelled_at: string | null;
    rejected_at: string | null;
  }[];
}

export interface RouteFilters {
  courierId?: string;
  vehicleType?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Lista rotas de entrega com filtros opcionais.
 */
export async function getRoutes(filters?: RouteFilters): Promise<Result<RouteWithOrders[]>> {
  if (filters) {
    const validation = validate(routeFiltersSchema, filters);
    if (!validation.success) {
      return err(validation.errors.join("; "), "validation/invalid-input");
    }
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
    .from("delivery_routes")
    .select(
      `
      id,
      courier_id,
      status,
      started_at,
      ended_at,
      total_distance_km,
      estimated_duration_min,
      created_at,
      orders: orders (
        id, status, customer_name, customer_phone,
        pickup_address, delivery_address, order_value, delivery_fee,
        assigned_at, accepted_at, collected_at, in_transit_at,
        delivered_at, cancelled_at, rejected_at
      )
      `,
    )
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (filters?.courierId) {
    query = query.eq("courier_id", filters.courierId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.fromDate) {
    query = query.gte("created_at", filters.fromDate);
  }
  if (filters?.toDate) {
    query = query.lte("created_at", filters.toDate + "T23:59:59");
  }

  const { data: routesData, error: routesError } = await query;

  if (routesError) {
    return err(routesError.message, "routes/fetch-failed");
  }

  // Busca dados dos couriers separadamente para evitar problemas de join
  const courierIds = [...new Set((routesData ?? []).map((r: any) => r.courier_id).filter(Boolean))];
  let courierMap = new Map<string, { full_name: string | null; email: string | null; vehicle_type: string | null; vehicle_plate: string | null }>();

  if (courierIds.length > 0) {
    const { data: couriersData } = await supabase
      .from("couriers")
      .select("id, vehicle_type, vehicle_plate")
      .in("id", courierIds);

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", courierIds);

    const profilesMap = new Map((profilesData ?? []).map((p: any) => [p.id, p]));

    for (const c of couriersData ?? []) {
      const profile = profilesMap.get(c.id);
      courierMap.set(c.id, {
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? null,
        vehicle_type: c.vehicle_type,
        vehicle_plate: c.vehicle_plate,
      });
    }
  }

  const routes: RouteWithOrders[] = (routesData ?? []).map((r: any) => {
    const courier = courierMap.get(r.courier_id);
    return {
      id: r.id,
      courier_id: r.courier_id,
      courier_name: courier?.full_name ?? null,
      courier_email: courier?.email ?? null,
      vehicle_type: courier?.vehicle_type ?? null,
      vehicle_plate: courier?.vehicle_plate ?? null,
      status: r.status,
      started_at: r.started_at,
      ended_at: r.ended_at,
      total_distance_km: r.total_distance_km,
      estimated_duration_min: r.estimated_duration_min,
      created_at: r.created_at,
      orders: r.orders ?? [],
    };
  });

  if (filters?.vehicleType) {
    return ok(routes.filter((r) => r.vehicle_type === filters.vehicleType));
  }

  return ok(routes);
}

/**
 * Cria uma nova rota para um courier.
 */
export async function createRoute(courierId: string): Promise<Result<{ routeId: string }>> {
  const validation = validate(createRouteSchema, { courierId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const actorId = userData?.user?.id ?? null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", actorId ?? "")
    .single();

  if (profileError || !profile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  const { data: route, error } = await supabase
    .from("delivery_routes")
    .insert({
      courier_id: courierId,
      tenant_id: profile.tenant_id,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !route) {
    return err(error?.message ?? "Falha ao criar rota", "route/create-failed");
  }

  revalidatePath("/dashboard/routes");
  return ok({ routeId: route.id });
}

/**
 * Adiciona um pedido a uma rota existente.
 */
export async function addOrderToRoute(orderId: string, routeId: string): Promise<Result<void>> {
  const validation = validate(routeOrderSchema, { orderId, routeId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("orders")
    .update({ route_id: routeId })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "route/add-order-failed");
  }

  revalidatePath("/dashboard/routes");
  return ok(undefined);
}

/**
 * Finaliza uma rota.
 */
export async function endRoute(routeId: string): Promise<Result<void>> {
  const validation = validate(endRouteSchema, { routeId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("delivery_routes")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", routeId);

  if (error) {
    return err(error.message, "route/end-failed");
  }

  revalidatePath("/dashboard/routes");
  return ok(undefined);
}

/**
 * Busca tipos de veículos distintos do tenant.
 */
export async function getVehicleTypes(): Promise<Result<string[]>> {
  const supabase = await createServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .single();

  if (profileError || !profile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  const { data, error } = await supabase
    .from("couriers")
    .select("vehicle_type")
    .eq("tenant_id", profile.tenant_id)
    .not("vehicle_type", "is", null);

  if (error) {
    return err(error.message, "routes/vehicle-types-failed");
  }

  const types = [...new Set((data ?? []).map((c: any) => c.vehicle_type).filter(Boolean))];
  return ok(types);
}
