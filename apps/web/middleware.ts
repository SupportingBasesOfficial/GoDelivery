import { updateSession } from "@repo/supabase/middleware";
import { type NextRequest } from "next/server";

/**
 * Middleware do Next.js.
 *
 * Mantém a sessão do Supabase sincronizada no SSR.
 *
 * DELETÁVEL: Se você não usar Supabase, pode deletar este arquivo.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
