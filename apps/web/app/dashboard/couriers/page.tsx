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
        setError(result.error?.message ?? "Erro ao carregar entregadores");
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("couriers_page_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couriers" },
        async (payload) => {
          const raw = payload.new as Record<string, unknown>;
          const updatedId = raw.id as string;

          if (!updatedId) {
            const result = await listCouriers();
            if (result.ok) setCouriers(result.data);
            return;
          }

          setCouriers((prev) =>
            prev.map((c) =>
              c.id === updatedId
                ? {
                    ...c,
                    status: (raw.status as string) ?? c.status,
                    licenseNumber: (raw.license_number as string) ?? c.licenseNumber,
                    vehiclePlate: (raw.vehicle_plate as string) ?? c.vehiclePlate,
                    vehicleType: (raw.vehicle_type as string) ?? c.vehicleType,
                  }
                : c
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "couriers" },
        async () => {
          const result = await listCouriers();
          if (result.ok) setCouriers(result.data);
        }
      )
      .subscribe((status) => {
        console.warn("[Couriers Realtime] channel status:", status);
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
        <h2 className="text-2xl font-bold text-gray-900">Entregadores</h2>
        <Link
          href="/dashboard/couriers/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Cadastrar entregador
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando...</p>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      ) : couriers.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <p className="text-gray-500">Nenhum entregador cadastrado.</p>
          <Link
            href="/dashboard/couriers/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Cadastrar primeiro entregador
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
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[courier.status] || statusColors.offline}`}
                >
                  {statusLabels[courier.status] || courier.status}
                </span>
                <Link
                  href={`/dashboard/couriers/${courier.id}/edit`}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
