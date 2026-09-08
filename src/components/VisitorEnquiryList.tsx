import Link from 'next/link'
import { t } from '@/lib/copy'
import type { VisitorEnquiry } from '@/lib/data/visitor-enquiries'

function statusLabel(status: VisitorEnquiry['status']): string {
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

export function VisitorEnquiryList({ enquiries }: { enquiries: VisitorEnquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="rounded-lg border-2 border-tone-live bg-ink-raised p-6">
        <h2 className="text-lg">{t('status.emptyTitle')}</h2>
        <p className="mt-2 opacity-90">{t('status.emptyBody')}</p>
        <Link href="/" className="mt-4 inline-block underline">
          {t('status.emptyCta')}
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {enquiries.map((enquiry) => (
        <li key={enquiry.id} className="rounded-lg border border-tone-live bg-ink-raised p-4">
          <Link href={`/status/enquiry/${enquiry.id}`} className="block hover:opacity-90">
            <p className="font-heading">{enquiry.disciplineName}</p>
            <p className="text-sm opacity-80">{statusLabel(enquiry.status)}</p>
            {enquiry.submittedAt && (
              <p className="text-sm opacity-60">
                {t('status.submittedAt')}: {new Date(enquiry.submittedAt).toLocaleDateString('ru-RU')}
              </p>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
}
