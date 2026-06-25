"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@repo/supabase/client";
import { listCouriers } from "../../actions/couriers";
import type { CourierData } from "../../actions/couriers";

const supabase = createClient();

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<CourierData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const result = await listCouriers();
      if (result.ok) {
        setCouriers(result.data);
      } else {
        setError(result.error?.message ?? "Erro ao carregar motoboys");
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("couriers_page_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couriers" },
        (payload) => {
          console.warn("[Couriers Realtime] UPDATE:", payload.new);
          const updated = payload.new as CourierData;
          setCouriers((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          );
        }
      )
      .subscribe((status) => {
        console.warn("[Couriers Realtime] status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const statusLabels: Record<string, string> = {
    available: "Disponível",
    offline: "Offline",
    busy: "Em entrega",
  };

  const statusColors: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    offline: "bg-gray-100 text-gray-700",
    busy: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Motoboys</h2>
        <Link
          href="/dashboard/couriers/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Cadastrar motoboy
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando...</p>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      ) : couriers.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <p className="text-gray-500">Nenhum motoboy cadastrado.</p>
          <Link
            href="/dashboard/couriers/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Cadastrar primeiro motoboy
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {couriers.map((courier) => (
            <div
              key={courier.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 shadow"
            >
              <div>
                <h3 className="font-semibold text-gray-900">
                  {courier.fullName || courier.email}
                </h3>
                <p className="text-sm text-gray-500">{courier.email}</p>
                <p className="text-sm text-gray-500">
                  {courier.vehiclePlate} — {courier.vehicleType}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[courier.status] || statusColors.offline}`}
              >
                {statusLabels[courier.status] || courier.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
