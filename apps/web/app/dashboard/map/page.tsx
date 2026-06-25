"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@repo/supabase/client";
import { getCouriersWithLocation } from "../../actions/couriers";
import type { CourierWithLocation } from "../../actions/couriers";

const supabase = createClient();

const statusLabels: Record<string, string> = {
  available: "Disponível",
  offline: "Offline",
  busy: "Em entrega",
};

const statusColors: Record<string, string> = {
  available: "bg-green-500",
  offline: "bg-gray-400",
  busy: "bg-yellow-500",
};

// Import dinâmico do Mapa para evitar SSR
const MapView = dynamic<{ couriers: CourierWithLocation[] }>(() => import("./MapView"), { ssr: false });

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MapPage() {
  const [couriers, setCouriers] = useState<CourierWithLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("conectando...");

  async function load() {
    setLoading(true);
    const result = await getCouriersWithLocation();
    if (result.ok) {
      setCouriers(result.data);
    } else {
      setError(result.error?.message ?? "Erro ao carregar motoboys");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();

    // Realtime: atualiza posicoes dos couriers automaticamente
    const channel = supabase
      .channel("courier_locations")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couriers" },
        (payload) => {
          const updated = payload.new as CourierWithLocation;
          setCouriers((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          );
        }
      )
      .subscribe((status) => {
        setConnectionStatus(status === "SUBSCRIBED" ? "conectado" : status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">Mapa de Entregadores</h2>
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Disponível ({couriers.filter((c) => c.status === "available").length})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Em entrega ({couriers.filter((c) => c.status === "busy").length})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Offline ({couriers.filter((c) => c.status === "offline").length})
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/routes"
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Rotas
          </Link>
          <Link
            href="/dashboard/couriers"
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Motoboys
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${connectionStatus === "conectado" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
          <span className="text-xs text-gray-500">Realtime: {connectionStatus}</span>
        </div>
      </div>

      {/* Mapa + Lista lateral */}
      <div className="flex flex-1">
        {/* Lista */}
        <div className="w-80 overflow-y-auto border-r bg-white">
          <div className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Entregadores ({couriers.length})
            </h3>
            {loading ? (
              <p className="text-sm text-gray-500">Carregando...</p>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : (
              <div className="space-y-2">
                {couriers.map((courier) => (
                  <div
                    key={courier.id}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${statusColors[courier.status] || "bg-gray-400"}`}
                      />
                      <span className="font-medium text-gray-900">
                        {courier.fullName || courier.email}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {statusLabels[courier.status] || courier.status}
                      {courier.vehicleType && ` · ${courier.vehicleType}`}
                    </p>
                    {courier.lat && courier.lng ? (
                      <div className="mt-1 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                          Atualizado: {formatDate(courier.lastLocationAt)}
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${courier.lat},${courier.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Ver no Maps
                        </a>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Sem localização</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1">
          <MapView couriers={couriers} />
        </div>
      </div>
    </div>
  );
}
