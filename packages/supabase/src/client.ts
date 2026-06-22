import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * createClient() — Client Supabase para uso em Client Components.
 *
 * Uso:
 *   import { createClient } from '@repo/supabase/client'
 *   const supabase = createClient()
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
