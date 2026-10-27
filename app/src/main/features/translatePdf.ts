export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return ''

  // Split into ~1500 char chunks to respect Google Translate URL length limits
  const chunks = text.match(/.{1,1500}(?=\s|$)/gs) || [text]
  let fullTranslation = ''

  for (const chunk of chunks) {
    if (!chunk.trim()) continue
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(chunk)}`
      
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })

      if (!res.ok) {
        throw new Error(`Translation API returned status ${res.status}`)
      }

      const json = await res.json()
      if (Array.isArray(json) && Array.isArray(json[0])) {
        const chunkTranslated = json[0].map((item: any) => item[0] || '').join('')
        fullTranslation += chunkTranslated + ' '
      } else {
        fullTranslation += chunk + ' '
      }
    } catch (err: any) {
      console.warn('Google Translate API failed, trying MyMemory fallback:', err.message)
      // Fallback to MyMemory API if Google fails
      try {
        const fallbackUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk.substring(0, 450))}&langpair=auto|${encodeURIComponent(targetLang)}`
        const res = await fetch(fallbackUrl)
        const json = await res.json()
        if (json.responseData && json.responseData.translatedText) {
          fullTranslation += json.responseData.translatedText + ' '
        } else {
          fullTranslation += chunk + ' '
        }
      } catch (fallbackErr) {
        fullTranslation += chunk + ' '
      }
    }
  }

  return fullTranslation.trim()
}
