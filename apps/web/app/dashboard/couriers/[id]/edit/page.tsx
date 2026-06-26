"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { getCourier, updateCourier } from "../../../../actions/couriers";
import type { CourierData } from "../../../../actions/couriers";

export default function EditCourierPage() {
  const router = useRouter();
  const params = useParams();
  const courierId = params.id as string;

  const [courier, setCourier] = useState<CourierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourier = useCallback(async () => {
    setLoading(true);
    const result = await getCourier(courierId);
    if (result.ok) {
      setCourier(result.data);
      setError(null);
    } else {
      setError(result.error?.message ?? "Erro ao carregar entregador");
    }
    setLoading(false);
  }, [courierId]);

  useEffect(() => {
    loadCourier();
  }, [loadCourier]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!courier) return;

    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateCourier({
      id: courierId,
      fullName: formData.get("fullName") as string,
      phone: formData.get("phone") as string,
      licenseNumber: formData.get("licenseNumber") as string,
      vehiclePlate: formData.get("vehiclePlate") as string,
      vehicleType: formData.get("vehicleType") as string,
    });

    if (!result.ok) {
      setError(result.error?.message ?? "Erro ao salvar");
      setSaving(false);
      return;
    }

    router.push("/dashboard/couriers");
  }

  if (loading) {
    return (
      <div className="max-w-lg">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  if (error && !courier) {
    return (
      <div className="max-w-lg">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Editar entregador</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nome completo
          </label>
          <input
            name="fullName"
            type="text"
            required
            defaultValue={courier?.fullName}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Telefone
          </label>
          <input
            name="phone"
            type="tel"
            required
            defaultValue={courier?.phone}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Número da CNH
          </label>
          <input
            name="licenseNumber"
            type="text"
            required
            defaultValue={courier?.licenseNumber}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Placa do veículo
          </label>
          <input
            name="vehiclePlate"
            type="text"
            required
            defaultValue={courier?.vehiclePlate}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tipo de veículo
          </label>
          <input
            name="vehicleType"
            type="text"
            required
            placeholder="Moto, Bike, Carro..."
            defaultValue={courier?.vehicleType}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Status:</span>{" "}
            {courier?.status === "available"
              ? "Disponível"
              : courier?.status === "busy"
                ? "Em entrega"
                : "Offline"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/couriers")}
            className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
