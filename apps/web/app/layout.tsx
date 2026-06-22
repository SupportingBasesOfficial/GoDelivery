import "@repo/tailwind-config/globals.css";

export const metadata = {
  title: "GoDelivery — Painel do Empresário",
  description: "Plataforma multi-tenant de gestão de motoboys e entregas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
