import { request as playwrightRequest, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test'
import { STORAGE_STATE } from './paths'

/**
 * An API context carrying the owner session saved by auth.setup.ts.
 *
 * Public-facing tests deliberately run in the default, signed-out context —
 * an admin session would relax `publishedOrAdmin` read access and quietly
 * change what the page shows. Anything that needs the owner's privileges
 * asks for it explicitly through these helpers.
 */
export async function adminApi(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: process.env.E2E_BASE_URL,
    storageState: STORAGE_STATE,
  })
}

/** A browser context signed in as the owner, for driving the admin UI. */
export async function adminContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({ storageState: STORAGE_STATE })
}

/** Minimal Lexical rich-text document — `description` and chapter bodies require one. */
export function richText(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr' as const,
          children: [
            { type: 'text', text, format: 0, style: '', mode: 'normal', detail: 0, version: 1 },
          ],
        },
      ],
    },
  }
}

/** A slug/name suffix unique to one run, so a crashed run never collides with the next. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

type Created = { collection: string; id: string }

/**
 * Tracks everything a spec creates so teardown can remove it in reverse
 * order, even if an assertion failed partway through.
 */
export class AdminScratch {
  private created: Created[] = []

  constructor(private api: APIRequestContext) {}

  async create(collection: string, data: Record<string, unknown>): Promise<Record<string, any>> {
    const res = await this.api.post(`/api/${collection}`, { data })
    if (res.status() !== 201) {
      throw new Error(`Creating ${collection} failed with ${res.status()}: ${await res.text()}`)
    }
    const body = await res.json()
    this.created.push({ collection, id: body.doc.id })
    return body.doc
  }

  /** Record a document this spec did not create but must still clean up. */
  track(collection: string, id: string) {
    this.created.push({ collection, id })
  }

  async cleanup(): Promise<void> {
    for (const { collection, id } of [...this.created].reverse()) {
      // Scoped by id — never an unfiltered delete.
      await this.api.delete(`/api/${collection}/${id}`).catch(() => undefined)
    }
    this.created = []
    await this.api.dispose()
  }
}
