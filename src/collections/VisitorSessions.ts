import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

export const VisitorSessions: CollectionConfig = {
  slug: 'visitor-sessions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['visitor', 'createdAt', 'expiresAt', 'revokedAt', 'endedReason'],
    description: 'Сессии входа — по одной на устройство. Отзыв — через список посетителей.',
  },
  access: {
    create: adminOnly,
    read: adminOnly,
    update: () => false,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'visitor',
      type: 'relationship',
      relationTo: 'visitors',
      required: true,
      index: true,
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'createdAt',
      type: 'date',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'revokedAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'endedReason',
      type: 'select',
      options: [
        { label: 'Выход', value: 'signed_out' },
        { label: 'Отозвано владельцем', value: 'revoked_by_owner' },
        { label: 'Удалена учётная запись', value: 'identity_removed' },
      ],
      admin: { readOnly: true },
    },
  ],
}
