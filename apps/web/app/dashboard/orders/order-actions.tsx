"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { assignCourierToOrder, cancelOrder, reassignCourierToOrder } from "../../actions/orders";
import type { CourierData } from "../../actions/couriers";

interface OrderActionsProps {
  orderId: string;
  status: string;
  couriers: CourierData[];
}

export default function OrderActions({ orderId, status, couriers }: OrderActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCourier, setSelectedCourier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  function handleAssign() {
    if (!selectedCourier) return;
    setError(null);
    setPushMsg(null);
    startTransition(async () => {
      const result = await assignCourierToOrder(orderId, selectedCourier);
      if (!result.ok) {
        setError(result.error?.message ?? "Erro");
      } else {
        setPushMsg(result.data?.pushStatus === "notificacao-enviada" ? "Motoboy notificado!" : `Push: ${result.data?.pushStatus ?? "n/a"}`);
      }
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (!result.ok) {
        setError(result.error?.message ?? "Erro");
      }
      router.refresh();
    });
  }

  if (status === "rejected" || status === "delivered") {
    return <span className="text-xs text-gray-400">—</span>;
  }

  if (status === "pending_courier") {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs text-yellow-600">
          Aguardando motoboy aceitar...
        </span>
        <div className="flex gap-2">
          <select
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            <option value="">Trocar entregador</option>
            {couriers
              .filter((c) => c.status === "available")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || c.email}
                </option>
              ))}
          </select>
          <button
            onClick={() => {
              if (!selectedCourier) return;
              setError(null);
              setPushMsg(null);
              startTransition(async () => {
                const result = await reassignCourierToOrder(orderId, selectedCourier);
                if (!result.ok) {
                  setError(result.error?.message ?? "Erro");
                } else {
                  setPushMsg(result.data?.pushStatus === "notificacao-enviada" ? "Novo motoboy notificado!" : `Push: ${result.data?.pushStatus ?? "n/a"}`);
                }
                router.refresh();
              });
            }}
            disabled={isPending || !selectedCourier}
            className="rounded bg-orange-600 px-2 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isPending ? "..." : "Reatribuir"}
          </button>
        </div>
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="self-start rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          Cancelar
        </button>
        <Link
          href={`/dashboard/orders/${orderId}/timeline`}
          className="self-start text-xs text-blue-600 hover:underline"
        >
          📋 Ver auditoria
        </Link>
        <a
          href={`/track/${orderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-xs text-teal-600 hover:underline"
        >
          🔗 Link de rastreamento
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "draft" && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={selectedCourier}
              onChange={(e) => setSelectedCourier(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs"
            >
              <option value="">Escolher motoboy</option>
              {couriers
                .filter((c) => c.status === "available")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.email} (disponível)
                  </option>
                ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={isPending || !selectedCourier}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "..." : "Atribuir"}
            </button>
          </div>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="self-start rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}

      {(status === "accepted" || status === "collected" || status === "in_transit") && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="self-start rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          {isPending ? "..." : "Cancelar"}
        </button>
      )}

      <Link
        href={`/dashboard/orders/${orderId}/timeline`}
        className="self-start text-xs text-blue-600 hover:underline"
      >
        📋 Ver auditoria
      </Link>

      <a
        href={`/track/${orderId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs text-teal-600 hover:underline"
      >
        🔗 Link de rastreamento
      </a>

      {pushMsg && <span className="text-xs text-green-600">{pushMsg}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
