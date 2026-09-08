/**
 * The only place the admin credentials are read. They come from the
 * environment and are never written to a file, a fixture, a log line, or a
 * test title. `redact()` exists so a failing assertion can quote a response
 * without leaking the secret.
 */
export function adminCredentials(): { email: string; password: string } {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set in the environment (see .env.local).',
    )
  }

  return { email, password }
}

/** Replace any occurrence of the admin secrets in text destined for a report. */
export function redact(text: string): string {
  let out = text
  for (const secret of [process.env.E2E_ADMIN_PASSWORD, process.env.E2E_ADMIN_EMAIL]) {
    if (secret) out = out.split(secret).join('[redacted]')
  }
  return out
}
