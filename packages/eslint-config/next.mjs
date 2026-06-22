import baseConfig from './base.mjs'

/**
 * @repo/eslint-config/next
 *
 * Configuração ESLint para apps Next.js.
 * Estende @repo/eslint-config/base.
 *
 * Uso em apps/web/eslint.config.mjs:
 *   import nextConfig from '@repo/eslint-config/next'
 *   export default nextConfig
 */
const nextConfig = [
  ...baseConfig,
]

export default nextConfig
