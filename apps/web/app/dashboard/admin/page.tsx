import { redirect } from "next/navigation";
import { getCurrentUser } from "../../actions/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-4xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Admin da Plataforma</h2>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-gray-900">Configurações globais</h3>
          <p className="mt-2 text-gray-600">
            Em produção: editar platform_settings, taxa mínima e % da plataforma.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-gray-900">Tenants</h3>
          <p className="mt-2 text-gray-600">
            Em produção: listar todas as empresas cadastradas.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-gray-900">Pagamentos</h3>
          <p className="mt-2 text-gray-600">
            Em produção: visão geral de receitas e transações Stripe.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-gray-900">Logs e auditoria</h3>
          <p className="mt-2 text-gray-600">
            Em produção: order_status_history e eventos do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
