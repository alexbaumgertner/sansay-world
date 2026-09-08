import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'
import { notifyOnEnquiry } from '@/hooks/notifyOnEnquiry'
import { notifyOnReply } from '@/hooks/notifyOnReply'
import { cascadeVisitorIdentity } from '@/hooks/cascadeVisitorIdentity'
import { normalizeEmail } from '@/lib/auth/visitor/normalize-email'

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
    beforeChange: [
      ({ data, originalDoc }) => {
        if (originalDoc?.ownerReply?.trim() && !data?.ownerReply?.trim()) {
          data.replyNotifiedAt = null
        }
        return data
      },
    ],
    afterChange: [notifyOnEnquiry, notifyOnReply],
    afterDelete: [cascadeVisitorIdentity],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'submitterEmail',
      type: 'email',
      index: true,
      label: 'Email для входа',
      admin: {
        description:
          'Адрес для входа на сайт. Заявки без этого поля не видны посетителю. Ответ без адреса никому не отправляется.',
      },
      hooks: {
        beforeChange: [({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value)],
      },
    },
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
      name: 'ownerReply',
      type: 'textarea',
      label: 'Ответ владельца',
      admin: {
        description:
          'Виден посетителю после входа. Если у заявки нет email, уведомление не отправляется.',
      },
    },
    {
      name: 'replyNotifiedAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'delivery',
      type: 'group',
      admin: { readOnly: true, description: 'Заполняется автоматически при создании заявки.' },
      fields: [
        {
          name: 'email',
          type: 'group',
          fields: [
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
        {
          name: 'visitorAck',
          type: 'group',
          fields: [
            { name: 'status', type: 'select', options: ['sent', 'failed', 'disabled'] },
            { name: 'attemptedAt', type: 'date' },
            { name: 'error', type: 'textarea' },
          ],
        },
        {
          name: 'replyNotice',
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
