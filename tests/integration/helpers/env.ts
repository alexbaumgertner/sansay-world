for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // optional in CI
  }
}

export const hasDatabase = Boolean(process.env.DATABASE_URI && process.env.PAYLOAD_SECRET)
