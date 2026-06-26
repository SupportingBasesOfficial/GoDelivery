"use client";

import { useState, useEffect } from "react";
import {
  getTenantSettings,
  updateTenantSettings,
  getTenantLocation,
  updateTenantLocation,
} from "../../actions/settings";
import type { FeeRange, TenantLocationData } from "../../actions/settings";

interface FeeRangeInput {
  minKm: string;
  maxKm: string;
  fee: string;
}

function toInput(r: FeeRange): FeeRangeInput {
  return {
    minKm: String(r.minKm),
    maxKm: String(r.maxKm),
    fee: String(r.fee),
  };
}

function toRange(r: FeeRangeInput): FeeRange {
  return {
    minKm: parseFloat(r.minKm) || 0,
    maxKm: parseFloat(r.maxKm) || 0,
    fee: parseFloat(r.fee) || 0,
  };
}

export default function SettingsPage() {
  const [feeRanges, setFeeRanges] = useState<FeeRangeInput[]>([]);
  const [tenantLocation, setTenantLocation] = useState<TenantLocationData>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [settingsResult, locationResult] = await Promise.all([
        getTenantSettings(),
        getTenantLocation(),
      ]);
      if (settingsResult.ok) {
        setFeeRanges(settingsResult.data.feeRanges.map(toInput));
      } else {
        setError(settingsResult.error?.message ?? "Erro ao carregar configurações");
      }
      if (locationResult.ok) {
        setTenantLocation(locationResult.data);
      }
      setLoading(false);
    }
    load();
  }, []);

  function addRange() {
    setFeeRanges((prev) => [...prev, { minKm: "0", maxKm: "5", fee: "5" }]);
  }

  function updateRange(index: number, field: keyof FeeRangeInput, value: string) {
    setFeeRanges((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  function removeRange(index: number) {
    setFeeRanges((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateTenantSettings({ feeRanges: feeRanges.map(toRange) });

    if (!result.ok) {
      setError(result.error?.message ?? "Erro ao salvar");
    } else {
      setSuccess(true);
    }

    setSaving(false);
  }

  async function handleSaveLocation() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const lat = tenantLocation.latitude;
    const lng = tenantLocation.longitude;

    const result = await updateTenantLocation({
      address: tenantLocation.address,
      latitude: lat !== null && !isNaN(lat) ? lat : null,
      longitude: lng !== null && !isNaN(lng) ? lng : null,
    });

    if (!result.ok) {
      setError(result.error?.message ?? "Erro ao salvar localização");
    } else {
      setSuccess(true);
    }

    setSaving(false);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Configurações de taxa
      </h2>

      {loading ? (
        <p className="text-gray-600">Carregando...</p>
      ) : (
        <div className="space-y-4 rounded-xl bg-white p-6 shadow">
          <p className="text-sm text-gray-600">
            Defina as faixas de distância e o valor cobrado por cada faixa.
          </p>

          {feeRanges.length === 0 && (
            <p className="text-gray-500">Nenhuma faixa configurada.</p>
          )}

          {feeRanges.map((range, index) => (
            <div key={index} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">
                  Min (km)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={range.minKm}
                  onChange={(e) =>
                    updateRange(index, "minKm", e.target.value)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">
                  Max (km)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={range.maxKm}
                  onChange={(e) =>
                    updateRange(index, "maxKm", e.target.value)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600">
                  Taxa (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={range.fee}
                  onChange={(e) =>
                    updateRange(index, "fee", e.target.value)
                  }
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeRange(index)}
                className="mb-0.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Remover
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRange}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            + Adicionar faixa
          </button>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Configurações salvas com sucesso!
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar configurações"}
          </button>
        </div>
      )}

      <h2 className="mb-6 mt-8 text-2xl font-bold text-gray-900">
        Localização do estabelecimento
      </h2>

      <div className="space-y-4 rounded-xl bg-white p-6 shadow">
        <p className="text-sm text-gray-600">
          Defina o endereço e coordenadas do seu estabelecimento para centralizar o mapa automaticamente.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Endereço
          </label>
          <input
            type="text"
            value={tenantLocation.address}
            onChange={(e) =>
              setTenantLocation((prev) => ({
                ...prev,
                address: e.target.value,
              }))
            }
            placeholder="Rua Exemplo, 123 - Bairro, Cidade/UF"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Latitude
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={tenantLocation.latitude ?? ""}
              onChange={(e) =>
                setTenantLocation((prev) => ({
                  ...prev,
                  latitude: e.target.value === "" ? null : parseFloat(e.target.value),
                }))
              }
              placeholder="-23.5505"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Longitude
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={tenantLocation.longitude ?? ""}
              onChange={(e) =>
                setTenantLocation((prev) => ({
                  ...prev,
                  longitude: e.target.value === "" ? null : parseFloat(e.target.value),
                }))
              }
              placeholder="-46.6333"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveLocation}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar localização"}
        </button>
      </div>
    </div>
  );
}
