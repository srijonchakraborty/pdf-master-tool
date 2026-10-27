import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { PageThumbnailGrid, PdfPageInfo } from '../components/PageThumbnailGrid'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import { toast } from 'sonner'
import { FileText, X, Download, Image as ImageIcon } from 'lucide-react'
import { cn } from '../lib/utils'

export function PdfToJpgPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([])
  const [dpi, setDpi] = useState(150)
  const [quality, setQuality] = useState(85)
  const [isProcessing, setIsProcessing] = useState(false)
  const [outputImages, setOutputImages] = useState<{ name: string; dataUrl: string; blob: Blob }[]>([])

  useEffect(() => {
    if (!file) {
      setPdfDoc(null)
      setPdfPages([])
      setOutputImages([])
      return
    }

    let isMounted = true
    const loadPdfPreview = async () => {
      try {
        const readRes = await window.api.readFile(file.path)
        if (!readRes.success || !readRes.data) return

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(readRes.data) })
        const pdf = await loadingTask.promise
        const pages: PdfPageInfo[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
          pages.push({ id: `page-${i}`, pageNumber: i, pdfDocument: pdf })
        }

        if (isMounted) {
          setPdfDoc(pdf)
          setPdfPages(pages)
        }
      } catch (e) {
        console.error('Failed to load PDF for preview:', e)
      }
    }

    loadPdfPreview()
    return () => { isMounted = false }
  }, [file])

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f) })
    setOutputImages([])
  }

  const handleConvert = async () => {
    if (!file || !pdfDoc || pdfPages.length === 0) return
    setIsProcessing(true)

    try {
      const generated: { name: string; dataUrl: string; blob: Blob }[] = []
      const scale = dpi / 72 // Convert DPI to scale factor (72 DPI baseline)

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.height = viewport.height
        canvas.width = viewport.width

        if (!context) continue

        await page.render({
          canvasContext: context,
          viewport
        }).promise

        const qualityFactor = quality / 100
        const dataUrl = canvas.toDataURL('image/jpeg', qualityFactor)

        const base64Data = dataUrl.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })

        const pageName = `${file.name.replace(/\.[^/.]+$/, '')}-page-${i}.jpg`
        generated.push({ name: pageName, dataUrl, blob })
      }

      setOutputImages(generated)
      setIsProcessing(false)
      toast.success(`Rendered ${generated.length} high-quality JPG image(s)!`)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error converting pages: ${err.message}`)
    }
  }

  const handleDownloadAll = async () => {
    if (outputImages.length === 0 || !file) return

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '')

      if (outputImages.length === 1) {
        // Save single JPG directly
        const img = outputImages[0]
        const arrayBuffer = await img.blob.arrayBuffer()
        const saveRes = await window.api.saveFileFromBuffer(new Uint8Array(arrayBuffer), img.name)
        if (saveRes.success && !saveRes.canceled) toast.success('Saved JPG image!')
      } else {
        // Create ZIP package for multiple JPG images
        const zip = new JSZip()
        for (const img of outputImages) {
          zip.file(img.name, img.blob)
        }
        const zipContent = await zip.generateAsync({ type: 'uint8array' })
        const saveRes = await window.api.saveFileFromBuffer(zipContent, `${baseName}-images.zip`)
        if (saveRes.success && !saveRes.canceled) toast.success('Saved ZIP archive with all JPG images!')
      }
    } catch (err: any) {
      toast.error(`Error saving images: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">PDF to JPG</h1>
          <p className="text-muted">Convert PDF pages into high-quality JPG images with live preview.</p>
        </header>

        {!file ? (
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        ) : (
          <div className="space-y-6">
            {/* Selected File Header */}
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-accent" />
                <span className="font-semibold text-foreground truncate max-w-md">{file.name}</span>
              </div>
              <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input PDF Page Preview */}
            {pdfPages.length > 0 && (
              <div className="bg-secondary/50 border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Document Preview ({pdfPages.length} {pdfPages.length === 1 ? 'Page' : 'Pages'})
                </h3>
                <PageThumbnailGrid pages={pdfPages} selectedIds={[]} onToggleSelect={() => {}} />
              </div>
            )}

            {/* Quality Controls */}
            <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {([150, 200, 300] as const).map(d => (
                  <button key={d} onClick={() => setDpi(d)}
                    className={cn("flex flex-col items-center p-4 rounded-lg border-2 transition-all",
                      dpi === d ? "border-accent bg-accent/10 text-accent font-semibold" : "border-border hover:border-accent/50 text-foreground")}>
                    <span className="font-bold text-lg">{d} DPI</span>
                    <span className="text-xs text-muted mt-1">{d === 150 ? 'Standard' : d === 200 ? 'Good' : 'High Quality'}</span>
                  </button>
                ))}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-foreground">JPEG Quality</label>
                  <span className="text-sm font-semibold text-accent">{quality}%</span>
                </div>
                <input type="range" min={60} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} className="w-full accent-accent cursor-pointer" />
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <PrimaryButton onClick={handleConvert} className="px-8">Convert to JPG</PrimaryButton>
              </div>
            </div>

            {/* Converted Output Images Preview Grid */}
            {outputImages.length > 0 && (
              <div className="bg-secondary border border-accent/30 rounded-xl p-6 space-y-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-accent" />
                    <h3 className="text-lg font-bold text-foreground">Converted Image Preview ({outputImages.length})</h3>
                  </div>
                  <PrimaryButton onClick={handleDownloadAll} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download {outputImages.length > 1 ? 'ZIP Archive' : 'JPG Image'}
                  </PrimaryButton>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {outputImages.map((img, idx) => (
                    <div key={idx} className="flex flex-col bg-background border border-border rounded-lg p-2 space-y-2">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-40 object-contain rounded bg-black/20 border border-border" />
                      <p className="text-xs font-medium text-muted text-center truncate">{img.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ProgressModal isOpen={isProcessing} title="Converting to JPG" status={`Rendering pages at ${dpi} DPI...`} />
    </div>
  )
}
