import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <p className="mt-4 text-xl text-gray-600">Página não encontrada</p>
        <p className="mt-2 text-gray-500">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Ir para o início
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-gray-100 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            Painel
          </Link>
        </div>
      </div>
    </div>
  );
}
