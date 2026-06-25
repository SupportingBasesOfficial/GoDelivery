/**
 * Retry utility com exponential backoff.
 * Usado para chamadas à rede (Supabase, Stripe, etc.).
 */

export interface RetryOptions {
  /** Número máximo de tentativas (padrão: 3) */
  maxRetries?: number;
  /** Delay inicial em ms (padrão: 300) */
  baseDelay?: number;
  /** Fator de multiplicação do delay (padrão: 2) */
  backoffFactor?: number;
  /** Delay máximo em ms (padrão: 10_000) */
  maxDelay?: number;
  /** Função para decidir se o erro é retryable (padrão: true para network/timeout) */
  isRetryable?: (error: unknown) => boolean;
}

function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("timeout") ||
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("econnreset") ||
      msg.includes("socket hang up") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("504") ||
      msg.includes("429")
    );
  }
  return false;
}

/**
 * Executa uma função assíncrona com retry e exponential backoff.
 *
 * @example
 * const result = await retry(() => supabase.from("orders").select().single());
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 300,
    backoffFactor = 2,
    maxDelay = 10_000,
    isRetryable = defaultIsRetryable,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const isLastAttempt = attempt === maxRetries;
      if (isLastAttempt || !isRetryable(error)) {
        throw error;
      }

      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay,
      );

      // Jitter: adiciona aleatoriedade de ±25% para evitar thundering herd
      const jitter = delay * (0.75 + Math.random() * 0.5);

      await new Promise((resolve) => setTimeout(resolve, jitter));
    }
  }

  throw lastError;
}
