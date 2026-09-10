import sharp from 'sharp'

/** Near-white cover — worst case the scrim is dimensioned for (FR-014 / SC-002). */
export async function nearWhiteCover(): Promise<Buffer> {
  return sharp({
    create: {
      width: 2000,
      height: 1200,
      channels: 3,
      background: { r: 253, g: 253, b: 253 },
    },
  })
    .png()
    .toBuffer()
}

/** Busy full-range noise — no local region may defeat the scrim (FR-014). */
export async function busyCover(): Promise<Buffer> {
  const width = 2000
  const height = 1200
  const pixels = Buffer.alloc(width * height * 3)
  for (let i = 0; i < pixels.length; i += 3) {
    // Deterministic high-frequency pattern across the full luminance range
    const x = (i / 3) % width
    const y = Math.floor(i / 3 / width)
    const v = (x * 37 + y * 73 + (x ^ y) * 17) % 256
    pixels[i] = v
    pixels[i + 1] = (v * 3) % 256
    pixels[i + 2] = (v * 7) % 256
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer()
}
