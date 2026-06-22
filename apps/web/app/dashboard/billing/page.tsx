"use client";

import { useState } from "react";
import { createSetupIntent } from "../../actions/stripe";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  async function handleAddCard() {
    setLoading(true);
    setError(null);

    const result = await createSetupIntent();

    if (!result.ok) {
      setError(result.error?.message ?? "Erro ao iniciar cadastro de cartão");
      setLoading(false);
      return;
    }

    setClientSecret(result.data.clientSecret);
    setLoading(false);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Pagamentos</h2>

      <div className="space-y-4 rounded-xl bg-white p-6 shadow">
        <p className="text-gray-600">
          O GoDelivery opera no modelo pay-as-you-go. Cadastre um cartão de
          crédito para ser cobrado automaticamente a cada entrega concluída.
        </p>

        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">Como funciona</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
            <li>Cadastre seu cartão uma única vez</li>
            <li>A cada entrega entregue, cobramos a taxa de entrega</li>
            <li>Sem mensalidade, sem taxa mínima</li>
          </ul>
        </div>

        {!clientSecret ? (
          <button
            type="button"
            onClick={handleAddCard}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Cadastrar cartão"}
          </button>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              SetupIntent criado com sucesso!
            </p>
            <p className="mt-1 text-xs text-green-700">
              Em produção, integrar com Stripe Elements para coletar os dados do
              cartão de forma segura.
            </p>
            <p className="mt-2 break-all text-xs text-gray-600">
              Client Secret: {clientSecret}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    </div>
  );
}
