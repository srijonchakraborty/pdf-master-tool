import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { Languages, FileText, X, Copy, Check } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { toast } from 'sonner'

const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ru', name: 'Russian' }
]

export function TranslatePdfPage() {
  const [file, setFile] = useState<{ name: string; buffer: ArrayBuffer } | null>(null)
  const [targetLang, setTargetLang] = useState('es')
  const [isTranslating, setIsTranslating] = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [copied, setCopied] = useState(false)

  const handleFileSelect = async (files: FileList) => {
    if (files.length > 0) {
      setFile({ name: files[0].name, buffer: await files[0].arrayBuffer() })
      setExtractedText('')
      setTranslatedText('')
    }
  }

  const handleTranslate = async () => {
    if (!file) return
    setIsTranslating(true)
    
    try {
      // 1. Extract Text
      const doc = await pdfjsLib.getDocument({
        data: new Uint8Array(file.buffer)
      }).promise

      let fullText = ''
      // Only extract first 3 pages to avoid hitting API rate limits for free API
      const maxPages = Math.min(doc.numPages, 3) 
      for (let i = 1; i <= maxPages; i++) {
        const page = await doc.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        fullText += pageText + '\n\n'
      }

      if (doc.numPages > 3) {
        fullText += '\n[Note: Only the first 3 pages were extracted to avoid API rate limits.]'
      }

      setExtractedText(fullText)

      // 2. Translate text via Main Process IPC (bypasses renderer CORS/network restrictions)
      toast.info('Translating document...')
      const res = await window.api.translateText(fullText, targetLang)
      if (!res.success) throw new Error(res.error || 'Translation failed')

      setTranslatedText(res.translatedText || '')
      toast.success('Translation complete!')
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to translate: ' + e.message)
    } finally {
      setIsTranslating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Languages className="w-8 h-8 text-accent" /> Translate PDF
          </h1>
          <p className="text-muted">Extract text from your PDF and automatically translate it.</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <FileText className="text-accent w-6 h-6"/>
                <span className="font-medium">{file.name}</span>
              </div>
              <button onClick={() => { setFile(null); setTranslatedText(''); setExtractedText(''); }} className="text-muted hover:text-danger">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-elevated p-6 rounded-xl border border-border space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Target Language</label>
                <select 
                  value={targetLang} 
                  onChange={e => setTargetLang(e.target.value)}
                  className="w-full max-w-xs bg-background border border-border rounded-lg p-2.5 text-foreground focus:ring-2 focus:ring-accent outline-none"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {!translatedText ? (
                <PrimaryButton onClick={handleTranslate} disabled={isTranslating} className="w-full sm:w-auto">
                  {isTranslating ? 'Translating...' : 'Translate Document'}
                </PrimaryButton>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <h3 className="font-medium text-muted text-sm uppercase tracking-wider">Original Text</h3>
                    <div className="bg-background border border-border p-4 rounded-lg h-96 overflow-y-auto whitespace-pre-wrap text-sm">
                      {extractedText}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-accent text-sm uppercase tracking-wider">Translated Text</h3>
                      <button onClick={copyToClipboard} className="text-accent hover:text-accent/80 flex items-center gap-1 text-sm font-medium">
                        {copied ? <Check className="w-4 h-4"/> : <Copy className="w-4 h-4" />} Copy
                      </button>
                    </div>
                    <div className="bg-accent/5 border border-accent/20 p-4 rounded-lg h-96 overflow-y-auto whitespace-pre-wrap text-sm">
                      {translatedText}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
