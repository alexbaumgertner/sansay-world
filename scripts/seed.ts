/**
 * Minimal seed for a usable dev environment (T050): the first admin user,
 * home page copy, and a couple of disciplines with one work sample each.
 * Safe to re-run — it upserts rather than duplicating.
 *
 * Usage: pnpm tsx scripts/seed.ts
 */
import { getPayload } from 'payload'
import config from '@payload-config'

async function seed() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set (see .env.example).')
  }

  const payload = await getPayload({ config })

  const existingUsers = await payload.find({ collection: 'users', limit: 1 })
  if (existingUsers.totalDocs === 0) {
    await payload.create({
      collection: 'users',
      data: { email, password },
    })
    console.log(`Seeded admin user: ${email}`)
  }

  await payload.updateGlobal({
    slug: 'home',
    data: {
      name: 'SanSay',
      essenceSentence: 'Я играю, снимаю, паяю, строю.',
      bioParagraphs: [
        { text: 'Музыкант и мастер: пишу и исполняю музыку, снимаю и монтирую видео.' },
        { text: 'Работаю с 3D и строю и ремонтирую гитары и усилители.' },
      ],
      replyWindowCopy: 'в течение двух рабочих дней',
    },
  })

  await payload.updateGlobal({
    slug: 'site-settings',
    data: { ownerNotificationEmail: email },
  })

  const disciplines = [
    { name: 'Музыка', slug: 'music', strapline: 'Пишу и исполняю', tone: 'live' as const, order: 1 },
    { name: '3D', slug: '3d', strapline: 'Модели и сцены', tone: 'digital' as const, order: 2 },
  ]

  for (const d of disciplines) {
    const existing = await payload.find({ collection: 'disciplines', where: { slug: { equals: d.slug } } })
    if (existing.totalDocs === 0) {
      await payload.create({
        collection: 'disciplines',
        data: {
          name: d.name,
          slug: d.slug,
          strapline: d.strapline,
          tone: d.tone,
          order: d.order,
          published: true,
          description: {
            root: {
              type: 'root',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', text: `Подробнее о направлении «${d.name}».`, version: 1 }],
                  direction: 'ltr',
                  format: '',
                  indent: 0,
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              version: 1,
            },
          },
        },
      })
      console.log(`Seeded discipline: ${d.name}`)
    }
  }

  const existingFriends = await payload.find({ collection: 'pages', where: { slug: { equals: 'friends' } } })
  if (existingFriends.totalDocs === 0) {
    await payload.create({
      collection: 'pages',
      data: {
        title: 'Друзья',
        slug: 'friends',
        showInNav: false,
        includeInSitemap: false,
        noindex: true,
        chapters: [
          {
            heading: 'Глава первая',
            body: {
              root: {
                type: 'root',
                children: [
                  {
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'История о Мурате, Зуиче и авторе.', version: 1 }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                version: 1,
              },
            },
          },
        ],
      },
    })
    console.log('Seeded hidden page: friends')
  }

  console.log('Seed complete.')
  process.exit(0)
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
