import { defineConfig } from "vitest/config";

/**
 * Configuração global do Vitest para o monorepo.
 *
 * Cada package pode ter seu próprio vitest.config.ts que herda este,
 * ou rodar testes diretamente com `pnpm test` na raiz.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      exclude: [
        "node_modules/",
        "**/*.config.*",
        "**/.next/",
        "**/dist/",
      ],
    },
  },
});
