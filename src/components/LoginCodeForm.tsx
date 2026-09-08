'use client'

import { useActionState } from 'react'
import { requestLoginCode, type RequestCodeResult } from '@/actions/requestLoginCode'
import { verifyLoginCode, type VerifyCodeResult } from '@/actions/verifyLoginCode'
import { t } from '@/lib/copy'
import { formatDuration } from '@/lib/auth/visitor/format-duration'

type Step = 'email' | 'code'

type FormState = {
  step: Step
  email: string
  message: string | null
  errorKey: string | null
  retryAfterSeconds: number | null
}

const initialState: FormState = {
  step: 'email',
  email: '',
  message: null,
  errorKey: null,
  retryAfterSeconds: null,
}

function mapRequestError(result: RequestCodeResult): Partial<FormState> {
  if (result.ok) {
    return { step: 'code', message: t('login.codeSent'), errorKey: null, retryAfterSeconds: null }
  }
  if (result.reason === 'invalid_email') return { errorKey: 'login.errorInvalidEmail' }
  if (result.reason === 'delivery_failed') return { errorKey: 'login.errorDeliveryFailed' }
  if (result.reason === 'unavailable') return { errorKey: 'login.errorUnavailable' }
  if (result.reason === 'rate_limited') {
    return {
      errorKey: 'login.errorRateLimited',
      retryAfterSeconds: result.retryAfterSeconds,
    }
  }
  return {
    errorKey: 'login.errorLockedOut',
    retryAfterSeconds: result.retryAfterSeconds,
  }
}

function mapVerifyError(result: VerifyCodeResult): Partial<FormState> {
  if (result.ok) return {}
  if (result.reason === 'expired') return { errorKey: 'login.errorExpiredCode' }
  if (result.reason === 'locked_out') {
    return { errorKey: 'login.errorLockedOut', retryAfterSeconds: result.retryAfterSeconds }
  }
  if (result.reason === 'unavailable') return { errorKey: 'login.errorUnavailable' }
  return { errorKey: 'login.errorIncorrectCode' }
}

export function LoginCodeForm() {
  const [state, submit, pending] = useActionState(
    async (prev: FormState, formData: FormData): Promise<FormState> => {
      const intent = String(formData.get('intent') ?? 'request')
      const email = String(formData.get('email') ?? prev.email)

      if (intent === 'back') {
        return { ...initialState, email }
      }

      if (intent === 'verify') {
        const code = String(formData.get('code') ?? '')
        const result = await verifyLoginCode(email, code)
        if (result.ok) return prev
        return { ...prev, ...mapVerifyError(result), message: null }
      }

      const result = await requestLoginCode(email)
      return { ...prev, email, ...mapRequestError(result) }
    },
    initialState,
  )

  const errorMessage =
    state.errorKey && state.retryAfterSeconds != null
      ? t(state.errorKey, undefined, { duration: formatDuration(state.retryAfterSeconds) })
      : state.errorKey
        ? t(state.errorKey)
        : null

  if (state.step === 'code') {
    return (
      <form action={submit} className="space-y-4" aria-busy={pending}>
        <h1 className="text-2xl font-heading">{t('login.heading')}</h1>
        {state.message && (
          <p role="status" className="text-sm opacity-90">
            {state.message}
          </p>
        )}
        <p className="text-sm opacity-70">{state.email}</p>
        <input type="hidden" name="email" value={state.email} />
        <div>
          <label className="block text-sm opacity-80" htmlFor="login-code">
            {t('login.codeLabel')}
          </label>
          <input
            id="login-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            className="mt-1 w-full rounded bg-ink px-3 py-2 tracking-widest"
          />
        </div>
        <p className="text-sm opacity-70">{t('login.codeHelpNotArrived')}</p>
        {errorMessage && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            name="intent"
            value="verify"
            disabled={pending}
            className="rounded bg-tone-digital px-5 py-2 font-heading text-ink disabled:opacity-60"
          >
            {pending ? t('login.pending') : t('login.codeSubmit')}
          </button>
          <button
            type="submit"
            name="intent"
            value="request"
            disabled={pending}
            className="rounded border border-tone-live px-5 py-2"
          >
            {t('login.requestNewCode')}
          </button>
          <button type="submit" name="intent" value="back" className="text-sm underline opacity-80">
            {t('login.changeAddress')}
          </button>
        </div>
      </form>
    )
  }

  return (
    <form action={submit} className="space-y-4" aria-busy={pending}>
      <h1 className="text-2xl font-heading">{t('login.heading')}</h1>
      <div>
        <label className="block text-sm opacity-80" htmlFor="login-email">
          {t('login.emailLabel')}
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded bg-ink px-3 py-2"
          defaultValue={state.email}
        />
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        name="intent"
        value="request"
        disabled={pending}
        className="rounded bg-tone-digital px-5 py-2 font-heading text-ink disabled:opacity-60"
      >
        {pending ? t('login.pending') : t('login.emailSubmit')}
      </button>
    </form>
  )
}
