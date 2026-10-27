import { useState, useRef, useEffect, useCallback } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X, AlertTriangle, Trash2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

interface RedactionBox {
  id: string
  page: number
  // canvas coords (for display)
  x: number; y: number; width: number; height: number
  // PDF coords (converted)
  pdfX: number; pdfY: number; pdfWidth: number; pdfHeight: number
}

export function RedactPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [redactions, setRedactions] = useState<RedactionBox[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pageScale, setPageScale] = useState({ scaleX: 1, scaleY: 1, pdfW: 0, pdfH: 0 })

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const ab = await f.arrayBuffer()
    const doc = await pdfjsLib.getDocument({ data: ab }).promise
    setPdfDoc(doc)
    setTotalPages(doc.numPages)
    setCurrentPage(1)
    setRedactions([])
    setFile({ name: f.name, path: window.api.getFilePath(f) })
  }

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    ;(async () => {
      const page = await pdfDoc.getPage(currentPage)
      const viewport = page.getViewport({ scale: 1.2 })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport } as any).promise
      setPageScale({
        scaleX: viewport.width / page.getViewport({ scale: 1 }).width,
        scaleY: viewport.height / page.getViewport({ scale: 1 }).height,
        pdfW: page.getViewport({ scale: 1 }).width,
        pdfH: page.getViewport({ scale: 1 }).height,
      })
      // Draw existing redactions on this page
      drawRedactions(ctx, viewport.height)
    })()
  }, [pdfDoc, currentPage])

  const drawRedactions = (ctx: CanvasRenderingContext2D, canvasH: number) => {
    redactions.filter(r => r.page === currentPage).forEach(r => {
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fillRect(r.x, r.y, r.width, r.height)
    })
  }

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = canvasRef.current!.width / rect.width
    const scaleY = canvasRef.current!.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e)
    setDrawStart(pos)
    setDrawCurrent(pos)
    setIsDrawing(true)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    setDrawCurrent(getCanvasPos(e))
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    const x = Math.min(drawStart.x, drawCurrent.x)
    const y = Math.min(drawStart.y, drawCurrent.y)
    const w = Math.abs(drawCurrent.x - drawStart.x)
    const h = Math.abs(drawCurrent.y - drawStart.y)
    if (w < 5 || h < 5) return

    // Convert canvas coords to PDF point coords
    const { scaleX, scaleY, pdfH } = pageScale
    const pdfX = x / scaleX
    const pdfYFromTop = y / scaleY
    const pdfW = w / scaleX
    const pdfHh = h / scaleY
    const pdfY = pdfH - pdfYFromTop - pdfHh // flip y for PDF coord system

    const box: RedactionBox = {
      id: `r-${Date.now()}`, page: currentPage,
      x, y, width: w, height: h,
      pdfX, pdfY, pdfWidth: pdfW, pdfHeight: pdfHh
    }
    setRedactions(prev => [...prev, box])
    // Redraw canvas with new box
    if (canvasRef.current && pdfDoc) {
      pdfDoc.getPage(currentPage).then(page => {
        const viewport = page.getViewport({ scale: 1.2 })
        const ctx = canvasRef.current!.getContext('2d')!
        page.render({ canvasContext: ctx, viewport } as any).promise.then(() => {
          drawRedactions(ctx, viewport.height)
          ctx.fillStyle = 'rgba(0,0,0,1)'
          ctx.fillRect(x, y, w, h)
        })
      })
    }
  }

  const removeRedaction = (id: string) => {
    setRedactions(prev => prev.filter(r => r.id !== id))
  }

  const handleSave = async () => {
    if (!file || redactions.length === 0) return
    setIsProcessing(true)
    try {
      const res = await (window.api as any).redactPdf(file.path, redactions)
      if (!res.success) throw new Error(res.error)
      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_redacted.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('PDF redacted!'); setFile(null); setRedactions([]) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="p-6 pb-3 border-b border-border shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Redact PDF</h1>
            <p className="text-sm text-muted">Draw boxes over sensitive content to permanently black it out.</p>
          </div>
          {file && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted">{redactions.length} redaction{redactions.length !== 1 ? 's' : ''}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 rounded border border-border disabled:opacity-40 text-sm">←</button>
                  <span className="text-sm">{currentPage}/{totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 rounded border border-border disabled:opacity-40 text-sm">→</button>
                </div>
              )}
              <PrimaryButton onClick={handleSave} disabled={redactions.length === 0}>Apply Redactions</PrimaryButton>
              <button onClick={() => { setFile(null); setPdfDoc(null); setRedactions([]) }} className="p-2 text-muted hover:text-danger"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      </div>

      {!file ? (
        <div className="flex-1 p-8 max-w-3xl mx-auto w-full">
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
          <div className="mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">Redacted areas will be permanently blacked out. This action cannot be undone once saved.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden gap-4 p-4">
          {/* Canvas area */}
          <div className="flex-1 overflow-auto bg-elevated rounded-lg border border-border flex items-start justify-center p-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="cursor-crosshair shadow-md rounded"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
              {/* Live drawing overlay */}
              {isDrawing && (
                <div className="absolute pointer-events-none" style={{
                  left: Math.min(drawStart.x, drawCurrent.x) + 'px',
                  top: Math.min(drawStart.y, drawCurrent.y) + 'px',
                  width: Math.abs(drawCurrent.x - drawStart.x) + 'px',
                  height: Math.abs(drawCurrent.y - drawStart.y) + 'px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  border: '2px solid black',
                }} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-56 shrink-0 bg-secondary border border-border rounded-lg p-3 overflow-y-auto">
            <p className="text-xs font-semibold text-muted uppercase mb-3">Redactions</p>
            {redactions.length === 0 ? (
              <p className="text-xs text-muted">Draw rectangles on the page to add redactions.</p>
            ) : (
              redactions.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
                  <span className="text-xs text-foreground">Page {r.page}</span>
                  <button onClick={() => removeRedaction(r.id)} className="text-muted hover:text-danger p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ProgressModal isOpen={isProcessing} title="Redacting PDF" status="Applying permanent redactions…" />
    </div>
  )
}
