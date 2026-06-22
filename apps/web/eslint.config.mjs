import nextConfig from "@repo/eslint-config/next";

/**
 * ESLint config para apps/web.
 * 
 * Herda configuração do @repo/eslint-config/next.
 * 
 * DELETÁVEL: Se você não usar ESLint, pode deletar este arquivo.
 */
export default [
  ...nextConfig,
  {
    ignores: ["next-env.d.ts"],
  },
];
