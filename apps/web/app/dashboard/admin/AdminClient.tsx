"use client";

import { useState } from "react";
import {
  updatePlatformSettings,
  toggleTenantActive,
} from "../../actions/admin";
import type {
  PlatformSettings,
  TenantAdmin,
  AdminOrder,
  AdminPayment,
  StatusHistoryEntry,
} from "../../actions/admin";

interface AdminClientProps {
  initialSettings: PlatformSettings | null;
  initialTenants: TenantAdmin[];
  initialOrders: AdminOrder[];
  initialPayments: AdminPayment[];
  initialHistory: StatusHistoryEntry[];
}

const tabs = [
  { key: "settings", label: "Configurações" },
  { key: "tenants", label: "Empresas" },
  { key: "orders", label: "Pedidos" },
  { key: "payments", label: "Pagamentos" },
  { key: "audit", label: "Auditoria" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

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

export default function AdminClient({
  initialSettings,
  initialTenants,
  initialOrders,
  initialPayments,
  initialHistory,
}: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("settings");
  const [settings] = useState<PlatformSettings | null>(initialSettings);
  const [tenants, setTenants] = useState<TenantAdmin[]>(initialTenants);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updatePlatformSettings(settings.id, {
      min_tax_fee: parseFloat(formData.get("min_tax_fee") as string),
      platform_percentage: parseFloat(formData.get("platform_percentage") as string),
      is_active: formData.get("is_active") === "on",
    });

    if (!result.ok) {
      setMessage(result.error?.message ?? "Erro ao salvar");
    } else {
      setMessage("Configurações salvas com sucesso!");
    }
    setSaving(false);
  }

  async function handleToggleTenant(tenantId: string, current: boolean) {
    const result = await toggleTenantActive(tenantId, !current);
    if (result.ok) {
      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, is_active: !current } : t)),
      );
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Admin da Plataforma</h2>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="max-w-xl rounded-xl bg-white p-6 shadow">
          <h3 className="mb-4 font-semibold text-gray-900">Configurações Globais</h3>

          {settings ? (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Taxa mínima de entrega (R$)
                </label>
                <input
                  name="min_tax_fee"
                  type="number"
                  step="0.01"
                  defaultValue={settings.min_tax_fee}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  % da plataforma sobre entrega
                </label>
                <input
                  name="platform_percentage"
                  type="number"
                  step="0.01"
                  defaultValue={settings.platform_percentage}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  name="is_active"
                  type="checkbox"
                  defaultChecked={settings.is_active}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="text-sm text-gray-700">Plataforma ativa</label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>

              {message && (
                <p
                  className={`text-sm ${message.includes("sucesso") ? "text-green-600" : "text-red-600"}`}
                >
                  {message}
                </p>
              )}
            </form>
          ) : (
            <p className="text-gray-500">Nenhuma configuração encontrada.</p>
          )}
        </div>
      )}

      {/* Tenants Tab */}
      {activeTab === "tenants" && (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Nome</th>
                <th className="px-4 py-3 font-medium text-gray-700">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-700">Email</th>
                <th className="px-4 py-3 font-medium text-gray-700">Telefone</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Cadastro</th>
                <th className="px-4 py-3 font-medium text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{t.email}</td>
                  <td className="px-4 py-3 text-gray-600">{t.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        t.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {t.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleTenant(t.id, t.is_active)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {t.is_active ? "Desativar" : "Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhuma empresa cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === "orders" && (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Empresa</th>
                <th className="px-4 py-3 font-medium text-gray-700">Cliente</th>
                <th className="px-4 py-3 font-medium text-gray-700">Endereço</th>
                <th className="px-4 py-3 font-medium text-gray-700">Valor</th>
                <th className="px-4 py-3 font-medium text-gray-700">Taxa</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{o.tenant_name}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{o.customer_name}</td>
                  <td className="px-4 py-3 text-gray-600">{o.delivery_address}</td>
                  <td className="px-4 py-3 text-gray-900">R$ {o.order_value.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-900">R$ {o.delivery_fee.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[o.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {statusLabels[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(o.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {initialOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === "payments" && (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Empresa</th>
                <th className="px-4 py-3 font-medium text-gray-700">Valor</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Stripe ID</th>
                <th className="px-4 py-3 font-medium text-gray-700">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{p.tenant_name}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">R$ {p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : p.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.status === "paid" ? "Pago" : p.status === "failed" ? "Falhou" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.stripe_payment_intent_id}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {initialPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === "audit" && (
        <div className="overflow-hidden rounded-xl bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-700">Pedido</th>
                <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 font-medium text-gray-700">Notas</th>
                <th className="px-4 py-3 font-medium text-gray-700">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialHistory.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{h.order_id}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[h.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {statusLabels[h.status] ?? h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{h.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(h.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {initialHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    Nenhum registro de auditoria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
