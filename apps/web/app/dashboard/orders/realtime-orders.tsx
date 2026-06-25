"use client";

import { useEffect, useState } from "react";
import { createClient } from "@repo/supabase/client";
import OrderActions from "./order-actions";
import type { Order } from "../../actions/orders";
import type { CourierData } from "../../actions/couriers";

const supabase = createClient();

interface RealtimeOrdersProps {
  initialOrders: Order[];
  couriers: CourierData[];
}

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  pending_courier: "Aguardando motoboy",
  accepted: "Aceito",
  collected: "Coletado",
  in_transit: "Em rota",
  delivered: "Entregue",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_courier: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  collected: "bg-purple-100 text-purple-700",
  in_transit: "bg-indigo-100 text-indigo-700",
  delivered: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function RealtimeOrders({ initialOrders, couriers: initialCouriers }: RealtimeOrdersProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [couriers, setCouriers] = useState<CourierData[]>(initialCouriers);
  const [connectionStatus, setConnectionStatus] = useState<string>("conectando...");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    console.warn("[RealtimeOrders] useEffect EXECUTADO");

    const ordersChannel = supabase
      .channel("orders_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          console.warn("[Realtime] Order UPDATE:", payload.new);
          const updated = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          console.warn("[Realtime] Order INSERT:", payload.new);
          const inserted = payload.new as Order;
          setOrders((prev) => [inserted, ...prev]);
        }
      )
      .subscribe((status) => {
        console.warn("[Realtime] Orders channel status:", status);
      });

    const couriersChannel = supabase
      .channel("couriers_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couriers" },
        (payload) => {
          console.warn("[Realtime] Courier UPDATE:", payload.new);
          const updated = payload.new as { id: string; status: string };
          setCouriers((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, status: updated.status } : c))
          );
        }
      )
      .subscribe((status) => {
        console.warn("[Realtime] Couriers channel status:", status);
        setConnectionStatus(status === "SUBSCRIBED" ? "conectado" : status);
      });

    return () => {
      console.warn("[Realtime] Removendo channels");
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(couriersChannel);
    };
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchQuery === "" ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery) ||
      order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="text-gray-600">Nenhum pedido encontrado.</p>
        <p className="mt-2 text-sm text-gray-500">
          Crie seu primeiro pedido clicando no botão acima.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow">
      {/* Filtros */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              type="text"
              aria-label="Buscar pedidos por cliente, telefone ou endereço"
              placeholder="Buscar por cliente, telefone ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <select
            aria-label="Filtrar pedidos por status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {(searchQuery || statusFilter) && (
            <button
              onClick={() => { setSearchQuery(""); setStatusFilter(""); }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Mostrando {filteredOrders.length} de {orders.length} pedidos
        </div>
      </div>

      {/* DEBUG: Remover depois */}
      <div className="bg-yellow-100 border border-yellow-300 px-4 py-1 text-xs text-yellow-800">
        DEBUG: RealtimeOrders renderizado | Status: {connectionStatus} | Pedidos: {orders.length} | Motoboys: {couriers.length}
      </div>
      <div className="flex items-center justify-end border-b border-gray-100 bg-gray-50 px-4 py-2">
        <span className={`inline-block h-2 w-2 rounded-full mr-2 ${connectionStatus === "conectado" ? "bg-green-500" : "bg-red-500 animate-pulse"}`} />
        <span className="text-xs text-gray-500">Realtime: {connectionStatus}</span>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-700">Cliente</th>
            <th className="px-4 py-3 font-medium text-gray-700">Endereço de entrega</th>
            <th className="px-4 py-3 font-medium text-gray-700">Valor</th>
            <th className="px-4 py-3 font-medium text-gray-700">Taxa</th>
            <th className="px-4 py-3 font-medium text-gray-700">Status</th>
            <th className="px-4 py-3 font-medium text-gray-700">Data</th>
            <th className="px-4 py-3 font-medium text-gray-700">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredOrders.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                Nenhum pedido encontrado com os filtros aplicados.
              </td>
            </tr>
          )}
          {filteredOrders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">
                {order.customer_name}
                <div className="text-xs text-gray-500">{order.customer_phone}</div>
              </td>
              <td className="px-4 py-3 text-gray-600">{order.delivery_address}</td>
              <td className="px-4 py-3 text-gray-900">R$ {order.order_value.toFixed(2)}</td>
              <td className="px-4 py-3 text-gray-900">R$ {order.delivery_fee.toFixed(2)}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    statusColors[order.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {statusLabels[order.status] ?? order.status}
                </span>
                {order.status === "pending_courier" && order.courier_notified_at && (
                  <div className="mt-1 text-[10px] text-green-600">
                    Notificado {new Date(order.courier_notified_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
                {order.status === "pending_courier" && !order.courier_notified_at && (
                  <div className="mt-1 text-[10px] text-orange-600">
                    Motoboy ainda nao notificado
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(order.created_at).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3">
                <OrderActions orderId={order.id} status={order.status} couriers={couriers} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
