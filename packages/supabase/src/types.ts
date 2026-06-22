/**
 * Result<T> — Padrão universal de tratamento de erro.
 *
 * Força o tratamento de erro no ponto da chamada.
 * Elimina `undefined` silencioso e comportamentos imprevisíveis.
 *
 * Uso:
 *   async function getUser(id: string): Promise<Result<User>> {
 *     const { data, error } = await supabase.from('users').select().eq('id', id).single()
 *     if (error) return err(error.message, error.code)
 *     return ok(data)
 *   }
 *
 *   const result = await getUser(id)
 *   if (!result.ok) {
 *     // tratar erro — compilador garante que você não pode ignorar
 *     return
 *   }
 *   console.log(result.data) // typed, nunca null aqui
 */

export type Result<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: AppError };

export interface AppError {
  message: string;
  code?: string;
  status?: number;
}

export function ok<T>(data: T): Result<T> {
  return { ok: true, data, error: null };
}

export function err<T = never>(
  message: string,
  code?: string,
  status?: number,
): Result<T> {
  return { ok: false, data: null, error: { message, code, status } };
}

/**
 * fromSupabase — Converte resposta do Supabase em Result<T>.
 */
export function fromSupabase<T>(response: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): Result<T> {
  if (response.error || response.data === null) {
    return err(
      response.error?.message ?? "No data returned",
      response.error?.code,
    );
  }
  return ok(response.data);
}
