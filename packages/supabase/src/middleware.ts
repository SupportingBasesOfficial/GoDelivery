import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

type CookieOptions = Parameters<
  NonNullable<CookieMethodsServer["setAll"]>
>[0][number]["options"];

/**
 * updateSession() — Atualiza a sessão do usuário no middleware do Next.js.
 *
 * Deve ser chamado no middleware.ts do app para manter a sessão SSR sincronizada.
 *
 * Uso em apps/web/middleware.ts:
 *   import { updateSession } from '@repo/supabase/middleware'
 *   export async function middleware(request: NextRequest) {
 *     return await updateSession(request)
 *   }
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: CookieOptions;
          }>,
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Obrigatório: não remover. Mantém a sessão de auth atualizada no SSR.
  await supabase.auth.getUser();

  return supabaseResponse;
}
