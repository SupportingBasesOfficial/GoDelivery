import { updateSession } from "@repo/supabase/middleware";
import { type NextRequest } from "next/server";

/**
 * Middleware do Next.js.
 * Mantém a sessão do Supabase sincronizada no SSR + security headers enterprise.
 */
export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // Security headers enterprise-grade (custo 0)
  const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://*.sentry.io",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(self), microphone=(), camera=()");

  // HSTS apenas em produção (Vercel já adiciona em deploys com HTTPS)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
