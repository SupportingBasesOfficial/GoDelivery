"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@repo/supabase/client";
import { getCouriersWithLocation, getTenantLocation } from "../../actions/couriers";
import type { CourierWithLocation, TenantLocation } from "../../actions/couriers";

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
const MapView = dynamic<{
  couriers: CourierWithLocation[];
  tenantLocation: TenantLocation | null;
  focusTarget?: { type: "tenant" } | { type: "courier"; courierId: string } | null;
}>(
  () => import("./MapView"),
  { ssr: false }
);

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

/**
 * Retorna true se a ultima localizacao for mais antiga que o threshold (2 min).
 * Usado para tratar entregadores que ficaram stale (app fechou/crashou) como offline.
 */
function isLocationStale(lastLocationAt: string | null): boolean {
  if (!lastLocationAt) return true;
  const STALE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos
  return Date.now() - new Date(lastLocationAt).getTime() > STALE_THRESHOLD_MS;
}

/**
 * Status efetivo: se o banco diz "available" ou "busy" mas a localizacao
 * esta stale (app fechou), consideramos offline visualmente.
 */
function getEffectiveStatus(courier: CourierWithLocation): string {
  if (courier.status === "offline") return "offline";
  if (isLocationStale(courier.lastLocationAt)) return "offline";
  return courier.status;
}

export default function MapPage() {
  const [couriers, setCouriers] = useState<CourierWithLocation[]>([]);
  const [tenantLocation, setTenantLocation] = useState<TenantLocation | null>(null);
  const [focusTarget, setFocusTarget] = useState<
    { type: "tenant" } | { type: "courier"; courierId: string } | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("conectando...");

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    const [couriersResult, tenantResult] = await Promise.all([
      getCouriersWithLocation(),
      getTenantLocation(),
    ]);
    if (couriersResult.ok) {
      console.log("[MapPage] couriers:", couriersResult.data);
      setCouriers(couriersResult.data);
    } else {
      console.error("[MapPage] couriers error:", couriersResult.error);
      setError(couriersResult.error?.message ?? "Erro ao carregar entregadores");
    }
    if (tenantResult.ok) {
      setTenantLocation(tenantResult.data);
    } else {
      console.error("[MapPage] getTenantLocation failed:", tenantResult.error);
      setError((prev) =>
        prev ? prev + " | " + (tenantResult.error?.message ?? "Erro ao carregar localização") : tenantResult.error?.message ?? "Erro ao carregar localização"
      );
    }
    if (showLoading) setLoading(false);
  }

  useEffect(() => {
    load();

    // Realtime: atualiza posicoes e dados dos couriers automaticamente
    const channel = supabase
      .channel("courier_locations")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couriers" },
        (payload) => {
          console.log("[Map Realtime] Evento UPDATE couriers:", payload.new);
          const raw = payload.new as Record<string, unknown>;
          const updated: Partial<CourierWithLocation> = {
            id: raw.id as string,
            status: raw.status as string,
            lat: raw.current_location_lat as number | null,
            lng: raw.current_location_lng as number | null,
            lastLocationAt: raw.last_location_at as string | null,
            vehicleType: raw.vehicle_type as string | null,
            vehiclePlate: raw.vehicle_plate as string | null,
          };
          setCouriers((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          console.log("[Map Realtime] Evento UPDATE profiles:", payload.new);
          const raw = payload.new as Record<string, unknown>;
          const updatedId = raw.id as string;
          if (!updatedId) return;

          setCouriers((prev) =>
            prev.map((c) =>
              c.id === updatedId
                ? {
                    ...c,
                    fullName: (raw.full_name as string) ?? c.fullName,
                    phone: (raw.phone as string) ?? c.phone,
                  }
                : c
            )
          );
        }
      )
      .subscribe((status) => {
        console.log("[Map Realtime] Status canal:", status);
        setConnectionStatus(status === "SUBSCRIBED" ? "conectado" : status);
      });

    // Fallback: recarrega dados a cada 15s caso o realtime falhe (silencioso, sem piscar)
    const pollInterval = setInterval(() => {
      console.log("[Map Poll] Recarregando dados do mapa...");
      load(false);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
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
              Disponível ({couriers.filter((c) => getEffectiveStatus(c) === "available").length})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-yellow-500" />
              Em entrega ({couriers.filter((c) => getEffectiveStatus(c) === "busy").length})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gray-400" />
              Offline ({couriers.filter((c) => getEffectiveStatus(c) === "offline").length})
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
          {tenantLocation?.lat && tenantLocation?.lng && (
            <button
              type="button"
              onClick={() => setFocusTarget({ type: "tenant" })}
              className="rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200"
            >
              Focar estabelecimento
            </button>
          )}
          <Link
            href="/dashboard/couriers"
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Entregadores
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
            ) : couriers.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum entregador cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {couriers.map((courier) => (
                  <div
                    key={courier.id}
                    className={`rounded-lg border p-3 text-sm ${courier.lat && courier.lng ? "cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${statusColors[getEffectiveStatus(courier)] || "bg-gray-400"}`}
                      />
                      <span className="font-medium text-gray-900">
                        {courier.fullName || courier.phone || courier.vehiclePlate || "Entregador"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {statusLabels[getEffectiveStatus(courier)] || getEffectiveStatus(courier)}
                      {courier.vehicleType && ` · ${courier.vehicleType}`}
                    </p>
                    {courier.lat && courier.lng && getEffectiveStatus(courier) !== "offline" ? (
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-gray-400">
                          Atualizado: {formatDate(courier.lastLocationAt)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setFocusTarget({ type: "courier", courierId: courier.id })}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Focar no mapa
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-orange-500">
                        {getEffectiveStatus(courier) === "offline"
                          ? courier.statusReason ?? "Offline — sem localização ativa"
                          : courier.lat && courier.lng
                            ? "Localização desatualizada"
                            : "Sem localização registrada"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="flex-1">
          <MapView couriers={couriers} tenantLocation={tenantLocation} focusTarget={focusTarget} />
        </div>
      </div>
    </div>
  );
}
