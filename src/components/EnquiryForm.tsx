'use client'

import { useState } from 'react'
import { submitEnquiry } from '@/actions/submitEnquiry'
import { t } from '@/lib/copy'

/**
 * The discipline is pre-filled and visible to the sender, never a dropdown
 * the visitor has to pick from (FR-010). All controls are native, keyboard-
 * operable elements (FR-031) — no custom mouse-only widgets.
 */
export function EnquiryForm({ disciplineId, disciplineName }: { disciplineId: string; disciplineName: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [replyWindow, setReplyWindow] = useState<string | null>(null)
  const [signInPath, setSignInPath] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setState('submitting')
    setErrorMessage(null)

    const result = await submitEnquiry({
      disciplineId,
      name: String(formData.get('name') ?? ''),
      submitterEmail: String(formData.get('submitterEmail') ?? ''),
      preferredContactMethod: String(formData.get('preferredContactMethod') ?? ''),
      desiredDate: (formData.get('desiredDate') as string) || undefined,
      jobDescription: String(formData.get('jobDescription') ?? ''),
      honeypot: String(formData.get('company_website') ?? ''),
    })

    if (result.ok) {
      setReplyWindow(result.replyWindowCopy)
      setSignInPath(result.signInPath)
      setState('done')
    } else {
      setErrorMessage(result.error === 'validation' ? t('enquiry.errorValidation') : t('enquiry.errorGeneric'))
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div role="status" className="rounded-lg border-2 border-tone-live bg-ink-raised p-6">
        <h3 className="text-lg">{t('enquiry.confirmationTitle')}</h3>
        <p className="mt-2 opacity-90">{replyWindow}</p>
        {signInPath && (
          <p className="mt-4">
            <a href={signInPath} className="underline">
              {t('enquiry.signInLink')}
            </a>
          </p>
        )}
      </div>
    )
  }

  return (
    <form action={onSubmit} className="space-y-4" aria-busy={state === 'submitting'}>
      <h3 className="text-lg">{t('enquiry.heading')}</h3>

      <div>
        <label className="block text-sm opacity-80" htmlFor="enquiry-discipline">
          {t('enquiry.fieldDiscipline')}
        </label>
        <input id="enquiry-discipline" type="text" value={disciplineName} readOnly className="mt-1 w-full opacity-70" />
      </div>

      <div>
        <label className="block text-sm opacity-80" htmlFor="enquiry-name">
          {t('enquiry.fieldName')}
        </label>
        <input id="enquiry-name" name="name" type="text" required className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm opacity-80" htmlFor="enquiry-email">
          {t('enquiry.fieldEmail')}
        </label>
        <input id="enquiry-email" name="submitterEmail" type="email" required autoComplete="email" className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm opacity-80" htmlFor="enquiry-contact">
          {t('enquiry.fieldContact')}
        </label>
        <input id="enquiry-contact" name="preferredContactMethod" type="text" required className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm opacity-80" htmlFor="enquiry-date">
          {t('enquiry.fieldDate')}
        </label>
        <input id="enquiry-date" name="desiredDate" type="date" className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm opacity-80" htmlFor="enquiry-description">
          {t('enquiry.fieldDescription')}
        </label>
        <textarea id="enquiry-description" name="jobDescription" required rows={4} className="mt-1 w-full" />
      </div>

      {/* Honeypot — hidden from sighted and keyboard users via CSS, never via
          `type="hidden"` (which some bots skip); a filled value never
          becomes a stored enquiry (FR-017). */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="company_website">Website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {errorMessage && (
        <p role="alert" className="text-sm text-red-400">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={state === 'submitting'}
        className="rounded bg-tone-digital px-5 py-2 font-heading text-ink disabled:opacity-60"
      >
        {state === 'submitting' ? t('enquiry.submitting') : t('enquiry.submit')}
      </button>
    </form>
  )
}
