import { getPayload } from 'payload'
import config from '@payload-config'
import type { Enquiry } from '@/payload-types'

export type VisitorEnquiry = {
  id: string
  name: string
  jobDescription: string
  desiredDate: string | null
  submittedAt: string | null
  status: Enquiry['status']
  disciplineName: string
  ownerReply: string | null
}

function toVisitorEnquiry(doc: Enquiry): VisitorEnquiry {
  const disciplineName =
    typeof doc.discipline === 'object' && doc.discipline ? doc.discipline.name : '—'

  return {
    id: doc.id,
    name: doc.name,
    jobDescription: doc.jobDescription,
    desiredDate: doc.desiredDate ?? null,
    submittedAt: doc.submittedAt ?? null,
    status: doc.status,
    disciplineName,
    ownerReply: doc.ownerReply ?? null,
  }
}

export async function listEnquiriesFor(email: string): Promise<VisitorEnquiry[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'enquiries',
    where: { submitterEmail: { equals: email } },
    sort: '-submittedAt',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  return result.docs.map(toVisitorEnquiry)
}

export async function getEnquiryFor(email: string, id: string): Promise<VisitorEnquiry | null> {
  const payload = await getPayload({ config })
  try {
    const doc = await payload.findByID({
      collection: 'enquiries',
      id,
      depth: 1,
      overrideAccess: true,
    })
    if (!doc.submitterEmail || doc.submitterEmail !== email) return null
    return toVisitorEnquiry(doc)
  } catch {
    return null
  }
}
