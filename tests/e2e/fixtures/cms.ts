import { test as base, expect, request as apiRequest, type APIRequestContext } from '@playwright/test'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'
import type { Discipline, Home, Media, WorkSample } from '@/payload-types'

/**
 * Test-side access to the CMS the site reads from.
 *
 * Everything the suite asserts about content is read back out of Payload
 * rather than hardcoded here, so the tests check that the *page reflects the
 * CMS* (FR-004, FR-022, Constitution Principle II) instead of checking that
 * the page reflects a copy of the seed script.
 *
 * Writes go through Payload's Local API — the same collection config, hooks
 * and validation the admin panel goes through, so "seed a discipline via the
 * API" is a faithful stand-in for "the owner clicks Save".
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'owner@example.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'changeme123!'

let payloadInstance: Promise<Payload> | null = null
function payloadClient(): Promise<Payload> {
  payloadInstance ??= getPayload({ config })
  return payloadInstance
}

/** Minimal valid Lexical document — one paragraph of the given text. */
export function lexicalParagraph(text: string): Discipline['description'] {
  return {
    root: {
      type: 'root',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
          children: [{ type: 'text', text, version: 1 }],
        },
      ],
    },
  } as Discipline['description']
}

let uniqueCounter = 0
function uniqueSlug(prefix: string): string {
  uniqueCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${uniqueCounter}`
}

export type NewDiscipline = {
  name?: string
  strapline?: string
  descriptionText?: string
  tone?: 'live' | 'digital'
  order?: number
  published?: boolean
}

export type NewWorkSample = {
  title: string
  description?: string
  order: number
  externalVideoUrl?: string
}

export class Cms {
  /** Undo steps, run in reverse registration order after each test. */
  private undo: Array<() => Promise<unknown>> = []

  constructor(private readonly payload: Payload) {}

  async home(): Promise<Home> {
    return this.payload.findGlobal({ slug: 'home' })
  }

  /** Creates a media document from an in-memory buffer (Local API). */
  async uploadMedia(input: { data: Buffer; filename: string; alt: string }): Promise<Media> {
    const created = await this.payload.create({
      collection: 'media',
      data: { alt: input.alt },
      file: {
        data: input.data,
        mimetype: 'image/png',
        name: input.filename,
        size: input.data.length,
      },
    })
    this.undo.push(() => this.payload.delete({ collection: 'media', id: created.id }))
    return created
  }

  /** Points home.coverImage at a media document; undo restores the previous value. */
  async setHomeCover(mediaId: string): Promise<void> {
    const before = await this.payload.findGlobal({ slug: 'home' })
    const previous =
      before.coverImage && typeof before.coverImage === 'object'
        ? before.coverImage.id
        : (before.coverImage ?? null)
    this.undo.push(() =>
      this.payload.updateGlobal({ slug: 'home', data: { coverImage: previous } }),
    )
    await this.payload.updateGlobal({ slug: 'home', data: { coverImage: mediaId } })
  }

  /** Clears home.coverImage; undo restores the previous value. */
  async clearHomeCover(): Promise<void> {
    const before = await this.payload.findGlobal({ slug: 'home' })
    const previous =
      before.coverImage && typeof before.coverImage === 'object'
        ? before.coverImage.id
        : (before.coverImage ?? null)
    this.undo.push(() =>
      this.payload.updateGlobal({ slug: 'home', data: { coverImage: previous } }),
    )
    await this.payload.updateGlobal({ slug: 'home', data: { coverImage: null } })
  }

  /**
   * Sets aboutPhoto and restores the prior value on cleanup.
   * Used to prove coverImage and aboutPhoto are independent (FR-020).
   */
  async setHomeAboutPhoto(mediaId: string | null): Promise<void> {
    const before = await this.payload.findGlobal({ slug: 'home' })
    const previous =
      before.aboutPhoto && typeof before.aboutPhoto === 'object'
        ? before.aboutPhoto.id
        : (before.aboutPhoto ?? null)
    this.undo.push(() =>
      this.payload.updateGlobal({ slug: 'home', data: { aboutPhoto: previous } }),
    )
    await this.payload.updateGlobal({ slug: 'home', data: { aboutPhoto: mediaId } })
  }

  /** Exactly what the nav, the home cards and the sitemap read (FR-003, FR-004). */
  async publishedDisciplines(): Promise<Discipline[]> {
    const result = await this.payload.find({
      collection: 'disciplines',
      where: { published: { equals: true } },
      sort: 'order',
      limit: 200,
    })
    return result.docs
  }

  async disciplineBySlug(slug: string): Promise<Discipline> {
    const result = await this.payload.find({ collection: 'disciplines', where: { slug: { equals: slug } }, limit: 1 })
    const doc = result.docs[0]
    if (!doc) throw new Error(`No discipline seeded with slug "${slug}" — run \`pnpm seed\` first`)
    return doc
  }

  async pageBySlug(slug: string) {
    const result = await this.payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1 })
    const doc = result.docs[0]
    if (!doc) throw new Error(`No page seeded with slug "${slug}" — run \`pnpm seed\` first`)
    return doc
  }

  /** Stands in for the owner creating a discipline in the admin panel (FR-018, FR-022). */
  async createDiscipline(input: NewDiscipline = {}): Promise<Discipline> {
    const slug = uniqueSlug('e2e')
    const created = await this.payload.create({
      collection: 'disciplines',
      data: {
        name: input.name ?? `E2E направление ${slug}`,
        slug,
        strapline: input.strapline ?? 'Создано автотестом',
        description: lexicalParagraph(input.descriptionText ?? `Описание направления ${slug}.`),
        tone: input.tone ?? 'digital',
        // High order keeps seeded disciplines at the end of the list so they
        // never reshuffle the neighbour links the other tests rely on.
        order: input.order ?? 900,
        published: input.published ?? true,
      },
    })
    this.undo.push(() => this.payload.delete({ collection: 'disciplines', id: created.id }))
    return created
  }

  /** FR-019 — work samples inside a discipline, with an owner-defined order. */
  async createWorkSample(disciplineId: string, input: NewWorkSample): Promise<WorkSample> {
    const created = await this.payload.create({
      collection: 'work-samples',
      data: {
        title: input.title,
        description: input.description ?? `Описание работы «${input.title}».`,
        discipline: disciplineId,
        order: input.order,
        externalVideoUrl: input.externalVideoUrl,
        published: true,
      },
    })
    this.undo.push(() => this.payload.delete({ collection: 'work-samples', id: created.id }))
    return created
  }

  async enquiriesNamed(name: string) {
    const result = await this.payload.find({ collection: 'enquiries', where: { name: { equals: name } }, limit: 50 })
    return result.docs
  }

  /** Removes enquiries the browser created (the fixture never saw their ids). */
  trackEnquiriesNamed(name: string) {
    this.undo.push(async () => {
      for (const doc of await this.enquiriesNamed(name)) {
        await this.payload.delete({ collection: 'enquiries', id: doc.id })
      }
    })
  }

  /**
   * Forces the mandatory email channel to fail, for FR-015.
   *
   * `emailChannel.send` throws when `site-settings.ownerNotificationEmail` is
   * unset, so emptying it makes a real failure travel the real dispatch path —
   * no production code branch and no test-only server flag. It is written
   * through the database adapter because the field is `required: true` and
   * the normal update path (correctly) refuses to clear it.
   */
  async breakEmailChannel(): Promise<void> {
    const settings = await this.payload.findGlobal({ slug: 'site-settings' })
    const original = settings.ownerNotificationEmail
    this.undo.push(() =>
      this.payload.db.updateGlobal({ slug: 'site-settings', data: { ownerNotificationEmail: original } }),
    )
    await this.payload.db.updateGlobal({ slug: 'site-settings', data: { ownerNotificationEmail: '' } })
  }

  async cleanup(): Promise<void> {
    for (const step of this.undo.reverse()) {
      try {
        await step()
      } catch (err) {
        console.warn('[e2e cleanup] step failed:', err)
      }
    }
    this.undo = []
  }
}

type Fixtures = {
  cms: Cms
  /** Signed-in owner session — what the admin panel itself talks to (FR-012, FR-030). */
  adminApi: APIRequestContext
}

export const test = base.extend<Fixtures>({
  cms: async ({}, use) => {
    const helper = new Cms(await payloadClient())
    await use(helper)
    await helper.cleanup()
  },

  adminApi: async ({ baseURL }, use) => {
    const context = await apiRequest.newContext({ baseURL })
    const login = await context.post('/api/users/login', {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(
      login.ok(),
      `Owner login failed (${login.status()}). Run \`pnpm seed\`, or set E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.`,
    ).toBeTruthy()
    await use(context)
    await context.dispose()
  },
})

export { expect }
