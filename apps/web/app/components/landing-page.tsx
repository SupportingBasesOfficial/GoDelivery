import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">GoDelivery</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Gerencie suas entregas
          <br />
          <span className="text-blue-600">com inteligência</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
          Plataforma completa para empresários gerenciarem motoboys,
          rotas e entregas em tempo real. Pague apenas pelo que usar.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Começar grátis
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-gray-100 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h3 className="text-center text-2xl font-bold text-gray-900">
          Tudo que você precisa
        </h3>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Rastreamento em tempo real"
            description="Acompanhe a posição dos seus motoboys no mapa com atualizações ao vivo."
            icon="📍"
          />
          <FeatureCard
            title="Gestão de pedidos"
            description="Crie, atribua e acompanhe pedidos de forma simples e organizada."
            icon="📦"
          />
          <FeatureCard
            title="Rotas inteligentes"
            description="Agrupe entregas por região e otimize o percurso dos entregadores."
            icon="🗺️"
          />
          <FeatureCard
            title="Notificações push"
            description="Mantenha motoboys e clientes informados sobre cada etapa da entrega."
            icon="🔔"
          />
          <FeatureCard
            title="Pagamento por uso"
            description="Sem mensalidade. Pague apenas pelas entregas realizadas."
            icon="💳"
          />
          <FeatureCard
            title="Relatórios e KPIs"
            description="Acompanhe métricas de desempenho, tempo médio e satisfação."
            icon="📊"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h3 className="text-center text-2xl font-bold text-gray-900">
            Como funciona
          </h3>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <Step
              number="1"
              title="Cadastre-se"
              description="Crie sua conta em menos de 2 minutos e configure seu estabelecimento."
            />
            <Step
              number="2"
              title="Cadastre motoboys"
              description="Adicione seus entregadores e eles recebem o app no celular."
            />
            <Step
              number="3"
              title="Crie pedidos"
              description="Cadastre entregas, atribua a motoboys e acompanhe tudo em tempo real."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h3 className="text-3xl font-bold text-gray-900">
          Pronto para modernizar suas entregas?
        </h3>
        <p className="mt-4 text-lg text-gray-600">
          Junte-se a dezenas de empresários que já usam o GoDelivery.
        </p>
        <div className="mt-8">
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Criar conta gratuita
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
          <p>GoDelivery — Plataforma de gestão de entregas</p>
          <p className="mt-2">
            <Link href="/login" className="hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">Login</Link>
            {" · "}
            <Link href="/register" className="hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">Cadastro</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
      <div className="text-3xl">{icon}</div>
      <h4 className="mt-4 text-lg font-semibold text-gray-900">{title}</h4>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
        {number}
      </div>
      <h4 className="mt-4 text-lg font-semibold text-gray-900">{title}</h4>
      <p className="mt-2 text-gray-600">{description}</p>
    </div>
  );
}
