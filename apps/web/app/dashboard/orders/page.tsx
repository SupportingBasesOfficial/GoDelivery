import Link from "next/link";
import { getOrders } from "../../actions/orders";
import { listCouriers } from "../../actions/couriers";
import { getCurrentUser } from "../../actions/auth";
import { redirect } from "next/navigation";
import RealtimeOrders from "./realtime-orders";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [ordersResult, couriersResult] = await Promise.all([
    getOrders(),
    listCouriers(),
  ]);
  const orders = ordersResult.ok ? ordersResult.data : [];
  const couriers = couriersResult.ok ? couriersResult.data : [];

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

      <RealtimeOrders initialOrders={orders} couriers={couriers} />
    </div>
  );
}
