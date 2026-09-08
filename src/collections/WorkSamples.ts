import type { CollectionConfig } from 'payload'
import { adminOnly, publishedOrAdmin } from '@/lib/access'

/** A gallery item within one discipline. No cap on count (FR-007). */
export const WorkSamples: CollectionConfig = {
  slug: 'work-samples',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'discipline', 'order', 'published'],
    description: 'Примеры работ внутри направления.',
    group: 'Контент',
  },
  access: {
    read: publishedOrAdmin,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'discipline', type: 'relationship', relationTo: 'disciplines', required: true, index: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'externalVideoUrl',
      type: 'text',
      validate: (value: string | null | undefined) => {
        if (!value) return true
        try {
          new URL(value)
          return true
        } catch {
          return 'Введите корректную ссылку'
        }
      },
    },
    { name: 'order', type: 'number', defaultValue: 0, index: true },
    { name: 'published', type: 'checkbox', defaultValue: true },
  ],
}
