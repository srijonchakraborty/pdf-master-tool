import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'

type Position = 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'

export function AddPageNumbersPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [position, setPosition] = useState<Position>('bottom-center')
  const [format, setFormat] = useState('{n}')
  const [startAt, setStartAt] = useState(1)
  const [fontSize, setFontSize] = useState(12)
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
      const res = await window.api.addPageNumbers({ filePath: file.path, position, format, startAt, fontSize, pages: 'all' })
      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_numbered.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('Page numbers added!'); setFile(null) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const positions: { value: Position; label: string; grid: string }[] = [
    { value: 'top-left', label: 'Top Left', grid: 'col-start-1 row-start-1' },
    { value: 'top-center', label: 'Top Center', grid: 'col-start-2 row-start-1' },
    { value: 'top-right', label: 'Top Right', grid: 'col-start-3 row-start-1' },
    { value: 'bottom-left', label: 'Bottom Left', grid: 'col-start-1 row-start-2' },
    { value: 'bottom-center', label: 'Bottom Center', grid: 'col-start-2 row-start-2' },
    { value: 'bottom-right', label: 'Bottom Right', grid: 'col-start-3 row-start-2' },
  ]

  const getPositionClass = (pos: Position) => {
    switch (pos) {
      case 'top-left': return 'top-3 left-4 text-left'
      case 'top-center': return 'top-3 left-1/2 -translate-x-1/2 text-center'
      case 'top-right': return 'top-3 right-4 text-right'
      case 'bottom-left': return 'bottom-3 left-4 text-left'
      case 'bottom-center': return 'bottom-3 left-1/2 -translate-x-1/2 text-center'
      case 'bottom-right': return 'bottom-3 right-4 text-right'
    }
  }

  const formattedPreviewText = format
    .replace(/\{n\}/g, String(startAt))
    .replace(/\{total\}/g, '12')

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Add Page Numbers</h1>
          <p className="text-muted">Insert customizable page numbers to every page of your PDF.</p>
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
              {/* Position Picker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Position</label>
                <div className="inline-grid grid-cols-3 grid-rows-2 gap-2 bg-background p-3 rounded-lg border border-border">
                  {positions.map(pos => (
                    <button key={pos.value} onClick={() => setPosition(pos.value)}
                      className={cn("px-3 py-2 text-xs rounded transition-colors", pos.grid,
                        position === pos.value ? "bg-accent text-white" : "text-muted hover:bg-elevated hover:text-foreground")}>
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Format</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {['{n}', 'Page {n}', '{n} of {total}', 'Page {n} of {total}'].map(f => (
                    <button key={f} onClick={() => setFormat(f)}
                      className={cn("text-xs px-3 py-1.5 rounded border transition-colors font-mono",
                        format === f ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50")}>
                      {f}
                    </button>
                  ))}
                </div>
                <input type="text" value={format} onChange={e => setFormat(e.target.value)} placeholder="Custom format"
                  className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent font-mono" />
                <p className="text-xs text-muted mt-1">Use <code className="bg-elevated px-1">{'{n}'}</code> for page number, <code className="bg-elevated px-1">{'{total}'}</code> for total pages.</p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Start numbering at</label>
                  <input type="number" value={startAt} onChange={e => setStartAt(parseInt(e.target.value) || 1)} min={1}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Font size (pt)</label>
                  <input type="number" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value) || 12)} min={6} max={72}
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                </div>
              </div>

              {/* Live Preview Card */}
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

                  {/* Page Number Overlay */}
                  <div
                    className={cn("absolute font-sans font-semibold text-gray-900 pointer-events-none px-2 py-0.5 rounded bg-amber-200/80 border border-amber-400 shadow-sm", getPositionClass(position))}
                    style={{ fontSize: `${Math.max(fontSize, 11)}px` }}
                  >
                    {formattedPreviewText}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <PrimaryButton onClick={handleApply} className="px-8">Apply Page Numbers</PrimaryButton>
              </div>
            </div>
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Adding Page Numbers" status="Processing document..." />
    </div>
  )
}
