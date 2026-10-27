import { useState, useRef, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X, PenTool, Type, Upload, Trash2, Check, ChevronLeft, ChevronRight, Move } from 'lucide-react'
import { cn } from '../lib/utils'
import * as pdfjsLib from 'pdfjs-dist'

type SignMode = 'draw' | 'type' | 'upload'

const SIG_PDF_WIDTH = 200
const SIG_PDF_HEIGHT = 60

export function SignPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string; buffer: ArrayBuffer } | null>(null)
  const [signMode, setSignMode] = useState<SignMode>('draw')
  const [typedText, setTypedText] = useState('')
  const [uploadedSig, setUploadedSig] = useState<string | null>(null)
  const [hasDrawing, setHasDrawing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sigScale, setSigScale] = useState(1)
  
  // PDF Preview & Placement State
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pagePreviewUrl, setPagePreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  
  const [pdfPageWidth, setPdfPageWidth] = useState(595)
  const [viewScale, setViewScale] = useState(1)
  const [pdfX, setPdfX] = useState(50)
  const [pdfY, setPdfY] = useState(50)

  // Dragging State
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [sigPreview, setSigPreview] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize Drawing Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [signMode])

  // Generate Signature Data URL
  const getSignatureDataUrl = (): string | null => {
    if (signMode === 'draw') {
      if (!hasDrawing) return null
      return canvasRef.current!.toDataURL('image/png')
    }
    if (signMode === 'type') {
      if (!typedText.trim()) return null
      const canvas = document.createElement('canvas')
      canvas.width = 400; canvas.height = 120
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#1a1a2e'
      ctx.font = `italic 56px cursive`
      ctx.textBaseline = 'middle'
      ctx.fillText(typedText, 10, 60)
      return canvas.toDataURL('image/png')
    }
    if (signMode === 'upload') return uploadedSig
    return null
  }

  // Update Signature Preview
  useEffect(() => {
    setSigPreview(getSignatureDataUrl())
  }, [signMode, hasDrawing, typedText, uploadedSig])

  // Load PDF Page
  useEffect(() => {
    if (!file) {
      setPagePreviewUrl(null)
      return
    }

    const loadPage = async () => {
      setIsLoadingPreview(true)
      try {
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(file.buffer) }).promise
        setTotalPages(pdf.numPages)
        const page = await pdf.getPage(pageNumber)
        
        const viewport1 = page.getViewport({ scale: 1.0 })
        setPdfPageWidth(viewport1.width)

        // Render high res for display
        const viewport = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (context) {
          canvas.height = viewport.height
          canvas.width = viewport.width
          await page.render({ canvasContext: context, viewport }).promise
          setPagePreviewUrl(canvas.toDataURL('image/jpeg', 0.8))
        }
      } catch (err) {
        console.error('Error loading PDF preview:', err)
      } finally {
        setIsLoadingPreview(false)
      }
    }

    loadPage()
  }, [file, pageNumber])

  // Manage View Scale
  const updateScale = () => {
    if (imgRef.current && pdfPageWidth > 0) {
      setViewScale(imgRef.current.clientWidth / pdfPageWidth)
    }
  }
  useEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [pdfPageWidth, pagePreviewUrl])

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasDrawing(true)
  }

  const stopDrawing = () => { 
    if (isDrawing.current) {
      isDrawing.current = false
      setSigPreview(getSignatureDataUrl())
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasDrawing(false)
    setSigPreview(null)
  }

  // File Handlers
  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const buffer = await f.arrayBuffer()
    setFile({ name: f.name, path: window.api.getFilePath(f), buffer })
    setPageNumber(1)
  }

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setUploadedSig(reader.result as string)
    reader.readAsDataURL(f)
  }

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!sigPreview) return
    setIsDragging(true)
    const bounds = containerRef.current!.getBoundingClientRect()
    const currentPx = pdfX * viewScale
    const currentPy = pdfY * viewScale
    setDragOffset({
      x: e.clientX - bounds.left - currentPx,
      y: e.clientY - bounds.top - currentPy
    })
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const bounds = containerRef.current!.getBoundingClientRect()
    
    let newPx = e.clientX - bounds.left - dragOffset.x
    let newPy = e.clientY - bounds.top - dragOffset.y
    
    newPx = Math.max(0, Math.min(newPx, bounds.width - (SIG_PDF_WIDTH * sigScale * viewScale)))
    newPy = Math.max(0, Math.min(newPy, bounds.height - (SIG_PDF_HEIGHT * sigScale * viewScale)))
    
    setPdfX(newPx / viewScale)
    setPdfY(newPy / viewScale)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // Apply Signature
  const handleSign = async () => {
    if (!file) return
    if (!sigPreview) { toast.error('Please create a signature first.'); return }

    setIsProcessing(true)
    try {
      const res = await (window.api as any).signPdf({
        filePath: file.path,
        signatureImageDataUrl: sigPreview,
        page: pageNumber,
        x: pdfX,
        y: pdfY,
        width: SIG_PDF_WIDTH * sigScale,
        height: SIG_PDF_HEIGHT * sigScale,
      })
      if (!res.success) throw new Error(res.error)
      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_signed.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { 
        toast.success('PDF signed successfully!')
        setFile(null)
      }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Sign PDF</h1>
          <p className="text-muted">Visually place your electronic signature anywhere on the document.</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Sidebar: Controls & Signature Creation */}
            <div className="xl:col-span-4 space-y-6 flex flex-col">
              <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-6 h-6 text-accent shrink-0" />
                  <span className="font-medium truncate text-sm">{file.name}</span>
                </div>
                <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger shrink-0"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-secondary border border-border rounded-xl p-5 space-y-5 flex-1">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-muted">1. Create Signature</h2>
                
                <div className="flex gap-2">
                  {([['draw', <PenTool className="w-4 h-4" />, 'Draw'], ['type', <Type className="w-4 h-4" />, 'Type'], ['upload', <Upload className="w-4 h-4" />, 'Upload']] as const).map(([mode, icon, label]) => (
                    <button key={mode} onClick={() => setSignMode(mode as SignMode)}
                      className={cn("flex items-center justify-center gap-2 flex-1 py-2 rounded-lg border text-sm font-medium transition-colors",
                        signMode === mode ? "border-accent bg-accent/10 text-accent" : "border-border bg-background hover:border-accent/50")}>
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {signMode === 'draw' && (
                  <div className="space-y-2">
                    <div className="relative border-2 border-dashed border-border rounded-xl overflow-hidden bg-white">
                      <canvas
                        ref={canvasRef}
                        width={400} height={120}
                        className="w-full cursor-crosshair touch-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                      />
                      {!hasDrawing && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-gray-300 text-sm font-medium">Draw your signature here</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-muted hover:text-danger font-medium">
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                      </button>
                    </div>
                  </div>
                )}

                {signMode === 'type' && (
                  <div className="space-y-3">
                    <input type="text" value={typedText} onChange={e => setTypedText(e.target.value)}
                      placeholder="Type your name…"
                      className="w-full bg-background border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent" />
                  </div>
                )}

                {signMode === 'upload' && (
                  <div className="space-y-3">
                    <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer bg-background hover:border-accent/50 transition-colors">
                      <Upload className="w-8 h-8 text-muted mx-auto mb-3" />
                      <p className="text-sm text-muted font-medium">Click to upload image (PNG/JPG)</p>
                      <input type="file" className="hidden" accept="image/*" onChange={handleSigUpload} />
                    </label>
                  </div>
                )}

                <div className="pt-4 border-t border-border mt-auto">
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted mb-4">2. Adjust Size</h2>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted font-medium">
                      <span>Small</span>
                      <span>Scale: {sigScale.toFixed(1)}x</span>
                      <span>Large</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.5" max="3" step="0.1" 
                      value={sigScale} 
                      onChange={e => setSigScale(parseFloat(e.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-2">
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-muted mb-4">3. Save Document</h2>
                  <PrimaryButton onClick={handleSign} disabled={!sigPreview} className="w-full py-3">
                    <Check className="w-4 h-4 mr-2" /> Apply & Save PDF
                  </PrimaryButton>
                  {!sigPreview && <p className="text-xs text-center text-danger mt-2">Please create a signature first</p>}
                </div>
              </div>
            </div>

            {/* Right Main Area: Document Preview & Placement */}
            <div className="xl:col-span-8 flex flex-col items-center bg-secondary/30 rounded-2xl border border-border p-6 min-h-[600px]">
              
              {/* Pagination */}
              <div className="flex items-center gap-4 bg-background border border-border rounded-full px-2 py-1 mb-6 shadow-sm">
                <button 
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber === 1}
                  className="p-2 rounded-full hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <span className="text-sm font-medium text-foreground min-w-[80px] text-center">
                  Page {pageNumber} of {totalPages}
                </span>
                <button 
                  onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                  disabled={pageNumber === totalPages}
                  className="p-2 rounded-full hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* PDF Document Container */}
              <div 
                ref={containerRef}
                className="relative bg-white shadow-xl rounded-sm border border-border/50 select-none overflow-hidden"
                style={{ width: 'fit-content' }}
              >
                {isLoadingPreview && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-sm">
                    <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                
                {pagePreviewUrl ? (
                  <img 
                    ref={imgRef}
                    src={pagePreviewUrl} 
                    alt={`Page ${pageNumber}`} 
                    className="max-w-full max-h-[70vh] object-contain pointer-events-none"
                    onLoad={updateScale}
                  />
                ) : (
                  <div className="w-[400px] h-[550px] bg-white" />
                )}

                {/* Draggable Signature Overlay */}
                {sigPreview && !isLoadingPreview && pagePreviewUrl && (
                  <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="absolute cursor-move group select-none touch-none"
                    style={{
                      left: `${pdfX * viewScale}px`,
                      top: `${pdfY * viewScale}px`,
                      width: `${SIG_PDF_WIDTH * sigScale * viewScale}px`,
                      height: `${SIG_PDF_HEIGHT * sigScale * viewScale}px`,
                    }}
                  >
                    <div className="absolute inset-0 border-2 border-accent/0 group-hover:border-accent/100 bg-accent/0 group-hover:bg-accent/5 transition-colors rounded" />
                    <div className="absolute -top-3 -right-3 bg-accent text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <Move className="w-3 h-3" />
                    </div>
                    <img 
                      src={sigPreview} 
                      alt="Signature" 
                      className="w-full h-full object-contain drop-shadow-sm pointer-events-none" 
                    />
                  </div>
                )}
              </div>
              
              {sigPreview && (
                <p className="text-xs text-muted mt-6 flex items-center gap-2">
                  <Move className="w-3.5 h-3.5" /> Drag the signature to place it on the document
                </p>
              )}
            </div>
            
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Signing PDF" status="Embedding signature to document…" />
    </div>
  )
}
