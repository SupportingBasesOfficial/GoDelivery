import { NextResponse } from "next/server";

/**
 * Health check endpoint.
 *
 * Use para monitoramento e load balancers.
 * Retorna 200 se o app está rodando.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
