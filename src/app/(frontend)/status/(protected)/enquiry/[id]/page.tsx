import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { getEnquiryFor } from '@/lib/data/visitor-enquiries'
import { VISITOR_COOKIE } from '@/lib/auth/visitor/cookie'
import { resolveSession } from '@/lib/auth/visitor/session'
import { t } from '@/lib/copy'
import type { Enquiry } from '@/payload-types'

function statusLabel(status: Enquiry['status'] | null | undefined): string {
  switch (status) {
    case 'new':
      return t('status.statusNew')
    case 'in_progress':
      return t('status.statusInProgress')
    case 'closed':
      return t('status.statusClosed')
    default:
      return status ?? ''
  }
}

export default async function EnquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = (await cookies()).get(VISITOR_COOKIE)?.value
  const visitor = token ? await resolveSession(token) : null
  if (!visitor) notFound()

  const enquiry = await getEnquiryFor(visitor.email, id)
  if (!enquiry) notFound()

  return (
    <article className="space-y-4">
      <Link href="/status" className="text-sm underline opacity-80">
        {t('status.backToList')}
      </Link>
      <h1 className="text-2xl font-heading">{enquiry.disciplineName}</h1>
      <p className="text-sm opacity-80">{statusLabel(enquiry.status)}</p>
      {enquiry.submittedAt && (
        <p className="text-sm opacity-60">
          {t('status.submittedAt')}: {new Date(enquiry.submittedAt).toLocaleDateString('ru-RU')}
        </p>
      )}
      <p className="whitespace-pre-wrap">{enquiry.jobDescription}</p>
      {enquiry.ownerReply && (
        <section className="rounded border border-tone-live bg-ink-raised p-4">
          <h2 className="font-heading">{t('status.ownerReplyHeading')}</h2>
          <p className="mt-2 whitespace-pre-wrap">{enquiry.ownerReply}</p>
        </section>
      )}
    </article>
  )
}
