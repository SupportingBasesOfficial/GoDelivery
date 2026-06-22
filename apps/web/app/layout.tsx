import "@repo/tailwind-config/globals.css";

export const metadata = {
  title: "Base Template",
  description:
    "Base Template Universal - Monorepo Turborepo + Next.js + Supabase",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
