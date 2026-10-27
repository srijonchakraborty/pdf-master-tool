import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { toast } from 'sonner'
import { FileSearch, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

const LANGUAGES = [
  { code: 'eng', label: 'English' },
  { code: 'fra', label: 'French' },
  { code: 'deu', label: 'German' },
  { code: 'spa', label: 'Spanish' },
  { code: 'ita', label: 'Italian' },
  { code: 'por', label: 'Portuguese' },
  { code: 'chi_sim', label: 'Chinese (Simplified)' },
  { code: 'jpn', label: 'Japanese' },
  { code: 'kor', label: 'Korean' },
  { code: 'ara', label: 'Arabic' },
]

export function OcrPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string; buffer: ArrayBuffer } | null>(null)
  const [language, setLanguage] = useState('eng')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ page: number; totalPages: number; status: string } | null>(null)

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const buffer = await f.arrayBuffer()
    setFile({ name: f.name, path: window.api.getFilePath(f), buffer })
    setProgress(null)
  }

  const handleOcr = async () => {
    if (!file) return
    setIsProcessing(true)
    setProgress(null)

    try {
      const pdfBytes = new Uint8Array(file.buffer)
      const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
      const totalPages = srcDoc.getPageCount()

      const outDoc = await PDFDocument.create()
      const font = await outDoc.embedFont(StandardFonts.Helvetica)

      const pdfJsDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise

      for (let i = 1; i <= totalPages; i++) {
        setProgress({ page: i, totalPages, status: `Rendering page ${i}…` })
        
        // Render to canvas
        const page = await pdfJsDoc.getPage(i)
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not get canvas context')
        await page.render({ canvasContext: context as any, viewport }).promise
        
        const dataUrl = canvas.toDataURL('image/png')
        
        // Get OCR boxes via IPC to avoid CSP worker issues
        setProgress({ page: i, totalPages, status: `Recognizing text on page ${i}…` })
        const ocrRes = await window.api.recognizeImageBoxes(dataUrl, language)
        if (!ocrRes.success) throw new Error(ocrRes.error)

        // Map to PDF coords and overlay
        const srcPage = srcDoc.getPage(i - 1)
        const { width: pw, height: ph } = srcPage.getSize()
        
        // Embed the base64 png
        const embeddedImg = await outDoc.embedPng(dataUrl)
        const newPage = outDoc.addPage([pw, ph])
        newPage.drawImage(embeddedImg, { x: 0, y: 0, width: pw, height: ph })

        const { words, width: imgW = pw, height: imgH = ph } = ocrRes
        for (const word of words || []) {
          if (!word.text?.trim()) continue
          const { x0, y0, y1 } = word.bbox
          const scaleX = pw / imgW
          const scaleY = ph / imgH
          const pdfX = x0 * scaleX
          const pdfY = ph - (y1 * scaleY)
          const boxH = (y1 - y0) * scaleY
          const fontSize = Math.max(boxH * 0.9, 4)

          try {
            newPage.drawText(word.text, {
              x: pdfX, y: pdfY, size: fontSize, font, color: rgb(0,0,0), opacity: 0.001
            })
          } catch {}
        }
      }

      // Save
      setProgress({ page: totalPages, totalPages, status: 'Saving searchable PDF…' })
      const outBytes = await outDoc.save()
      const saveRes = await window.api.saveFileFromBuffer(outBytes, `${file.name.replace('.pdf', '')}_ocr.pdf`)
      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('OCR complete! Text is now searchable.')
        setFile(null)
      } else {
        throw new Error(saveRes.error)
      }
      
    } catch (err: any) {
      toast.error(`OCR Error: ${err.message}`)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">OCR PDF</h1>
          <p className="text-muted">Make scanned PDFs searchable by adding an invisible text layer using offline OCR.</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <FileSearch className="w-6 h-6 text-accent" />
                <span className="font-medium truncate max-w-sm">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-secondary border border-border rounded-xl p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Document Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent">
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
                <p className="text-xs text-muted mt-1.5">Language data is bundled and runs entirely offline.</p>
              </div>

              {/* Progress display */}
              {isProcessing && progress && (
                <div className="bg-background border border-border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">{progress.status}</p>
                  <div className="w-full bg-elevated rounded-full h-2">
                    <div className="bg-accent h-2 rounded-full transition-all"
                      style={{ width: `${Math.round((progress.page / progress.totalPages) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted">Page {progress.page} of {progress.totalPages}</p>
                </div>
              )}

              {isProcessing && !progress && (
                <div className="flex items-center gap-3 bg-background border border-border rounded-lg p-4">
                  <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted">Initializing offline OCR engine…</p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <PrimaryButton onClick={handleOcr} disabled={isProcessing} className="px-8">
                  {isProcessing ? 'Running OCR…' : 'Run OCR'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
