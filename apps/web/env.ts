import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Validação de variáveis de ambiente em build-time.
 *
 * Se faltar alguma variável obrigatória, o Next.js NEM SOBE.
 * Isso evita 90% dos tickets de "funciona na minha máquina".
 *
 * UNIVERSAL: Todo projeto precisa de env validation, independente da stack.
 */
export const env = createEnv({
  /**
   * Variáveis de ambiente do lado do cliente (prefixo NEXT_PUBLIC_)
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  /**
   * Variáveis de ambiente do lado do servidor
   */
  server: {
    // Adicione variáveis server-side aqui quando necessário
    // Ex: DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
  },
  /**
   * Variáveis de ambiente para runtime (não validadas em build-time)
   */
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  /**
   * Desabilita validação em runtime se SKIP_ENV_VALIDATION=true
   * Útil para CI/CD onde variáveis podem ser placeholder
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
