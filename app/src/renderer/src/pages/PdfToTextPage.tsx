import { useState, useRef } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { toast } from 'sonner'
import {
  FileOutput, FileText, X, Copy, Check, Download,
  ScanText, ChevronDown, RefreshCw, Maximize2
} from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

const TEXT_MODES = [
  { id: 'raw', label: 'Raw Extraction', desc: 'Preserve original layout and spacing' },
  { id: 'clean', label: 'Clean Text', desc: 'Strip extra whitespace, join lines' },
  { id: 'ocr', label: 'OCR Mode', desc: 'For scanned/image PDFs (uses offline OCR)' },
]

type Mode = 'raw' | 'clean' | 'ocr'
type Step = 'upload' | 'extracting' | 'done'

export function PdfToTextPage() {
  const [file, setFile] = useState<{ name: string; path: string; buffer: ArrayBuffer } | null>(null)
  const [mode, setMode] = useState<Mode>('clean')
  const [step, setStep] = useState<Step>('upload')
  const [extractedText, setExtractedText] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [wordCount, setWordCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const buffer = await f.arrayBuffer()
    setFile({ name: f.name, path: window.api.getFilePath(f), buffer })
    setExtractedText('')
    setStep('upload')
  }

  const handleExtract = async () => {
    if (!file) return
    setStep('extracting')
    setStatusMsg('Loading PDF…')

    try {
      let text = ''

      if (mode === 'ocr') {
        // Delegate to main process OCR (Tesseract) with canvas images
        setStatusMsg('Running offline OCR…')
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file.buffer) }).promise
        setPageCount(pdf.numPages)
        for (let i = 1; i <= pdf.numPages; i++) {
          setStatusMsg(`Recognizing page ${i} of ${pdf.numPages}…`)
          const pg = await pdf.getPage(i)
          const viewport = pg.getViewport({ scale: 2.0 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('No canvas context')
          await pg.render({ canvasContext: context as any, viewport }).promise
          
          const dataUrl = canvas.toDataURL('image/png')
          const res = await window.api.recognizeImageText(dataUrl, 'eng')
          if (!res.success) throw new Error(res.error || 'OCR failed')
          text += (res.text || '') + '\n\n'
        }
      } else {
        // Direct pdfjs text extraction
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file.buffer) }).promise
        setPageCount(pdf.numPages)

        for (let i = 1; i <= pdf.numPages; i++) {
          setStatusMsg(`Extracting page ${i} of ${pdf.numPages}…`)
          const pg = await pdf.getPage(i)
          const tc = await pg.getTextContent()

          if (mode === 'raw') {
            // Preserve position using transform coords
            const items = tc.items as any[]
            let prevY = -1
            let pageText = ''
            for (const item of items) {
              const y = item.transform ? Math.round(item.transform[5]) : 0
              if (prevY !== -1 && Math.abs(y - prevY) > 2) pageText += '\n'
              pageText += item.str
              prevY = y
            }
            text += pageText + '\n\n--- Page ' + i + ' ---\n\n'
          } else {
            // Clean mode
            const raw = tc.items.map((it: any) => it.str).join(' ')
            const cleaned = raw
              .replace(/\s{3,}/g, '\n\n')   // collapse excessive spaces to paragraphs
              .replace(/ {2,}/g, ' ')        // collapse double spaces
              .trim()
            text += cleaned + '\n\n'
          }
        }
      }

      // Compute word count
      const wc = text.trim().split(/\s+/).filter(Boolean).length
      setWordCount(wc)
      setExtractedText(text)
      setStep('done')
      toast.success(`Extracted ${wc.toLocaleString()} words from ${pageCount || 0} pages!`)
    } catch (err: any) {
      setStep('upload')
      toast.error(`Extraction failed: ${err.message}`)
    }
  }

  const handleSaveTxt = async () => {
    if (!file || !extractedText) return
    const res = await window.api.pdfToText(file.path, extractedText)
    if (!res.success || !res.outputPath) { toast.error(res.error || 'Save failed'); return }
    const baseName = file.name.replace('.pdf', '')
    const saveRes = await window.api.saveFile(res.outputPath, `${baseName}.txt`)
    if (saveRes.canceled) toast.info('Save canceled.')
    else if (saveRes.success) toast.success('Text file saved!')
    else toast.error(saveRes.error)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(extractedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Copied to clipboard!')
  }

  const reset = () => {
    setFile(null)
    setStep('upload')
    setExtractedText('')
    setPageCount(0)
    setWordCount(0)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-12">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <FileOutput className="w-8 h-8 text-accent" /> PDF to Text
          </h1>
          <p className="text-muted">
            Extract all text from your PDF documents. For scanned PDFs, use OCR Mode to recognize text from images. Copy, download, or continue editing the result.
          </p>
        </header>

        {step === 'upload' && (
          <div className="space-y-6">
            <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />

            {file && (
              <>
                <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-background rounded-lg text-accent border border-border">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="font-semibold text-foreground truncate max-w-sm">{file.name}</p>
                  </div>
                  <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mode selector */}
                <div className="bg-secondary border border-border rounded-xl p-6 space-y-4">
                  <h3 className="font-semibold text-foreground">Extraction Mode</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {TEXT_MODES.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id as Mode)}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${mode === m.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/40 bg-background'}`}
                      >
                        <p className="font-semibold text-sm text-foreground mb-1">{m.label}</p>
                        <p className="text-xs text-muted">{m.desc}</p>
                        {m.id === 'ocr' && (
                          <span className="mt-2 inline-block text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">Slow — uses offline AI</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-end pt-2">
                    <PrimaryButton onClick={handleExtract} className="px-8">
                      <ScanText className="w-4 h-4 mr-2" />
                      Extract Text
                    </PrimaryButton>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'extracting' && (
          <div className="bg-secondary border border-border rounded-xl p-12 text-center space-y-5">
            <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-semibold text-foreground text-lg">{statusMsg}</p>
            <p className="text-xs text-muted">Processing your document…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-5">
            {/* Stats + action bar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-4 bg-secondary border border-border rounded-xl px-5 py-3 text-sm">
                <span className="text-muted">Pages: <span className="text-foreground font-semibold">{pageCount}</span></span>
                <span className="text-border">|</span>
                <span className="text-muted">Words: <span className="text-foreground font-semibold">{wordCount.toLocaleString()}</span></span>
                <span className="text-border">|</span>
                <span className="text-muted">Characters: <span className="text-foreground font-semibold">{extractedText.length.toLocaleString()}</span></span>
              </div>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-elevated transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <PrimaryButton onClick={handleSaveTxt} className="px-5">
                  <Download className="w-4 h-4 mr-2" /> Save as TXT
                </PrimaryButton>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-elevated transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> New File
                </button>
              </div>
            </div>

            {/* Text editor */}
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-accent flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent inline-block" /> Extracted Text
                </span>
                <span className="text-xs text-muted italic">You can edit the text directly below</span>
              </div>
              <textarea
                ref={textareaRef}
                value={extractedText}
                onChange={e => {
                  setExtractedText(e.target.value)
                  const wc = e.target.value.trim().split(/\s+/).filter(Boolean).length
                  setWordCount(wc)
                }}
                className="w-full h-[560px] bg-background border border-border rounded-xl p-5 text-sm leading-relaxed resize-none focus:outline-none focus:border-accent text-foreground scrollbar-thin font-mono"
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
