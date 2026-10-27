import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'

export function WatermarkPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [type, setType] = useState<'text' | 'image'>('text')
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(0.3)
  const [rotation, setRotation] = useState(45)
  const [fontSize, setFontSize] = useState(60)
  const [pages, setPages] = useState<'all'>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  useEffect(() => {
    if (!file) {
      setPagePreviewUrl(null)
      return
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true)
      try {
        const fileData = await window.api.readFile(file.path)
        if (!fileData.success || !fileData.data) throw new Error(fileData.error || 'Failed to read file')

        const pdf = await pdfjsLib.getDocument({ data: fileData.data }).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 1.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (context) {
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          setPagePreviewUrl(canvas.toDataURL('image/jpeg', 0.8))
        }
      } catch (err: any) {
        console.error('Error loading PDF preview:', err)
      } finally {
        setIsLoadingPreview(false)
      }
    }

    loadPreview()
  }, [file])

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f) })
  }

  const handleApply = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const res = await window.api.watermarkPdf({
        filePath: file.path, type, text: type === 'text' ? text : undefined,
        opacity, rotation, fontSize: type === 'text' ? fontSize : undefined, pages
      })
      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_watermarked.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('Watermark applied!'); setFile(null) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Watermark PDF</h1>
          <p className="text-muted">Apply a text watermark across all pages of your PDF.</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-accent" />
                <span className="font-medium truncate max-w-sm">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
              {/* Watermark Text */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Watermark Text</label>
                <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="e.g. CONFIDENTIAL, DRAFT"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Font size */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Font Size: {fontSize}pt</label>
                  <input type="range" min={20} max={120} value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
                    className="w-full accent-accent" />
                </div>
                {/* Opacity */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Opacity: {Math.round(opacity * 100)}%</label>
                  <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={e => setOpacity(Number(e.target.value))}
                    className="w-full accent-accent" />
                </div>
                {/* Rotation */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Rotation: {rotation}°</label>
                  <input type="range" min={-90} max={90} value={rotation} onChange={e => setRotation(Number(e.target.value))}
                    className="w-full accent-accent" />
                </div>
              </div>

              {/* Live Preview on Actual PDF Page */}
              <div className="border border-border rounded-lg overflow-hidden bg-background p-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Live Document Preview</p>
                <div className="relative mx-auto max-w-md bg-white rounded shadow-lg overflow-hidden flex items-center justify-center border border-border min-h-[300px]">
                  {isLoadingPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 animate-pulse text-xs text-muted">
                      Loading page preview...
                    </div>
                  )}
                  {pagePreviewUrl ? (
                    <img src={pagePreviewUrl} alt="Page 1 Preview" className="w-full h-auto block select-none" />
                  ) : (
                    <div className="p-8 text-center text-sm text-gray-400">Sample Page Content</div>
                  )}

                  {/* Watermark Overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      opacity: opacity,
                    }}
                  >
                    <span
                      className="font-bold text-gray-700 select-none whitespace-nowrap drop-shadow"
                      style={{ fontSize: `${Math.max(fontSize / 2.5, 14)}px` }}
                    >
                      {text || 'WATERMARK'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <PrimaryButton onClick={handleApply} disabled={!text} className="px-8">Apply Watermark</PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Applying Watermark" status="Processing all pages..." />
    </div>
  )
}
