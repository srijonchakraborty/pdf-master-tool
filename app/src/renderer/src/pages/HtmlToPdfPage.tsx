import { useState } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'
import { PageThumbnailGrid, PdfPageInfo } from '../components/PageThumbnailGrid'

export function HtmlToPdfPage() {
  const [sourceType, setSourceType] = useState<'url' | 'html'>('url')
  const [url, setUrl] = useState('')
  const [html, setHtml] = useState('')
  const [landscape, setLandscape] = useState(false)
  const [pageSize, setPageSize] = useState('A4')
  const [marginType, setMarginType] = useState<'default' | 'none' | 'minimum'>('default')
  const [scaling, setScaling] = useState<'auto' | '100' | '90' | '80' | '75' | '60'>('auto')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewPdfPath, setPreviewPdfPath] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([])

  const isValid = sourceType === 'url' ? url.startsWith('http') : html.trim().length > 0

  const handleConvert = async () => {
    if (!isValid) return
    setIsProcessing(true)
    try {
      const res = await (window.api as any).htmlToPdf({
        source: sourceType === 'url' ? { type: 'url', url } : { type: 'html', html },
        landscape,
        pageSize,
        marginType,
        scale: scaling === 'auto' ? undefined : Number(scaling) / 100,
        autoFit: scaling === 'auto'
      })
      if (!res.success || !res.outputPath) throw new Error(res.error)

      // Load PDF for preview
      const readRes = await window.api.readFile(res.outputPath)
      if (!readRes.success || !readRes.data) throw new Error("Failed to read generated PDF")

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(readRes.data) })
      const pdf = await loadingTask.promise
      const pages: PdfPageInfo[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        pages.push({ id: `page-${i}`, pageNumber: i, pdfDocument: pdf })
      }

      setPdfPages(pages)
      setPreviewPdfPath(res.outputPath)
      setIsProcessing(false)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const handleExport = async () => {
    if (!previewPdfPath) return
    try {
      const defaultName = `${sourceType === 'url' ? 'webpage' : 'html-content'}.pdf`
      const saveRes = await window.api.saveFile(previewPdfPath, defaultName)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { 
        toast.success('PDF saved successfully!')
        setUrl('')
        setHtml('')
        setPreviewPdfPath(null)
        setPdfPages([])
      }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">HTML to PDF</h1>
          <p className="text-muted">Convert a web page URL or raw HTML into a PDF document without content cropping.</p>
        </header>

        <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
          <div className="flex gap-2">
            <button onClick={() => setSourceType('url')}
              className={cn("flex-1 py-2 rounded border text-sm font-medium transition-colors",
                sourceType === 'url' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50")}>
              URL
            </button>
            <button onClick={() => setSourceType('html')}
              className={cn("flex-1 py-2 rounded border text-sm font-medium transition-colors",
                sourceType === 'html' ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50")}>
              Raw HTML
            </button>
          </div>

          {sourceType === 'url' ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Website URL</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">HTML Content</label>
              <textarea value={html} onChange={e => setHtml(e.target.value)} placeholder="<html>...</html>" rows={8}
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent font-mono resize-y" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Page Size</label>
              <select value={pageSize} onChange={e => setPageSize(e.target.value)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent">
                {['A4', 'A3', 'Letter', 'Legal', 'Tabloid'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Margins</label>
              <select value={marginType} onChange={e => setMarginType(e.target.value as any)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="default">Default</option>
                <option value="minimum">Minimum</option>
                <option value="none">None (0px)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Scaling / Fit</label>
              <select value={scaling} onChange={e => setScaling(e.target.value as any)}
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent">
                <option value="auto">Auto-Fit Page (Anti-Crop)</option>
                <option value="100">100% Original</option>
                <option value="90">90% Scale</option>
                <option value="80">80% Scale</option>
                <option value="75">75% Scale</option>
                <option value="60">60% Scale</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={landscape} onChange={e => setLandscape(e.target.checked)} className="w-4 h-4 accent-accent" />
                <span className="text-sm font-medium">Landscape</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <PrimaryButton onClick={handleConvert} disabled={!isValid} className="px-8">Convert to PDF</PrimaryButton>
          </div>
        </div>
      </div>

      {/* Output PDF Preview Modal */}
      {previewPdfPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Preview PDF
              </h2>
              <button onClick={() => { setPreviewPdfPath(null); setPdfPages([]) }} className="p-2 text-muted hover:text-foreground transition-colors rounded hover:bg-elevated">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-secondary/10">
              {pdfPages.length > 0 ? (
                <div className="bg-background rounded-lg border border-border p-4 shadow-sm">
                  <PageThumbnailGrid pages={pdfPages} selectedIds={[]} onToggleSelect={() => {}} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted">Loading preview...</div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/50 flex justify-end gap-3">
              <button onClick={() => { setPreviewPdfPath(null); setPdfPages([]) }} className="px-4 py-2 rounded font-medium text-sm border border-border hover:bg-elevated transition-colors">
                Cancel
              </button>
              <PrimaryButton onClick={handleExport} className="px-6">
                Export PDF
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <ProgressModal isOpen={isProcessing} title="Converting to PDF" status="Loading page and rendering..." />
    </div>
  )
}
