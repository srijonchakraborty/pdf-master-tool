import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { toast } from 'sonner'
import {
  SpellCheck, FileText, X, CheckCircle2, AlertCircle,
  Download, RefreshCw, ChevronDown
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ru', label: 'Russian' },
]

type Step = 'upload' | 'ready' | 'checking' | 'done'

export function SpellcheckPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string; buffer: ArrayBuffer } | null>(null)
  const [language, setLanguage] = useState('en-US')
  const [step, setStep] = useState<Step>('upload')
  const [originalText, setOriginalText] = useState('')
  const [correctedText, setCorrectedText] = useState('')
  const [changeCount, setChangeCount] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'original' | 'corrected'>('corrected')

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const buffer = await f.arrayBuffer()
    setFile({ name: f.name, path: window.api.getFilePath(f), buffer })
    setStep('ready')
    setOriginalText('')
    setCorrectedText('')
    setChangeCount(0)
  }

  const handleCheck = async () => {
    if (!file) return
    setStep('checking')
    setStatusMsg('Extracting text from PDF…')

    try {
      // 1. Extract text using pdf.js in the renderer
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file.buffer) }).promise
      let fullText = ''
      const maxPages = Math.min(pdf.numPages, 20) // limit to 20 pages to stay within API limits
      for (let i = 1; i <= maxPages; i++) {
        setStatusMsg(`Extracting page ${i} of ${maxPages}…`)
        const page = await pdf.getPage(i)
        const tc = await page.getTextContent()
        fullText += tc.items.map((it: any) => it.str).join(' ') + '\n\n'
      }
      if (pdf.numPages > maxPages) {
        fullText += `\n[Note: Only the first ${maxPages} pages were checked.]`
      }
      setOriginalText(fullText)

      // 2. Spellcheck via main process (bypasses renderer CORS/CSP)
      setStatusMsg('Running AI spellcheck via LanguageTool…')
      const res = await window.api.spellcheckText(fullText, language)
      if (!res.success) throw new Error(res.error || 'Spellcheck failed')

      setCorrectedText(res.correctedText || fullText)
      setChangeCount(res.changeCount || 0)
      setStep('done')
      toast.success(`Spellcheck complete — ${res.changeCount} correction${res.changeCount === 1 ? '' : 's'} applied!`)
    } catch (err: any) {
      setStep('ready')
      toast.error(`Error: ${err.message}`)
    }
  }

  const handleExportPdf = async () => {
    if (!file || !correctedText) return
    setIsExporting(true)
    try {
      const res = await window.api.buildCorrectedPdf(file.path, correctedText)
      if (!res.success || !res.outputPath) throw new Error(res.error || 'Export failed')

      const baseName = file.name.replace('.pdf', '')
      const saveRes = await window.api.saveFile(res.outputPath, `${baseName}_spellchecked.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) toast.success('Corrected PDF saved!')
      else throw new Error(saveRes.error)
    } catch (err: any) {
      toast.error(`Export error: ${err.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportText = async () => {
    if (!file || !correctedText) return
    const blob = new Blob([correctedText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name.replace('.pdf', '_spellchecked.txt')
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Text file downloaded!')
  }

  const reset = () => {
    setFile(null)
    setStep('upload')
    setOriginalText('')
    setCorrectedText('')
    setChangeCount(0)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-12">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <SpellCheck className="w-8 h-8 text-accent" /> Spellcheck PDF
          </h1>
          <p className="text-muted">
            Upload your PDF, choose the document language, and let AI (LanguageTool) find and fix spelling &amp; grammar errors. View the corrected text side-by-side and export as a new PDF.
          </p>
        </header>

        {/* Step: Upload */}
        {step === 'upload' && (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        )}

        {/* Step: Ready / Checking / Done */}
        {step !== 'upload' && file && (
          <div className="space-y-6">
            {/* File bar */}
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-background rounded-lg text-accent border border-border">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground truncate max-w-sm">{file.name}</p>
                  <p className="text-xs text-muted">PDF document</p>
                </div>
              </div>
              {step === 'ready' && (
                <button onClick={reset} className="p-2 text-muted hover:text-danger transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Settings & Action (only in ready state) */}
            {step === 'ready' && (
              <div className="bg-secondary border border-border rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-foreground mb-2">Document Language</label>
                    <div className="relative">
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="w-full appearance-none bg-background border border-border rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-accent"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    </div>
                  </div>
                  <PrimaryButton onClick={handleCheck} className="px-8 shrink-0">
                    <SpellCheck className="w-4 h-4 mr-2" />
                    Run Spellcheck
                  </PrimaryButton>
                </div>
                <div className="bg-background border border-border rounded-lg p-3">
                  <p className="text-xs text-muted">
                    <span className="text-accent font-medium">Powered by LanguageTool</span> — checks spelling, grammar, punctuation, and style. First 20 pages are checked. Requires internet connection.
                  </p>
                </div>
              </div>
            )}

            {/* Checking state */}
            {step === 'checking' && (
              <div className="bg-secondary border border-border rounded-xl p-8 text-center space-y-4">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-semibold text-foreground">{statusMsg}</p>
                <p className="text-xs text-muted">This may take a moment depending on document length…</p>
              </div>
            )}

            {/* Done state — side-by-side results */}
            {step === 'done' && (
              <div className="space-y-5">
                {/* Stats bar */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${changeCount > 0 ? 'bg-accent/15 text-accent' : 'bg-green-500/15 text-green-400'}`}>
                    {changeCount > 0
                      ? <><AlertCircle className="w-4 h-4" /> {changeCount} correction{changeCount === 1 ? '' : 's'} applied</>
                      : <><CheckCircle2 className="w-4 h-4" /> No errors found!</>
                    }
                  </div>
                  <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <button
                      onClick={handleExportText}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-elevated transition-colors"
                    >
                      <Download className="w-4 h-4" /> Save as TXT
                    </button>
                    <PrimaryButton onClick={handleExportPdf} disabled={isExporting} className="px-5">
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exporting…' : 'Export as PDF'}
                    </PrimaryButton>
                    <button
                      onClick={reset}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-elevated transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" /> New File
                    </button>
                  </div>
                </div>

                {/* Tab switcher (mobile) */}
                <div className="flex md:hidden bg-secondary rounded-lg p-1 border border-border">
                  {(['original', 'corrected'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Side-by-side panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`space-y-2 ${activeTab !== 'original' ? 'hidden md:block' : ''}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                      <span className="w-2 h-2 rounded-full bg-border inline-block" />
                      Original Text
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 h-[520px] overflow-y-auto scrollbar-thin text-sm whitespace-pre-wrap leading-relaxed text-foreground/80">
                      {originalText || <span className="text-muted italic">No text extracted.</span>}
                    </div>
                  </div>
                  <div className={`space-y-2 ${activeTab !== 'corrected' ? 'hidden md:block' : ''}`}>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
                      <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                      Corrected Text
                    </div>
                    <textarea
                      className="w-full bg-background border border-border rounded-xl p-4 h-[520px] text-sm leading-relaxed resize-none focus:outline-none focus:border-accent text-foreground scrollbar-thin"
                      value={correctedText}
                      onChange={e => setCorrectedText(e.target.value)}
                      spellCheck={false}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted text-center">You can manually edit the corrected text before exporting.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
