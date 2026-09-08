import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

type LexicalNode = { text?: string; children?: LexicalNode[]; type?: string }

/** Flatten a Lexical document to plain text, one space between blocks. */
export function richTextToPlainText(data: unknown): string {
  const root = (data as SerializedEditorState | null | undefined)?.root as LexicalNode | undefined
  if (!root) return ''

  const parts: string[] = []
  const walk = (node: LexicalNode) => {
    if (typeof node.text === 'string') parts.push(node.text)
    node.children?.forEach(walk)
  }
  walk(root)

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * The first `count` sentences of a rich-text document.
 *
 * FR-003 asks each home-page card to carry a one-to-two-sentence description
 * alongside the strapline. The data model keeps only one description per
 * discipline — the fuller copy shown on the discipline page — so the card
 * shows its opening sentences rather than requiring the owner to write and
 * maintain a second field.
 */
export function firstSentences(data: unknown, count = 2): string {
  const text = richTextToPlainText(data)
  if (!text) return ''

  const sentences = text.match(/[^.!?…]+(?:[.!?…]+|$)/g)
  if (!sentences) return text

  return sentences.slice(0, count).join('').trim()
}
