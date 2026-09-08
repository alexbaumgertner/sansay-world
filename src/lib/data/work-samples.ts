import { getPayload } from 'payload'
import config from '@payload-config'
import type { WorkSample } from '@/payload-types'

export async function getWorkSamplesForDiscipline(disciplineId: string): Promise<WorkSample[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'work-samples',
    where: {
      discipline: { equals: disciplineId },
      published: { equals: true },
    },
    sort: 'order',
    limit: 500,
  })
  return result.docs
}
