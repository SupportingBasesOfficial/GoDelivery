"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "../../../actions/orders";

export default function NewOrderPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const orderValue = parseFloat(formData.get("orderValue") as string) || 0;
    const deliveryFee = parseFloat(formData.get("deliveryFee") as string) || 0;

    const result = await createOrder({
      customerName: formData.get("customerName") as string,
      customerPhone: formData.get("customerPhone") as string,
      pickupAddress: formData.get("pickupAddress") as string,
      pickupLat: undefined,
      pickupLng: undefined,
      deliveryAddress: formData.get("deliveryAddress") as string,
      deliveryLat: undefined,
      deliveryLng: undefined,
      orderValue,
      deliveryFee,
    });

    if (!result.ok) {
      setError(result.error?.message ?? "Erro ao criar pedido");
      setLoading(false);
      return;
    }

    router.push("/dashboard/orders");
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Novo pedido</h2>

      <form
        action={handleSubmit}
        className="space-y-4 rounded-xl bg-white p-6 shadow"
      >
        <div>
          <label
            htmlFor="customerName"
            className="block text-sm font-medium text-gray-700"
          >
            Nome do cliente
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="customerPhone"
            className="block text-sm font-medium text-gray-700"
          >
            Telefone do cliente
          </label>
          <input
            id="customerPhone"
            name="customerPhone"
            type="tel"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="pickupAddress"
            className="block text-sm font-medium text-gray-700"
          >
            Endereço de coleta
          </label>
          <input
            id="pickupAddress"
            name="pickupAddress"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="deliveryAddress"
            className="block text-sm font-medium text-gray-700"
          >
            Endereço de entrega
          </label>
          <input
            id="deliveryAddress"
            name="deliveryAddress"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="orderValue"
              className="block text-sm font-medium text-gray-700"
            >
              Valor do pedido (R$)
            </label>
            <input
              id="orderValue"
              name="orderValue"
              type="number"
              step="0.01"
              min="0"
              defaultValue="0"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="deliveryFee"
              className="block text-sm font-medium text-gray-700"
            >
              Taxa de entrega (R$)
            </label>
            <input
              id="deliveryFee"
              name="deliveryFee"
              type="number"
              step="0.01"
              min="0"
              defaultValue="5"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar pedido"}
          </button>
          <a
            href="/dashboard/orders"
            className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 hover:bg-gray-200"
          >
            Cancelar
          </a>
        </div>
      </form>
    </div>
  );
}
