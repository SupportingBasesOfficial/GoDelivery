"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getRoutes, createRoute, endRoute, getVehicleTypes } from "../../actions/routes";
import { listCouriers } from "../../actions/couriers";
import type { RouteWithOrders } from "../../actions/routes";
import type { CourierData } from "../../actions/couriers";

const statusLabels: Record<string, string> = {
  active: "Ativa",
  paused: "Pausada",
  completed: "Finalizada",
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-600",
};

const orderStatusLabels: Record<string, string> = {
  pending_courier: "Pendente",
  accepted: "Aceito",
  collected: "Coletado",
  in_transit: "Em rota",
  delivered: "Entregue",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

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

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteWithOrders[]>([]);
  const [couriers, setCouriers] = useState<CourierData[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState({
    courierId: "",
    vehicleType: "",
    status: "",
    fromDate: "",
    toDate: "",
  });

  async function loadData() {
    setLoading(true);
    const [routesResult, couriersResult, vehicleResult] = await Promise.all([
      getRoutes({
        courierId: filters.courierId || undefined,
        vehicleType: filters.vehicleType || undefined,
        status: filters.status || undefined,
        fromDate: filters.fromDate || undefined,
        toDate: filters.toDate || undefined,
      }),
      listCouriers(),
      getVehicleTypes(),
    ]);

    if (routesResult.ok) setRoutes(routesResult.data);
    if (couriersResult.ok) setCouriers(couriersResult.data);
    if (vehicleResult.ok) setVehicleTypes(vehicleResult.data);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timeout);
  }, [filters.courierId, filters.vehicleType, filters.status, filters.fromDate, filters.toDate]);

  const activeRoutes = routes.filter((r) => r.status === "active");
  const completedRoutes = routes.filter((r) => r.status === "completed");

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Rotas de Entrega</h2>
        <div className="flex gap-2">
          <Link
            href="/dashboard/orders"
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            ← Pedidos
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow md:grid-cols-5">
        <select
          value={filters.courierId}
          onChange={(e) => setFilters((f) => ({ ...f, courierId: e.target.value }))}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os entregadores</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName || c.email}
            </option>
          ))}
        </select>

        <select
          value={filters.vehicleType}
          onChange={(e) => setFilters((f) => ({ ...f, vehicleType: e.target.value }))}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os veículos</option>
          {vehicleTypes.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativa</option>
          <option value="completed">Finalizada</option>
        </select>

        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="De"
        />

        <input
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="Até"
        />
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando rotas...</p>
      ) : (
        <div className="space-y-8">
          {/* Rotas Ativas */}
          {activeRoutes.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Rotas Ativas ({activeRoutes.length})
              </h3>
              <div className="space-y-4">
                {activeRoutes.map((route) => (
                  <RouteCard key={route.id} route={route} onEnd={() => loadData()} />
                ))}
              </div>
            </section>
          )}

          {/* Rotas Finalizadas */}
          {completedRoutes.length > 0 && (
            <section>
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Rotas Finalizadas ({completedRoutes.length})
              </h3>
              <div className="space-y-4">
                {completedRoutes.map((route) => (
                  <RouteCard key={route.id} route={route} onEnd={() => {}} />
                ))}
              </div>
            </section>
          )}

          {routes.length === 0 && (
            <p className="text-gray-500">Nenhuma rota encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

function RouteCard({
  route,
  onEnd,
}: {
  route: RouteWithOrders;
  onEnd: () => Promise<void> | void;
}) {
  const completedCount = route.orders.filter((o) => o.status === "delivered").length;
  const cancelledCount = route.orders.filter((o) => o.status === "cancelled").length;
  const totalValue = route.orders.reduce((sum, o) => sum + (o.order_value ?? 0), 0);
  const totalFee = route.orders.reduce((sum, o) => sum + (o.delivery_fee ?? 0), 0);

  const [expanded, setExpanded] = useState(false);
  const [ending, setEnding] = useState(false);

  return (
    <div className="rounded-xl bg-white p-5 shadow">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              statusColors[route.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {statusLabels[route.status] || route.status}
          </span>
          <span className="text-sm text-gray-500">
            🏍 {route.courier_name || route.courier_email || "Entregador"}
          </span>
          {route.vehicle_type && (
            <span className="text-xs text-gray-500">
              {route.vehicle_type} {route.vehicle_plate ? `(${route.vehicle_plate})` : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Início: {formatDate(route.started_at)}
          </span>
          {route.ended_at && (
            <span className="text-sm text-gray-500">
              Fim: {formatDate(route.ended_at)}
            </span>
          )}
          {route.status === "active" && (
            <button
              onClick={async () => {
                setEnding(true);
                await endRoute(route.id);
                await onEnd();
                setEnding(false);
              }}
              disabled={ending}
              className="rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              {ending ? "..." : "Finalizar rota"}
            </button>
          )}
        </div>
      </div>

      {/* Resumo */}
      <div className="mt-3 grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 md:grid-cols-4">
        <div>
          <p className="text-xs text-gray-500">Pedidos</p>
          <p className="text-lg font-semibold text-gray-900">{route.orders.length}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Entregues</p>
          <p className="text-lg font-semibold text-green-600">{completedCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Valor total</p>
          <p className="text-lg font-semibold text-gray-900">
            R$ {totalValue.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Taxas de entrega</p>
          <p className="text-lg font-semibold text-gray-900">
            R$ {totalFee.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Toggle detalhes */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-sm text-blue-600 hover:underline"
      >
        {expanded ? "▲ Ocultar pedidos" : `▼ Ver ${route.orders.length} pedidos`}
      </button>

      {/* Lista de pedidos */}
      {expanded && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Endereço de entrega</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Aceite</th>
                <th className="py-2 pr-4">Coleta</th>
                <th className="py-2 pr-4">Entrega</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {route.orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4">
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                  </td>
                  <td className="py-2 pr-4">
                    <span className="text-xs font-medium">
                      {orderStatusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{order.delivery_address}</td>
                  <td className="py-2 pr-4">
                    R$ {(order.order_value + order.delivery_fee).toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 text-gray-500">{formatDate(order.accepted_at)}</td>
                  <td className="py-2 pr-4 text-gray-500">{formatDate(order.collected_at)}</td>
                  <td className="py-2 pr-4 text-gray-500">{formatDate(order.delivered_at)}</td>
                  <td className="py-2">
                    <Link
                      href={`/dashboard/orders/${order.id}/timeline`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Auditoria
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
