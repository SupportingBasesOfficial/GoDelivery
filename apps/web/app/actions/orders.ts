/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck — Tipos do Supabase em modo manual
/* eslint-enable @typescript-eslint/ban-ts-comment */
"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import type { OrderStatus } from "@repo/supabase";

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
  created_at: string;
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
      "id, status, customer_name, customer_phone, pickup_address, delivery_address, order_value, delivery_fee, courier_id, created_at",
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

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      tenant_id: profile.tenant_id,
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
 * Envia pedido para motoboys (muda status para pending_courier).
 */
export async function dispatchOrder(orderId: string): Promise<Result<void>> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("orders")
    .update({ status: "pending_courier" })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/dispatch-failed");
  }

  revalidatePath("/dashboard/orders");
  return ok(undefined);
}

/**
 * Atribui um motoboy ao pedido.
 */
export async function assignCourier(
  orderId: string,
  courierId: string,
): Promise<Result<void>> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("orders")
    .update({ courier_id: courierId, status: "accepted" })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/assign-failed");
  }

  revalidatePath("/dashboard/orders");
  return ok(undefined);
}

/**
 * Cancela um pedido.
 */
export async function cancelOrder(orderId: string): Promise<Result<void>> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("orders")
    .update({
      status: "rejected",
      rejection_reason: "Cancelado pelo empresário",
    })
    .eq("id", orderId);

  if (error) {
    return err(error.message, "order/cancel-failed");
  }

  revalidatePath("/dashboard/orders");
  return ok(undefined);
}
