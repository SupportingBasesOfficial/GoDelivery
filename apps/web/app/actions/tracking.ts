"use server";

import { createServerClient, ok, err } from "@repo/supabase";
import type { Result } from "@repo/supabase";
import { validate, orderIdSchema } from "./schemas";

export interface TrackOrderData {
  id: string;
  customerName: string;
  status: string;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryFee: number;
  orderValue: number;
  createdAt: string;
  acceptedAt: string | null;
  collectedAt: string | null;
  inTransitAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  courierName: string | null;
  proofImageUrl: string | null;
  proofUploadedAt: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  estimatedMinutes: number | null;
  events: {
    eventType: string;
    createdAt: string;
    actorRole: string;
    metadata: unknown;
  }[];
}

/**
 * Calcula distância entre dois pontos geográficos em km (fórmula de Haversine).
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estima tempo de entrega em minutos.
 * Velocidade média de entregador urbano: ~25 km/h.
 */
function estimateDeliveryMinutes(distanceKm: number): number {
  const avgSpeedKmh = 25;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Busca pedido para rastreamento público (sem autenticação).
 */
export async function trackOrder(orderId: string): Promise<Result<TrackOrderData>> {
  const validation = validate(orderIdSchema, { orderId });
  if (!validation.success) {
    return err(validation.errors.join("; "), "validation/invalid-input");
  }

  const supabase = await createServerClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
      id, customer_name, status,
      pickup_address, delivery_address,
      pickup_lat, pickup_lng, delivery_lat, delivery_lng,
      delivery_fee, order_value, created_at,
      accepted_at, collected_at, in_transit_at, delivered_at, cancelled_at,
      proof_image_url, proof_uploaded_at,
      courier: courier_id (profiles: id (full_name))
      `,
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return err("Pedido não encontrado", "tracking/not-found");
  }

  const { data: events, error: eventsError } = await supabase
    .from("order_events")
    .select("event_type, created_at, actor_role, metadata")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (eventsError) {
    return err(eventsError.message, "tracking/events-failed");
  }

  return ok({
    id: order.id,
    customerName: order.customer_name,
    status: order.status,
    pickupAddress: order.pickup_address,
    deliveryAddress: order.delivery_address,
    deliveryFee: order.delivery_fee,
    orderValue: order.order_value,
    createdAt: order.created_at,
    acceptedAt: order.accepted_at,
    collectedAt: order.collected_at,
    inTransitAt: order.in_transit_at,
    deliveredAt: order.delivered_at,
    cancelledAt: order.cancelled_at,
    courierName: order.courier?.profiles?.full_name ?? null,
    proofImageUrl: order.proof_image_url ?? null,
    proofUploadedAt: order.proof_uploaded_at ?? null,
    pickupLat: order.pickup_lat ?? null,
    pickupLng: order.pickup_lng ?? null,
    deliveryLat: order.delivery_lat ?? null,
    deliveryLng: order.delivery_lng ?? null,
    estimatedMinutes:
      order.pickup_lat && order.pickup_lng && order.delivery_lat && order.delivery_lng
        ? estimateDeliveryMinutes(
            haversineDistance(
              order.pickup_lat,
              order.pickup_lng,
              order.delivery_lat,
              order.delivery_lng,
            ),
          )
        : null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    events: (events ?? []).map((e: any) => ({
      eventType: e.event_type,
      createdAt: e.created_at,
      actorRole: e.actor_role,
      metadata: e.metadata,
    })),
  });
}
