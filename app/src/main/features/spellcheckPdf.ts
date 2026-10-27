/**
 * Spellcheck & Grammar correction via LanguageTool public API (free, no key required).
 * Processes text in chunks to stay under API limits.
 */

export interface SpellcheckMatch {
  message: string
  offset: number
  length: number
  replacements: string[]
  context: { text: string; offset: number; length: number }
}

export interface SpellcheckResult {
  correctedText: string
  matches: SpellcheckMatch[]
  changeCount: number
}

const LT_API = 'https://api.languagetool.org/v2/check'

async function checkChunk(
  text: string,
  language: string
): Promise<SpellcheckMatch[]> {
  const params = new URLSearchParams({
    text,
    language,
    enabledOnly: 'false',
  })

  const res = await fetch(LT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: params.toString(),
  })

  if (!res.ok) throw new Error(`LanguageTool API error: ${res.status} ${res.statusText}`)

  const json = await res.json()
  return (json.matches || []).map((m: any) => ({
    message: m.message,
    offset: m.offset,
    length: m.length,
    replacements: (m.replacements || []).slice(0, 3).map((r: any) => r.value),
    context: m.context,
  }))
}

function applyCorrections(text: string, matches: SpellcheckMatch[]): string {
  // Apply corrections from end → start so offsets stay valid
  const sorted = [...matches]
    .filter(m => m.replacements.length > 0)
    .sort((a, b) => b.offset - a.offset)

  let corrected = text
  for (const m of sorted) {
    corrected =
      corrected.substring(0, m.offset) +
      m.replacements[0] +
      corrected.substring(m.offset + m.length)
  }
  return corrected
}

export async function spellcheckText(
  text: string,
  language: string = 'en-US'
): Promise<SpellcheckResult> {
  if (!text.trim()) return { correctedText: text, matches: [], changeCount: 0 }

  // Split into ≤1500-char chunks at sentence boundaries to stay under LanguageTool free limits
  const CHUNK_SIZE = 1500
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining)
      break
    }
    // Try to break at a sentence boundary
    let cut = remaining.lastIndexOf('. ', CHUNK_SIZE)
    if (cut < 0 || cut < CHUNK_SIZE / 2) cut = CHUNK_SIZE
    chunks.push(remaining.substring(0, cut + 1))
    remaining = remaining.substring(cut + 1)
  }

  let allMatches: SpellcheckMatch[] = []
  let offset = 0
  const correctedChunks: string[] = []

  for (const chunk of chunks) {
    const matches = await checkChunk(chunk, language)
    // Adjust offsets relative to the full text
    const adjusted = matches.map(m => ({ ...m, offset: m.offset + offset }))
    allMatches = [...allMatches, ...adjusted]
    correctedChunks.push(applyCorrections(chunk, matches))
    offset += chunk.length
    // Small delay to be kind to the free API
    await new Promise(r => setTimeout(r, 300))
  }

  const correctedText = correctedChunks.join('')
  const changeCount = allMatches.filter(m => m.replacements.length > 0).length

  return { correctedText, matches: allMatches, changeCount }
}
