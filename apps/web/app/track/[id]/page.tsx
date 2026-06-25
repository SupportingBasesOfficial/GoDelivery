"use client";

import React, { useEffect, useState } from "react";
import { trackOrder } from "../../actions/tracking";
import type { TrackOrderData } from "../../actions/tracking";

const statusLabels: Record<string, string> = {
  pending_courier: "Aguardando entregador",
  accepted: "Aceito pelo entregador",
  collected: "Pedido coletado",
  in_transit: "Em rota para entrega",
  delivered: "Entregue",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending_courier: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  collected: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const eventLabels: Record<string, string> = {
  created: "Pedido criado",
  assigned: "Entregador atribuído",
  accepted: "Pedido aceito",
  rejected: "Pedido recusado",
  collected: "Pedido coletado",
  in_transit: "Saiu para entrega",
  delivered: "Pedido entregue",
  cancelled: "Pedido cancelado",
  status_changed: "Status alterado",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [order, setOrder] = useState<TrackOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const result = await trackOrder(id);
      if (result.ok) {
        setOrder(result.data);
      } else {
        setError(result.error?.message ?? "Erro ao rastrear pedido");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || "Pedido não encontrado"}</p>
        </div>
      </div>
    );
  }

  const progressSteps = [
    { key: "created", label: "Criado", time: order.createdAt },
    { key: "accepted", label: "Aceito", time: order.acceptedAt },
    { key: "collected", label: "Coletado", time: order.collectedAt },
    { key: "in_transit", label: "Em rota", time: order.inTransitAt },
    { key: "delivered", label: "Entregue", time: order.deliveredAt },
  ];

  const currentStepIndex = progressSteps.findIndex((s) => s.key === order.status);
  // const isCompleted = order.status === "delivered";
  const isCancelled = order.status === "cancelled" || order.status === "rejected";

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">GoDelivery</h1>
          <p className="text-gray-500">Rastreamento de pedido</p>
        </div>

        {/* Status card */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Pedido #{order.id.slice(0, 8)}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusColors[order.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabels[order.status] || order.status}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-gray-900">{order.customerName}</h2>

          {order.courierName && (
            <p className="mt-1 text-sm text-gray-500">
              Entregador: <span className="font-medium">{order.courierName}</span>
            </p>
          )}

          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>Coleta: {order.pickupAddress}</p>
            <p>Entrega: {order.deliveryAddress}</p>
          </div>

          {/* ETA */}
          {order.estimatedMinutes !== null &&
            (order.status === "accepted" || order.status === "collected" || order.status === "in_transit") && (
            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                Tempo estimado de entrega: {order.estimatedMinutes} min
              </p>
            </div>
          )}

          {/* Comprovante de entrega */}
          {order.proofImageUrl && order.status === "delivered" && (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Comprovante de entrega</p>
              <a
                href={order.proofImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border"
              >
                <img
                  src={order.proofImageUrl}
                  alt="Comprovante de entrega"
                  className="h-48 w-full object-cover"
                />
              </a>
            </div>
          )}

          <div className="mt-4 border-t pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Valor do pedido</span>
              <span className="font-medium">R$ {order.orderValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxa de entrega</span>
              <span className="font-medium">R$ {order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>R$ {(order.orderValue + order.deliveryFee).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {!isCancelled && (
          <div className="mb-6 rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Andamento da entrega
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-4 h-[calc(100%-32px)] w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {progressSteps.map((step, index) => {
                  const isActive = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      <div
                        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isActive
                            ? isCurrent
                              ? "bg-blue-600 text-white"
                              : "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {isActive && index < currentStepIndex ? "✓" : index + 1}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            isActive ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </p>
                        {step.time && (
                          <p className="text-xs text-gray-500">{formatDate(step.time)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Timeline de eventos */}
        {order.events.length > 0 && (
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Histórico completo
            </h3>
            <div className="space-y-3">
              {order.events.map((event, idx) => (
                <div key={idx} className="border-l-2 border-gray-200 pl-3">
                  <p className="text-sm font-medium text-gray-800">
                    {eventLabels[event.eventType] || event.eventType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(event.createdAt)} · {event.actorRole}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancelado */}
        {isCancelled && (
          <div className="mt-6 rounded-xl bg-red-50 p-6 text-center">
            <p className="text-red-700">
              Este pedido foi{" "}
              {order.status === "cancelled" ? "cancelado" : "recusado"}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
