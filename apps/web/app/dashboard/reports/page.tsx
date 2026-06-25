"use client";

import { useEffect, useState, useCallback } from "react";
import { getReports } from "../../actions/reports";
import type { ReportsData } from "../../actions/reports";
import {
  OrdersDailyChart,
  RevenueDailyChart,
  StatusPieChart,
  CourierPerformanceChart,
} from "./charts";

function formatCurrency(value: number) {
  return `R$ ${value.toFixed(2)}`;
}

function formatMinutes(min: number | null) {
  if (min === null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getReports(
      fromDate || undefined,
      toDate || undefined,
    );
    if (result.ok) {
      setData(result.data);
    } else {
      setError(result.error?.message ?? "Erro ao carregar relatórios");
    }
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const overall = data?.overall;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900">Relatórios & KPIs</h2>
        <div className="flex gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={load}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Filtrar
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando relatórios...</p>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">{error}</div>
      ) : !overall ? (
        <p className="text-gray-500">Sem dados.</p>
      ) : (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total de pedidos"
              value={overall.totalOrders.toString()}
              color="blue"
            />
            <KpiCard
              label="Taxa de conclusão"
              value={`${overall.completionRate}%`}
              color="green"
            />
            <KpiCard
              label="Receita total"
              value={formatCurrency(overall.totalRevenue)}
              color="purple"
            />
            <KpiCard
              label="Taxas de entrega"
              value={formatCurrency(overall.totalFees)}
              color="orange"
            />
            <KpiCard
              label="Tempo médio de entrega"
              value={formatMinutes(overall.avgDeliveryTimeMinutes)}
              color="teal"
            />
            <KpiCard
              label="Tempo médio de aceite"
              value={formatMinutes(overall.avgAcceptTimeMinutes)}
              color="cyan"
            />
            <KpiCard
              label="Tempo médio de coleta"
              value={formatMinutes(overall.avgCollectTimeMinutes)}
              color="indigo"
            />
            <KpiCard
              label="Cancelados / Recusados"
              value={`${overall.cancelledOrders} / ${overall.rejectedOrders}`}
              color="red"
            />
          </div>

          {/* Gráficos */}
          {data?.daily && data.daily.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl bg-white p-4 shadow">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  Pedidos por dia
                </h3>
                <OrdersDailyChart data={data} />
              </section>
              <section className="rounded-xl bg-white p-4 shadow">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  Receita por dia
                </h3>
                <RevenueDailyChart data={data} />
              </section>
              <section className="rounded-xl bg-white p-4 shadow">
                <h3 className="mb-3 text-lg font-semibold text-gray-900">
                  Distribuição de status
                </h3>
                <StatusPieChart data={data} />
              </section>
              {data.couriers.length > 0 && (
                <section className="rounded-xl bg-white p-4 shadow">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900">
                    Desempenho por entregador
                  </h3>
                  <CourierPerformanceChart data={data} />
                </section>
              )}
            </div>
          )}

          {/* Tabela por entregador */}
          {data?.couriers && data.couriers.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Desempenho por entregador
              </h3>
              <div className="overflow-x-auto rounded-xl bg-white shadow">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                      <th className="px-4 py-3">Entregador</th>
                      <th className="px-4 py-3">Pedidos</th>
                      <th className="px-4 py-3">Entregues</th>
                      <th className="px-4 py-3">Recusados</th>
                      <th className="px-4 py-3">Cancelados</th>
                      <th className="px-4 py-3">Taxa de sucesso</th>
                      <th className="px-4 py-3">Receita</th>
                      <th className="px-4 py-3">Taxas</th>
                      <th className="px-4 py-3">Tempo médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.couriers.map((c) => {
                      const successRate =
                        c.totalOrders > 0
                          ? Math.round((c.delivered / c.totalOrders) * 100)
                          : 0;
                      return (
                        <tr
                          key={c.courierId}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {c.courierName}
                          </td>
                          <td className="px-4 py-3">{c.totalOrders}</td>
                          <td className="px-4 py-3 text-green-600">{c.delivered}</td>
                          <td className="px-4 py-3 text-red-600">{c.rejected}</td>
                          <td className="px-4 py-3 text-yellow-600">{c.cancelled}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                successRate >= 80
                                  ? "bg-green-100 text-green-700"
                                  : successRate >= 50
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {successRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrency(c.totalRevenue)}
                          </td>
                          <td className="px-4 py-3">{formatCurrency(c.totalFees)}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatMinutes(c.avgDeliveryTimeMinutes)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
    teal: "bg-teal-50 text-teal-700",
    cyan: "bg-cyan-50 text-cyan-700",
    indigo: "bg-indigo-50 text-indigo-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className={`rounded-xl p-5 ${colorMap[color] || "bg-gray-50 text-gray-700"}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
