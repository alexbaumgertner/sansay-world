import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { testPayload, hasDatabase } from './helpers/payload'

const describeIfDb = hasDatabase ? describe : describe.skip

describeIfDb('home.coverImage field (FR-021, FR-022)', () => {
  it('saves the home global with coverImage omitted', async () => {
    const payload = await testPayload()
    const before = await payload.findGlobal({ slug: 'home' })

    await expect(
      payload.updateGlobal({
        slug: 'home',
        data: {
          name: before.name,
          essenceSentence: before.essenceSentence,
          bioParagraphs: before.bioParagraphs,
          replyWindowCopy: before.replyWindowCopy,
        },
      }),
    ).resolves.toMatchObject({ name: before.name })
  })

  it('rejects media without alt', async () => {
    const payload = await testPayload()
    const data = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer()

    await expect(
      payload.create({
        collection: 'media',
        data: {} as { alt: string },
        file: {
          data,
          mimetype: 'image/png',
          name: 'no-alt.png',
          size: data.length,
        },
      }),
    ).rejects.toThrow()
  })
})
