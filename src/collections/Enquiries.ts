import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'
import { notifyOnEnquiry } from '@/hooks/notifyOnEnquiry'

/**
 * Stored in the same Postgres database as content, as directed. `create` is
 * the ONE public write in the whole application (the enquiry form); every
 * other operation is admin-only — a visitor's name and contact details are
 * never publicly readable (contracts/admin-access.md).
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['submittedAt', 'discipline', 'name', 'status', 'deliveryFailed'],
    description: 'Заявки с сайта. Статус меняется здесь; проблемы с доставкой видны в колонке справа.',
    // A saved filter view an owner can click straight to (FR-015).
    listSearchableFields: ['name', 'jobDescription'],
  },
  access: {
    create: () => true,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [notifyOnEnquiry],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'preferredContactMethod', type: 'text', required: true, label: 'Как связаться' },
    { name: 'desiredDate', type: 'date' },
    { name: 'jobDescription', type: 'textarea', required: true, label: 'Описание задачи' },
    { name: 'discipline', type: 'relationship', relationTo: 'disciplines', required: true },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'in_progress' },
        { label: 'Закрыта', value: 'closed' },
      ],
    },
    { name: 'submittedAt', type: 'date', defaultValue: () => new Date().toISOString(), admin: { readOnly: true } },
    {
      name: 'delivery',
      type: 'group',
      admin: { readOnly: true, description: 'Заполняется автоматически при создании заявки.' },
      fields: [
        {
          name: 'email',
          type: 'group',
          fields: [
            // 'disabled' is not reachable today (email is mandatory, FR-013)
            // but is included so the type matches the shared ChannelResult
            // union and stays correct if email ever becomes configurable.
            { name: 'status', type: 'select', options: ['sent', 'failed', 'disabled'] },
            { name: 'attemptedAt', type: 'date' },
            { name: 'error', type: 'textarea' },
          ],
        },
        {
          name: 'telegram',
          type: 'group',
          fields: [
            { name: 'status', type: 'select', options: ['sent', 'failed', 'disabled'] },
            { name: 'attemptedAt', type: 'date' },
            { name: 'error', type: 'textarea' },
          ],
        },
      ],
    },
    {
      name: 'deliveryFailed',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { readOnly: true, description: 'Автоматический флаг — хотя бы один канал не сработал.' },
    },
  ],
}
