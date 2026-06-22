import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "../actions/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">GoDelivery</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.fullName ?? user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Painel do Empresário
          </h2>
          <p className="mt-1 text-gray-600">
            Bem-vindo, {user.fullName ?? user.email}. Aqui você gerencia suas
            entregas e motoboys.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="font-semibold text-gray-900">Entregas hoje</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">0</p>
            <p className="mt-1 text-sm text-gray-500">
              Em breve: integração com pedidos
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="font-semibold text-gray-900">Motoboys ativos</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">0</p>
            <p className="mt-1 text-sm text-gray-500">
              Em breve: gestão de couriers
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <h3 className="font-semibold text-gray-900">Taxa de entrega</h3>
            <p className="mt-2 text-3xl font-bold text-purple-600">R$ 0,00</p>
            <p className="mt-1 text-sm text-gray-500">
              Em breve: configuração de faixas
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
