import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'
import { visitorSessionStrategy } from '@/lib/auth/visitor/strategy'
import { revokeAllSessions } from '@/lib/auth/visitor/session'

export const Visitors: CollectionConfig = {
  slug: 'visitors',
  auth: {
    disableLocalStrategy: true,
    strategies: [visitorSessionStrategy],
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'lastSignedInAt', 'activeSessionCount', 'blockedUntil'],
    description:
      'Адреса, которые входили на сайт. Удаление последней заявки с этим адресом удаляет и запись здесь.',
  },
  access: {
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation }) => {
        if (operation === 'update' && data?.revokeAllSessions && originalDoc?.id) {
          await revokeAllSessions(originalDoc.id, 'revoked_by_owner')
          data.revokeAllSessions = false
          data.activeSessionCount = 0
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'firstSeenAt',
      type: 'date',
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ value, operation }) => (operation === 'create' ? value ?? new Date().toISOString() : value),
        ],
      },
    },
    {
      name: 'lastSignedInAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'activeSessionCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'blockedUntil',
      type: 'date',
      admin: {
        readOnly: true,
        description: 'Последнее известное состояние блокировки (только для отображения).',
      },
    },
    {
      name: 'revokeAllSessions',
      type: 'checkbox',
      label: 'Отозвать доступ',
      defaultValue: false,
      admin: {
        description: 'Немедленно завершает все активные сессии на всех устройствах.',
      },
    },
  ],
}
