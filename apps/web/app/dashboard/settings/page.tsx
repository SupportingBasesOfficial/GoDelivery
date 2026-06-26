"use client";

import { useState, useEffect } from "react";
import {
  getTenantSettings,
  updateTenantSettings,
  getTenantLocation,
  updateTenantLocation,
} from "../../actions/settings";
import type { FeeRange, TenantLocationData } from "../../actions/settings";

// Interface para endereço estruturado
interface AddressInput {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

function toAddressInput(location: TenantLocationData): AddressInput {
  // Tenta extrair partes do endereço existente
  const parts = location.address?.split(",") ?? ["", "", "", "", "", ""];
  return {
    street: parts[0]?.trim() ?? "",
    number: parts[1]?.trim() ?? "",
    neighborhood: parts[2]?.trim() ?? "",
    city: parts[3]?.trim() ?? "",
    state: parts[4]?.trim() ?? "",
    zipCode: parts[5]?.trim() ?? "",
  };
}

function toAddressString(addr: AddressInput): string {
  return `${addr.street}, ${addr.number}, ${addr.neighborhood}, ${addr.city}, ${addr.state}, ${addr.zipCode}`;
}

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
  const [address, setAddress] = useState<AddressInput>({
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [geocoding, setGeocoding] = useState(false);
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
        setAddress(toAddressInput(locationResult.data));
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

  async function geocodeAddress() {
    const query = toAddressString(address);
    if (!address.street || !address.city) {
      setError("Preencha pelo menos rua e cidade para buscar coordenadas");
      return;
    }

    setGeocoding(true);
    setError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { "User-Agent": "GoDelivery/1.0" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setTenantLocation((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lon,
        }));
      } else {
        setError("Endereço não encontrado. Tente adicionar mais detalhes.");
      }
    } catch {
      setError("Erro ao buscar coordenadas. Tente novamente.");
    }
    setGeocoding(false);
  }

  async function handleSaveLocation() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateTenantLocation({
      address: toAddressString(address),
      latitude: tenantLocation.latitude,
      longitude: tenantLocation.longitude,
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
          Informe o endereço do seu estabelecimento. As coordenadas serão buscadas automaticamente.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Rua</label>
            <input
              type="text"
              value={address.street}
              onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
              placeholder="Av. Paulista"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Número</label>
            <input
              type="text"
              value={address.number}
              onChange={(e) => setAddress((prev) => ({ ...prev, number: e.target.value }))}
              placeholder="1000"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Bairro</label>
            <input
              type="text"
              value={address.neighborhood}
              onChange={(e) => setAddress((prev) => ({ ...prev, neighborhood: e.target.value }))}
              placeholder="Bela Vista"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cidade</label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="São Paulo"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Estado</label>
            <input
              type="text"
              value={address.state}
              onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
              placeholder="SP"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CEP</label>
            <input
              type="text"
              value={address.zipCode}
              onChange={(e) => setAddress((prev) => ({ ...prev, zipCode: e.target.value }))}
              placeholder="01310-100"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={geocodeAddress}
            disabled={geocoding}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {geocoding ? "Buscando..." : "Buscar coordenadas"}
          </button>

          {tenantLocation.latitude !== null && tenantLocation.longitude !== null && (
            <span className="text-sm text-green-600">
              Lat: {tenantLocation.latitude.toFixed(5)}, Lng: {tenantLocation.longitude.toFixed(5)}
            </span>
          )}
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
