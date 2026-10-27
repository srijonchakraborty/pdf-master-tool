import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { PageThumbnailGrid, PdfPageInfo } from '../components/PageThumbnailGrid'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import { RotateCcw, RotateCw, FileText, X } from 'lucide-react'

interface PageRotation {
  id: string
  pageNumber: number
  rotation: number // cumulative, degrees
  pdfDocument: pdfjsLib.PDFDocumentProxy
}

export function RotatePdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [pages, setPages] = useState<PageRotation[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    return () => { if (pages.length) (pages[0].pdfDocument as any).destroy?.() }
  }, [pages])

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const arrayBuffer = await f.arrayBuffer()
    const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const newPages: PageRotation[] = []
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      newPages.push({ id: `page-${i}`, pageNumber: i, rotation: 0, pdfDocument })
    }
    setPages(newPages)
    setFile({ name: f.name, path: window.api.getFilePath(f) })
    setSelectedIds([])
  }

  const rotateSelected = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : 270
    setPages(prev => prev.map(p =>
      selectedIds.includes(p.id)
        ? { ...p, rotation: (p.rotation + delta) % 360 }
        : p
    ))
  }

  const rotateAll = (direction: 'cw' | 'ccw') => {
    const delta = direction === 'cw' ? 90 : 270
    setPages(prev => prev.map(p => ({ ...p, rotation: (p.rotation + delta) % 360 })))
  }

  const handleSave = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const rotations = pages
        .filter(p => p.rotation !== 0)
        .map(p => ({ page: p.pageNumber, degrees: p.rotation as 0 | 90 | 180 | 270 }))

      if (!rotations.length) {
        toast.info('No rotations applied. All pages are at their original orientation.')
        setIsProcessing(false)
        return
      }

      const res = await window.api.rotatePdf(file.path, rotations)
      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_rotated.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('PDF rotated and saved!'); setFile(null); setPages([]) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="p-8 pb-4 shrink-0 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Rotate PDF</h1>
            <p className="text-muted">Click pages to select, then use the rotate buttons.</p>
          </div>
          {file && (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                <button onClick={() => rotateAll('ccw')} className="flex items-center gap-1 px-3 py-2 bg-secondary border border-border rounded hover:bg-elevated text-sm">
                  <RotateCcw className="w-4 h-4" /> All CCW
                </button>
                <button onClick={() => rotateAll('cw')} className="flex items-center gap-1 px-3 py-2 bg-secondary border border-border rounded hover:bg-elevated text-sm">
                  <RotateCw className="w-4 h-4" /> All CW
                </button>
                {selectedIds.length > 0 && <>
                  <button onClick={() => rotateSelected('ccw')} className="flex items-center gap-1 px-3 py-2 bg-accent/10 border border-accent/30 rounded text-accent hover:bg-accent/20 text-sm">
                    <RotateCcw className="w-4 h-4" /> Selected CCW
                  </button>
                  <button onClick={() => rotateSelected('cw')} className="flex items-center gap-1 px-3 py-2 bg-accent/10 border border-accent/30 rounded text-accent hover:bg-accent/20 text-sm">
                    <RotateCw className="w-4 h-4" /> Selected CW
                  </button>
                </>}
              </div>
              <PrimaryButton onClick={handleSave}>Save PDF</PrimaryButton>
              <button onClick={() => { setFile(null); setPages([]) }} className="p-2 text-muted hover:text-danger">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!file ? (
          <div className="p-8 max-w-3xl mx-auto">
            <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
          </div>
        ) : (
          <PageThumbnailGrid
            pages={pages.map(p => ({ id: p.id, pageNumber: p.pageNumber, pdfDocument: p.pdfDocument, rotation: p.rotation } as PdfPageInfo))}
            selectedIds={selectedIds}
            onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
          />
        )}
      </div>

      <ProgressModal isOpen={isProcessing} title="Rotating PDF" status="Applying rotations..." />
    </div>
  )
}
