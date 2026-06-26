"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@repo/supabase/client";
import { getOrderWithTimeline } from "../../../../actions/orders";
import type { OrderWithTimeline, OrderEvent } from "../../../../actions/orders";

const supabase = createClient();

const eventLabels: Record<string, string> = {
  created: "Pedido criado",
  assigned: "Entregador atribuído",
  reassigned: "Entregador reatribuído",
  accepted: "Entregador aceitou",
  rejected: "Entregador recusou",
  cancelled: "Pedido cancelado",
  collected: "Pedido coletado",
  in_transit: "Em rota de entrega",
  delivered: "Entregue ao cliente",
  courier_notified: "Notificação enviada",
  route_started: "Rota iniciada",
  route_ended: "Rota finalizada",
  location_updated: "Localização atualizada",
};

const eventColors: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  reassigned: "bg-orange-100 text-orange-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  collected: "bg-purple-100 text-purple-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  courier_notified: "bg-yellow-100 text-yellow-700",
  route_started: "bg-cyan-100 text-cyan-700",
  route_ended: "bg-teal-100 text-teal-700",
  location_updated: "bg-slate-100 text-slate-700",
};

const roleLabels: Record<string, string> = {
  business_owner: "Empresário",
  courier: "Entregador",
  system: "Sistema",
  admin: "Admin",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function OrderTimelinePage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderWithTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("conectando...");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await getOrderWithTimeline(orderId);
      if (result.ok) {
        setOrder(result.data);
      } else {
        setError(result.error?.message ?? "Erro ao carregar");
      }
      setLoading(false);
    }
    load();

    // Realtime: novos eventos de auditoria
    const eventsChannel = supabase
      .channel(`order_events:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_events",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newEvent = payload.new as OrderEvent;
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              timeline: [...prev.timeline, newEvent],
            };
          });
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status === "SUBSCRIBED" ? "conectado" : status);
      });

    // Realtime: atualizacoes do proprio pedido (status, valores, etc)
    const ordersChannel = supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const raw = payload.new as Record<string, unknown>;
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: (raw.status as OrderWithTimeline["status"]) ?? prev.status,
              order_value: (raw.order_value as number) ?? prev.order_value,
              delivery_fee: (raw.delivery_fee as number) ?? prev.delivery_fee,
            };
          });
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status === "SUBSCRIBED" ? "conectado" : status);
      });

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [orderId]);

  if (loading) return <p className="text-gray-600">Carregando auditoria...</p>;
  if (error) return <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>;
  if (!order) return <p className="text-gray-600">Pedido não encontrado.</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auditoria do Pedido</h2>
          <p className="text-sm text-gray-500">
            Cliente: <strong>{order.customer_name}</strong> — {order.customer_phone}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${connectionStatus === "conectado" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
            <span className="text-xs text-gray-500">Realtime: {connectionStatus}</span>
          </div>
          <Link
            href="/dashboard/orders"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            ← Voltar aos pedidos
          </Link>
        </div>
      </div>

      {/* Resumo do pedido */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs text-gray-500 uppercase">Status atual</p>
          <p className="mt-1 text-lg font-semibold capitalize text-gray-900">
            {order.status.replace("_", " ")}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs text-gray-500 uppercase">Valor</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            R$ {order.order_value.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs text-gray-500 uppercase">Taxa de entrega</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            R$ {order.delivery_fee.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-xl bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Linha do tempo ({order.timeline.length} eventos)
        </h3>

        {order.timeline.length === 0 ? (
          <p className="text-gray-500">Nenhum evento registrado.</p>
        ) : (
          <div className="relative space-y-6">
            {order.timeline.map((event: OrderEvent, index: number) => (
              <div key={event.id} className="relative flex gap-4">
                {/* Linha vertical */}
                {index < order.timeline.length - 1 && (
                  <div className="absolute left-[19px] top-10 h-full w-px bg-gray-200" />
                )}

                {/* Bolinha */}
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    eventColors[event.event_type] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        eventColors[event.event_type] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {eventLabels[event.event_type] || event.event_type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(event.created_at)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-700">
                    <strong>Quem:</strong>{" "}
                    {event.actor_id
                      ? roleLabels[event.actor_role] || event.actor_role
                      : "Sistema"}
                  </p>

                  {event.notes && (
                    <p className="mt-1 text-sm text-gray-600">
                      <strong>Obs:</strong> {event.notes}
                    </p>
                  )}

                  {Boolean(event.metadata) && typeof event.metadata === "object" && event.metadata !== null && (
                    <div className="mt-2 rounded bg-white p-2 text-xs text-gray-600">
                      <strong>Detalhes:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(event.metadata as Record<string, unknown>, null, 2)}
                      </pre>
                    </div>
                  )}

                  {event.latitude && event.longitude && (
                    <p className="mt-1 text-xs text-gray-500">
                      📍 {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
