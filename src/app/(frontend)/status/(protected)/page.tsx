import { cookies } from 'next/headers'
import { listEnquiriesFor } from '@/lib/data/visitor-enquiries'
import { VisitorEnquiryList } from '@/components/VisitorEnquiryList'
import { VISITOR_COOKIE } from '@/lib/auth/visitor/cookie'
import { resolveSession } from '@/lib/auth/visitor/session'
import { t } from '@/lib/copy'

export default async function StatusPage() {
  const token = (await cookies()).get(VISITOR_COOKIE)?.value
  const visitor = token ? await resolveSession(token) : null
  const enquiries = visitor ? await listEnquiriesFor(visitor.email) : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading">{t('status.heading')}</h1>
      <VisitorEnquiryList enquiries={enquiries} />
    </div>
  )
}
