import { LoginCodeForm } from '@/components/LoginCodeForm'
import { t } from '@/lib/copy'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ ended?: string; signedout?: string }>
}) {
  const params = await searchParams

  return (
    <div className="space-y-4">
      {params.ended === '1' && (
        <p role="status" className="rounded border border-tone-live bg-ink-raised p-4 text-sm">
          {t('login.sessionEnded')}
        </p>
      )}
      {params.signedout === '1' && (
        <p role="status" className="rounded border border-tone-live bg-ink-raised p-4 text-sm">
          {t('login.signedOut')}
        </p>
      )}
      <LoginCodeForm />
    </div>
  )
}
