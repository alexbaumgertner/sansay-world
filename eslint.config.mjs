import nextConfig from 'eslint-config-next'

const config = [
  ...nextConfig,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'migrations/**',
      'src/payload-types.ts',
      'src/app/(payload)/admin/importMap.js',
      'playwright-report/**',
      'test-results/**',
    ],
  },
]

export default config
