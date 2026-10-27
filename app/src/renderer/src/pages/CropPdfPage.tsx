import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'

type MarginPreset = 'auto' | 'none' | 'minimal'

export function CropPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [cropX, setCropX] = useState(36)
  const [cropY, setCropY] = useState(36)
  const [cropW, setCropW] = useState(523)
  const [cropH, setCropH] = useState(769)
  const [pages, setPages] = useState<'all'>('all')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null)

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f) })
  }

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      setPageDimensions(null)
      return
    }

    let isMounted = true
    const loadPreview = async () => {
      try {
        const fileData = await window.api.readFile(file.path)
        if (!fileData.success || !fileData.data) throw new Error(fileData.error || 'Failed to read PDF file')

        const pdf = await pdfjsLib.getDocument({ data: fileData.data }).promise
        const page = await pdf.getPage(1)
        
        const originalViewport = page.getViewport({ scale: 1.0 })
        if (isMounted) {
          setPageDimensions({ width: originalViewport.width, height: originalViewport.height })
          // If the page size is drastically different from A4, we could reset crop box, 
          // but for now let's just show what they have.
        }

        const viewport = page.getViewport({ scale: 1.5 }) // Render larger for crispness
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise
          if (isMounted) setPreviewUrl(canvas.toDataURL('image/png'))
        }
      } catch (err) {
        console.error('Failed to load PDF preview:', err)
      }
    }
    loadPreview()

    return () => { isMounted = false }
  }, [file])

  const handleCrop = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      const res = await (window.api as any).cropPdf({
        filePath: file.path,
        cropBox: { x: cropX, y: cropY, width: cropW, height: cropH },
        pages
      })
      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_cropped.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('PDF cropped!'); setFile(null) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const applyPreset = (preset: MarginPreset) => {
    const w = pageDimensions?.width || 595
    const h = pageDimensions?.height || 841

    if (preset === 'none') { setCropX(0); setCropY(0); setCropW(Math.round(w)); setCropH(Math.round(h)) }
    if (preset === 'minimal') { setCropX(18); setCropY(18); setCropW(Math.round(w - 36)); setCropH(Math.round(h - 36)) }
    if (preset === 'auto') { setCropX(36); setCropY(36); setCropW(Math.round(w - 72)); setCropH(Math.round(h - 72)) }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Crop PDF</h1>
          <p className="text-muted">Trim margins or crop pages to a specific area. Values are in PDF points (1pt = 1/72 inch).</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Controls */}
              <div className="bg-secondary border border-border rounded-xl p-6 space-y-6">
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">Quick Presets</p>
                  <div className="flex gap-3">
                    {(['none', 'minimal', 'auto'] as MarginPreset[]).map(p => (
                      <button key={p} onClick={() => applyPreset(p)}
                        className="px-3 py-1.5 text-sm bg-background border border-border rounded hover:border-accent/50 capitalize">
                        {p === 'none' ? 'No margins' : p === 'minimal' ? 'Small trim' : 'Standard trim'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'X offset (from left)', value: cropX, setter: setCropX },
                    { label: 'Y offset (from bottom)', value: cropY, setter: setCropY },
                    { label: 'Width', value: cropW, setter: setCropW },
                    { label: 'Height', value: cropH, setter: setCropH },
                  ].map(({ label, value, setter }) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-foreground mb-2">{label} (pt)</label>
                      <input type="number" value={value} onChange={e => setter(Number(e.target.value))} min={0}
                        className="w-full bg-background border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                    </div>
                  ))}
                </div>

                <p className="text-sm text-muted">A4 ≈ 595 × 841 pt | Letter ≈ 612 × 792 pt</p>

                <div className="flex justify-start pt-4 border-t border-border">
                  <PrimaryButton onClick={handleCrop} className="px-8 w-full md:w-auto">Apply Crop</PrimaryButton>
                </div>
              </div>

              {/* Preview */}
              {previewUrl && pageDimensions ? (
                <div className="bg-secondary border border-border rounded-xl p-6 flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-foreground mb-4 w-full text-left">Preview (Page 1)</p>
                  <div 
                    className="relative shadow-md overflow-hidden bg-white max-h-[500px] max-w-full rounded"
                    style={{ aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}` }}
                  >
                    <img src={previewUrl} className="w-full h-full object-contain" alt="PDF Preview" />
                    
                    {/* Overlay Masks */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-0 left-0 right-0 bg-black/40 transition-all duration-200" 
                           style={{ height: `${Math.max(0, ((pageDimensions.height - cropY - cropH) / pageDimensions.height) * 100)}%` }} />
                      
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 transition-all duration-200" 
                           style={{ height: `${Math.max(0, (cropY / pageDimensions.height) * 100)}%` }} />
                      
                      <div className="absolute top-0 bottom-0 left-0 bg-black/40 transition-all duration-200" 
                           style={{ 
                             width: `${Math.max(0, (cropX / pageDimensions.width) * 100)}%`,
                             top: `${Math.max(0, ((pageDimensions.height - cropY - cropH) / pageDimensions.height) * 100)}%`,
                             bottom: `${Math.max(0, (cropY / pageDimensions.height) * 100)}%`
                           }} />
                           
                      <div className="absolute top-0 bottom-0 right-0 bg-black/40 transition-all duration-200" 
                           style={{ 
                             width: `${Math.max(0, ((pageDimensions.width - cropX - cropW) / pageDimensions.width) * 100)}%`,
                             top: `${Math.max(0, ((pageDimensions.height - cropY - cropH) / pageDimensions.height) * 100)}%`,
                             bottom: `${Math.max(0, (cropY / pageDimensions.height) * 100)}%`
                           }} />
                      
                      {/* Bounding Box Outline */}
                      <div className="absolute border-2 border-accent transition-all duration-200"
                           style={{
                             left: `${Math.max(0, (cropX / pageDimensions.width) * 100)}%`,
                             bottom: `${Math.max(0, (cropY / pageDimensions.height) * 100)}%`,
                             width: `${Math.max(0, Math.min(100 - (cropX / pageDimensions.width) * 100, (cropW / pageDimensions.width) * 100))}%`,
                             height: `${Math.max(0, Math.min(100 - (cropY / pageDimensions.height) * 100, (cropH / pageDimensions.height) * 100))}%`
                           }}
                      >
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-accent shadow-sm" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent shadow-sm" />
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-accent shadow-sm" />
                        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-accent shadow-sm" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-4">
                    Original Size: {Math.round(pageDimensions.width)} × {Math.round(pageDimensions.height)} pt
                  </p>
                </div>
              ) : (
                <div className="bg-secondary border border-border rounded-xl p-6 h-[400px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ProgressModal isOpen={isProcessing} title="Cropping PDF" status="Setting crop box on pages..." />
    </div>
  )
}
