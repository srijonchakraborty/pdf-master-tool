import { useState, useRef, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { FileText, ArrowLeftRight, Layers, X, SplitSquareHorizontal } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

export function ComparePdfPage() {
  const [fileA, setFileA] = useState<{ name: string; buffer: ArrayBuffer } | null>(null)
  const [fileB, setFileB] = useState<{ name: string; buffer: ArrayBuffer } | null>(null)
  const [viewMode, setViewMode] = useState<'side' | 'overlay'>('side')
  const [page, setPage] = useState(1)
  const [maxPages, setMaxPages] = useState(1)

  const canvasARef = useRef<HTMLCanvasElement>(null)
  const canvasBRef = useRef<HTMLCanvasElement>(null)

  const handleDropA = async (files: FileList) => {
    if (files.length > 0) {
      setFileA({ name: files[0].name, buffer: await files[0].arrayBuffer() })
    }
  }

  const handleDropB = async (files: FileList) => {
    if (files.length > 0) {
      setFileB({ name: files[0].name, buffer: await files[0].arrayBuffer() })
    }
  }

  useEffect(() => {
    if (fileA && fileB) {
      renderPages()
    }
  }, [fileA, fileB, page, viewMode])

  const renderPages = async () => {
    if (!fileA || !fileB || !canvasARef.current || !canvasBRef.current) return

    try {
      const docA = await pdfjsLib.getDocument({ data: new Uint8Array(fileA.buffer) }).promise
      const docB = await pdfjsLib.getDocument({ data: new Uint8Array(fileB.buffer) }).promise

      setMaxPages(Math.max(docA.numPages, docB.numPages))

      const renderPageToCanvas = async (doc: pdfjsLib.PDFDocumentProxy, canvas: HTMLCanvasElement) => {
        if (page > doc.numPages) {
          // Clear canvas if page doesn't exist
          const ctx = canvas.getContext('2d')
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
          return
        }
        const pdfPage = await doc.getPage(page)
        const viewport = pdfPage.getViewport({ scale: 1.5 })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          await pdfPage.render({ canvasContext: ctx, viewport } as any).promise
        }
      }

      await Promise.all([
        renderPageToCanvas(docA, canvasARef.current),
        renderPageToCanvas(docB, canvasBRef.current)
      ])
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-6xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <ArrowLeftRight className="w-8 h-8 text-accent" /> Compare PDF
          </h1>
          <p className="text-muted">Visually compare two PDF documents side by side or using overlay difference.</p>
        </header>

        {(!fileA || !fileB) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground text-center">Original Document (File A)</h3>
              {fileA ? (
                <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3"><FileText className="text-accent w-6 h-6"/> <span className="font-medium">{fileA.name}</span></div>
                  <button onClick={() => setFileA(null)}><X className="w-5 h-5 text-muted hover:text-danger"/></button>
                </div>
              ) : <Dropzone onFileSelect={handleDropA} accept=".pdf" multiple={false} />}
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground text-center">Modified Document (File B)</h3>
              {fileB ? (
                <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
                  <div className="flex items-center gap-3"><FileText className="text-accent w-6 h-6"/> <span className="font-medium">{fileB.name}</span></div>
                  <button onClick={() => setFileB(null)}><X className="w-5 h-5 text-muted hover:text-danger"/></button>
                </div>
              ) : <Dropzone onFileSelect={handleDropB} accept=".pdf" multiple={false} />}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-elevated p-4 rounded-xl border border-border">
              <div className="flex gap-4">
                <button onClick={() => setViewMode('side')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'side' ? 'bg-accent text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                  <SplitSquareHorizontal className="w-4 h-4" /> Side by Side
                </button>
                <button onClick={() => setViewMode('overlay')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'overlay' ? 'bg-accent text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'}`}>
                  <Layers className="w-4 h-4" /> Difference Overlay
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 bg-secondary rounded-lg disabled:opacity-50">Prev</button>
                <span className="font-medium text-foreground">Page {page} of {maxPages}</span>
                <button disabled={page >= maxPages} onClick={() => setPage(p => Math.min(maxPages, p + 1))} className="px-3 py-1 bg-secondary rounded-lg disabled:opacity-50">Next</button>
              </div>
              <PrimaryButton variant="secondary" onClick={() => { setFileA(null); setFileB(null); }}>Reset</PrimaryButton>
            </div>

            <div className="bg-secondary/50 rounded-xl border border-border p-8 min-h-[600px] flex items-center justify-center overflow-auto">
              {viewMode === 'side' ? (
                <div className="flex gap-8 items-start justify-center w-full">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-muted">{fileA.name}</span>
                    <canvas ref={canvasARef} className="shadow-lg border border-border bg-white max-w-full" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-medium text-muted">{fileB.name}</span>
                    <canvas ref={canvasBRef} className="shadow-lg border border-border bg-white max-w-full" />
                  </div>
                </div>
              ) : (
                <div className="relative flex justify-center items-start w-full">
                  <canvas ref={canvasARef} className="shadow-lg border border-border bg-white" />
                  <canvas ref={canvasBRef} className="absolute top-0 opacity-70 mix-blend-difference pointer-events-none" style={{ filter: 'invert(1)' }} />
                </div>
              )}
            </div>
            
            {viewMode === 'overlay' && (
              <p className="text-center text-muted text-sm">
                In Overlay mode, differences between the two documents are highlighted. Identical areas appear black/dark, while differences appear in bright colors.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
