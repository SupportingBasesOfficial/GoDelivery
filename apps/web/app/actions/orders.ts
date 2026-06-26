"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import type { OrderStatus } from "@repo/supabase";
import { rateLimit } from "../lib/rate-limit";
import { sendPushNotification } from "./notifications";
import { validate, createOrderSchema, assignCourierSchema, orderIdSchema } from "./schemas";

export interface CreateOrderData {
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  orderValue: number;
  deliveryFee: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  delivery_address: string;
  order_value: number;
  delivery_fee: number;
  courier_id: string | null;
  courier_notified_at: string | null;
  created_at: string;
  assigned_at: string | null;
  accepted_at: string | null;
  collected_at: string | null;
  in_transit_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  operated_by: string | null;
  route_id: string | null;
}

/**
 * Busca pedidos do tenant do usuário logado.
 */
export async function getOrders(): Promise<Result<Order[]>> {
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

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, status, customer_name, customer_phone, pickup_address, delivery_address, order_value, delivery_fee, courier_id, courier_notified_at, created_at, assigned_at, accepted_at, collected_at, in_transit_at, delivered_at, cancelled_at, rejected_at, operated_by, route_id",
    )
    .eq("tenant_id", profile.tenant_id)
    .order("created_at", { ascending: false });

  if (error) {
    return err(error.message, "orders/fetch-failed");
  }

  return ok(data ?? []);
}

/**
 * Cria um novo pedido.
 */
export async function createOrder(
  data: CreateOrderData,
): Promise<Result<{ orderId: string }>> {
  const validation = validate(createOrderSchema, data);
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

  const limit = rateLimit(`create-order:${user.id}`, 10, 60_000);
  if (!limit.allowed) {
    return err("Muitas tentativas. Tente novamente em alguns minutos.", "rate-limit/exceeded");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    return err("Perfil não encontrado", "profile/not-found");
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      tenant_id: profile.tenant_id,
      created_by: user.id,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      pickup_address: data.pickupAddress,
      pickup_lat: data.pickupLat ?? null,
      pickup_lng: data.pickupLng ?? null,
      delivery_address: data.deliveryAddress,
      delivery_lat: data.deliveryLat ?? null,
      delivery_lng: data.deliveryLng ?? null,
      order_value: data.orderValue,
      delivery_fee: data.deliveryFee,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !order) {
    return err(
      error?.message ?? "Falha ao criar pedido",
      "order/create-failed",
    );
  }

  revalidatePath("/dashboard/orders");
  return ok({ orderId: order.id });
}

/**
 * Atribui um entregador ao pedido e muda status para pending_courier.
 * Fluxo correto: draft → atribui entregador → pending_courier → entregador aceita → accepted
 */
export async function assignCourierToOrder(
  orderId: string,
  courierId: string,
): Promise<Result<{ pushStatus: string }>> {
  const validation = validate(assignCourierSchema, { orderId, courierId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const actorId = userData?.user?.id ?? null;

  const { error } = await supabase
    .from("orders")
    .update({
      courier_id: courierId,
      status: "pending_courier",
      courier_notified_at: new Date().toISOString(),
      assigned_at: new Date().toISOString(),
      operated_by: actorId,
    })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/assign-failed");
  }

  // Notifica o entregador
  const pushResult = await sendPushNotification(
    courierId,
    "Novo pedido disponivel!",
    "Voce recebeu uma nova entrega. Aceite para comecar.",
    { orderId },
  );

  revalidatePath("/dashboard/orders");
  return ok({ pushStatus: pushResult.ok ? "notificacao-enviada" : pushResult.error?.message ?? "sem-token" });
}

/**
 * Entregador aceita o pedido (usado no app mobile).
 */
export async function acceptOrder(orderId: string): Promise<Result<void>> {
  const validation = validate(orderIdSchema, { orderId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/accept-failed");
  }

  revalidatePath("/dashboard/orders");
  return ok(undefined);
}

/**
 * Cancela um pedido.
 */
export async function cancelOrder(orderId: string): Promise<Result<void>> {
  const validation = validate(orderIdSchema, { orderId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const actorId = userData?.user?.id ?? null;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "cancelled",
      rejection_reason: "Cancelado pelo empresário",
      cancelled_at: new Date().toISOString(),
      operated_by: actorId,
      courier_id: null,
    })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/cancel-failed");
  }

  revalidatePath("/dashboard/orders");
  return ok(undefined);
}

/**
 * Reatribui um entregador a um pedido ja atribuido.
 */
export async function reassignCourierToOrder(
  orderId: string,
  newCourierId: string,
): Promise<Result<{ pushStatus: string }>> {
  const validation = validate(assignCourierSchema, { orderId, courierId: newCourierId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  const actorId = userData?.user?.id ?? null;

  const { error } = await supabase
    .from("orders")
    .update({
      courier_id: newCourierId,
      status: "pending_courier",
      courier_notified_at: new Date().toISOString(),
      assigned_at: new Date().toISOString(),
      operated_by: actorId,
      accepted_at: null,
      collected_at: null,
      in_transit_at: null,
      delivered_at: null,
      rejected_at: null,
    })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/reassign-failed");
  }

  const pushResult = await sendPushNotification(
    newCourierId,
    "Novo pedido disponivel!",
    "Voce recebeu uma nova entrega. Aceite para comecar.",
    { orderId },
  );

  revalidatePath("/dashboard/orders");
  return ok({ pushStatus: pushResult.ok ? "notificacao-enviada" : pushResult.error?.message ?? "sem-token" });
}

export interface OrderEvent {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_role: string;
  courier_id: string | null;
  created_at: string;
  metadata: unknown;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Busca a timeline completa de auditoria de um pedido.
 */
export async function getOrderTimeline(orderId: string): Promise<Result<OrderEvent[]>> {
  const validation = validate(orderIdSchema, { orderId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("order_events")
    .select("id, event_type, actor_id, actor_role, courier_id, created_at, metadata, notes, latitude, longitude")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) {
    return err(error.message, "order/timeline-failed");
  }

  return ok(data ?? []);
}

export interface OrderWithTimeline extends Order {
  timeline: OrderEvent[];
}

/**
 * Busca um pedido com sua timeline completa.
 */
export async function getOrderWithTimeline(orderId: string): Promise<Result<OrderWithTimeline>> {
  const validation = validate(orderIdSchema, { orderId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, status, customer_name, customer_phone, pickup_address, delivery_address, order_value, delivery_fee, courier_id, courier_notified_at, created_at, assigned_at, accepted_at, collected_at, in_transit_at, delivered_at, cancelled_at, rejected_at, operated_by, route_id",
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return err(orderError?.message ?? "Pedido nao encontrado", "order/not-found");
  }

  const { data: events, error: eventsError } = await supabase
    .from("order_events")
    .select("id, event_type, actor_id, actor_role, courier_id, created_at, metadata, notes, latitude, longitude")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (eventsError) {
    return err(eventsError.message, "order/timeline-failed");
  }

  return ok({
    ...order,
    timeline: events ?? [],
  } as OrderWithTimeline);
}
