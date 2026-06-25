import { describe, it, expect, vi } from "vitest";
import { retry } from "./retry";

describe("retry", () => {
  it("retorna imediatamente se a função sucede na primeira tentativa", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("tenta novamente em erro retryable", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");

    const result = await retry(fn, { baseDelay: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("desiste após maxRetries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("timeout"));
    await expect(retry(fn, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow("timeout");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("não retenta erros não-retryable", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("validation failed"));
    await expect(retry(fn, { baseDelay: 10 })).rejects.toThrow("validation failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("usa backoff exponencial", async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    // Mock setTimeout para capturar delays
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).setTimeout = (cb: () => void, ms: number) => {
      delays.push(ms);
      return originalSetTimeout(cb, 1); // acelera teste
    };

    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("ok");

    try {
      await retry(fn, { maxRetries: 3, baseDelay: 100 });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).setTimeout = originalSetTimeout;
    }

    expect(fn).toHaveBeenCalledTimes(3);
    expect(delays.length).toBe(2);
    // O segundo delay deve ser maior que o primeiro (backoff)
    expect(delays[1]).toBeGreaterThan(delays[0]);
  });
});
