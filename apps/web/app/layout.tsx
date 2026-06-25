import "@repo/tailwind-config/globals.css";
import "leaflet/dist/leaflet.css";

export const metadata = {
  title: "GoDelivery — Painel do Empresário",
  description: "Plataforma multi-tenant de gestão de motoboys e entregas",
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white"
        >
          Pular para o conteúdo principal
        </a>
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
