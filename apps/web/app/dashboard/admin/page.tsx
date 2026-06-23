import { redirect } from "next/navigation";
import { getCurrentUser } from "../../actions/auth";
import {
  getPlatformSettings,
  getAllTenants,
  getAllOrders,
  getAllPayments,
  getOrderStatusHistory,
} from "../../actions/admin";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const [settingsRes, tenantsRes, ordersRes, paymentsRes, historyRes] = await Promise.all([
    getPlatformSettings(),
    getAllTenants(),
    getAllOrders(),
    getAllPayments(),
    getOrderStatusHistory(),
  ]);

  return (
    <AdminClient
      initialSettings={settingsRes.ok ? settingsRes.data : null}
      initialTenants={tenantsRes.ok ? tenantsRes.data : []}
      initialOrders={ordersRes.ok ? ordersRes.data : []}
      initialPayments={paymentsRes.ok ? paymentsRes.data : []}
      initialHistory={historyRes.ok ? historyRes.data : []}
    />
  );
}
