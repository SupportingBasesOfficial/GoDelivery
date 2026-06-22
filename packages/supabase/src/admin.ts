import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * createAdminClient() — Client Supabase com Service Role Key.
 *
 * ⚠️ SEMPRE usar em Server Actions ou Route Handlers.
 * NUNCA expor este client ao browser.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
