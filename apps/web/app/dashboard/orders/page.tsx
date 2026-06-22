import Link from "next/link";
import { getOrders } from "../../actions/orders";
import { getCurrentUser } from "../../actions/auth";
import { redirect } from "next/navigation";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const ordersResult = await getOrders();
  const orders = ordersResult.ok ? ordersResult.data : [];

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    pending_courier: "Aguardando motoboy",
    accepted: "Aceito",
    collected: "Coletado",
    in_transit: "Em rota",
    delivered: "Entregue",
    rejected: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_courier: "bg-yellow-100 text-yellow-700",
    accepted: "bg-blue-100 text-blue-700",
    collected: "bg-purple-100 text-purple-700",
    in_transit: "bg-indigo-100 text-indigo-700",
    delivered: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Pedidos</h2>
        <Link
          href="/dashboard/orders/new"
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Novo pedido
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <p className="text-gray-600">Nenhum pedido encontrado.</p>
          <p className="mt-2 text-sm text-gray-500">
            Crie seu primeiro pedido clicando no botão acima.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-700">
                  Endereço de entrega
                </th>
                <th className="px-4 py-3 font-medium text-gray-700">Valor</th>
                <th className="px-4 py-3 font-medium text-gray-700">Taxa</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {order.customer_name}
                    <div className="text-xs text-gray-500">
                      {order.customer_phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.delivery_address}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    R$ {order.order_value.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    R$ {order.delivery_fee.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
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
