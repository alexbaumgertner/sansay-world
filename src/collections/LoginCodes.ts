import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

export const LoginCodes: CollectionConfig = {
  slug: 'login-codes',
  admin: {
    hidden: true,
  },
  access: {
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
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
      name: 'codeHash',
      type: 'text',
      required: true,
      admin: { readOnly: true },
    },
    {
      name: 'issuedAt',
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
      name: 'consumedAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'supersededAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'attemptCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
  ],
}
