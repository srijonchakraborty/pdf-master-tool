/**
 * SimpleConvertPage - A reusable page for single-file, single-action conversion tools
 * (PDF to Word, Word to PDF, PDF to Excel, etc.) with live PDF preview!
 */
import { useState, useEffect } from 'react'
import { Dropzone } from './Dropzone'
import { PrimaryButton } from './PrimaryButton'
import { ProgressModal } from './ProgressModal'
import { InstallBanner } from './InstallBanner'
import { PageThumbnailGrid, PdfPageInfo } from './PageThumbnailGrid'
import * as pdfjsLib from 'pdfjs-dist'
import { toast } from 'sonner'
import { FileText, X } from 'lucide-react'

interface SimpleConvertPageProps {
  title: string
  description: string
  acceptTypes: string // e.g. ".pdf" or ".docx,.doc"
  convertFn: (filePath: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>
  outputExtension: string // e.g. "docx" or "pdf"
  outputName?: string // default output filename prefix
  processingMessage?: string
  requiresBinary?: 'ghostscript' | 'libreoffice' | 'qpdf'
  isInstalled?: boolean | null
  tip?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

import { generateDocxFromImages, generatePptxFromImages, generateXlsxFromImages } from '../utils/officeConverters'

export function SimpleConvertPage({
  title,
  description,
  acceptTypes,
  convertFn,
  outputExtension,
  outputName,
  processingMessage = 'Converting your file...',
  isInstalled,
  requiresBinary,
  tip
}: SimpleConvertPageProps) {
  const [file, setFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  // States for preview before export (when output is PDF)
  const [previewPdfPath, setPreviewPdfPath] = useState<string | null>(null)
  const [generatedPdfPages, setGeneratedPdfPages] = useState<PdfPageInfo[]>([])

  useEffect(() => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfPages([])
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

        if (isMounted) setPdfPages(pages)
      } catch (e) {
        console.error('Failed to load PDF preview:', e)
      }
    }

    loadPdfPreview()
    return () => { isMounted = false }
  }, [file])

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f), size: f.size })
  }

  const handleConvert = async () => {
    if (!file) return
    setIsProcessing(true)
    try {
      // Offline Picture-Based Conversion for MS Office Formats
      if (['docx', 'pptx', 'xlsx'].includes(outputExtension) && pdfPages.length > 0) {
        const dataUrls: string[] = []
        for (const p of pdfPages) {
          const page = await p.pdfDocument.getPage(p.pageNumber)
          const viewport = page.getViewport({ scale: 2.0 }) // Render at high quality 150+ DPI
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('Failed to get canvas context')
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvasContext: ctx, viewport }).promise
          dataUrls.push(canvas.toDataURL('image/jpeg', 0.92))
        }

        let buffer: Uint8Array
        if (outputExtension === 'docx') buffer = await generateDocxFromImages(dataUrls)
        else if (outputExtension === 'pptx') buffer = await generatePptxFromImages(dataUrls)
        else if (outputExtension === 'xlsx') buffer = await generateXlsxFromImages(dataUrls)
        else throw new Error('Unknown office format')

        const baseName = file.name.replace(/\.[^/.]+$/, '')
        const defaultName = `${outputName || baseName}.${outputExtension}`
        const saveRes = await window.api.saveFileFromBuffer(buffer, defaultName)

        setIsProcessing(false)
        if (saveRes.canceled) {
          toast.info('Save canceled.')
        } else if (saveRes.success) {
          toast.success('Saved successfully!')
          setFile(null)
        } else {
          throw new Error(saveRes.error)
        }
        return
      }

      // Existing fallback for other formats (like PDF to PDF/A)
      const res = await convertFn(file.path)
      if (!res.success || !res.outputPath) throw new Error(res.error || 'Conversion failed')

      if (outputExtension === 'pdf') {
        // Load PDF for preview before export
        const readRes = await window.api.readFile(res.outputPath)
        if (!readRes.success || !readRes.data) throw new Error("Failed to read generated PDF")

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(readRes.data) })
        const pdf = await loadingTask.promise
        const pages: PdfPageInfo[] = []

        for (let i = 1; i <= pdf.numPages; i++) {
          pages.push({ id: `page-${i}`, pageNumber: i, pdfDocument: pdf })
        }

        setGeneratedPdfPages(pages)
        setPreviewPdfPath(res.outputPath)
        setIsProcessing(false)
        return
      }

      // If not PDF output, save immediately
      setIsProcessing(false)
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const defaultName = `${outputName || baseName}.${outputExtension}`
      const saveRes = await window.api.saveFile(res.outputPath, defaultName)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success(`Saved successfully!`)
        setFile(null)
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const handleExportGeneratedPdf = async () => {
    if (!previewPdfPath || !file) return
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      const defaultName = `${outputName || baseName}.pdf`
      const saveRes = await window.api.saveFile(previewPdfPath, defaultName)
      
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { 
        toast.success('PDF saved successfully!')
        setFile(null)
        setPreviewPdfPath(null)
        setGeneratedPdfPages([])
      }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  if (isInstalled === false && requiresBinary) {
    const banners = {
      ghostscript: {
        binaryName: 'Ghostscript',
        windowsCmd: 'winget install Ghostscript.Ghostscript',
        macCmd: 'brew install ghostscript',
        linuxCmd: 'sudo apt install ghostscript',
      },
      libreoffice: {
        binaryName: 'LibreOffice',
        windowsCmd: 'winget install TheDocumentFoundation.LibreOffice',
        macCmd: 'brew install --cask libreoffice',
        linuxCmd: 'sudo apt install libreoffice',
      },
      qpdf: {
        binaryName: 'QPDF',
        windowsCmd: 'winget install qpdf.qpdf',
        macCmd: 'brew install qpdf',
        linuxCmd: 'sudo apt install qpdf',
      },
    }
    const b = banners[requiresBinary]
    return <div className="p-8"><InstallBanner {...b} /></div>
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
          <p className="text-muted">{description}</p>
        </header>

        {!file ? (
          <>
            <Dropzone onFileSelect={handleFileSelect} accept={acceptTypes} multiple={false} />
            {tip && <p className="text-sm text-muted text-center mt-2 italic">💡 {tip}</p>}
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-secondary p-4 rounded-xl border border-border">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-background rounded-lg text-accent border border-border">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground truncate max-w-md">{file.name}</p>
                  <p className="text-sm text-muted">{formatSize(file.size)}</p>
                </div>
              </div>
              <button onClick={() => setFile(null)} className="p-2 text-muted hover:text-danger transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live PDF Page Thumbnail Preview Grid */}
            {pdfPages.length > 0 && (
              <div className="bg-secondary/50 border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Page Preview ({pdfPages.length} {pdfPages.length === 1 ? 'Page' : 'Pages'})
                </h3>
                <PageThumbnailGrid pages={pdfPages} selectedIds={[]} onToggleSelect={() => {}} />
              </div>
            )}

            <div className="flex justify-end">
              <PrimaryButton onClick={handleConvert} className="px-8">
                Convert
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>

      {/* Output PDF Preview Modal */}
      {previewPdfPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Preview Generated PDF
              </h2>
              <button onClick={() => { setPreviewPdfPath(null); setGeneratedPdfPages([]) }} className="p-2 text-muted hover:text-foreground transition-colors rounded hover:bg-elevated">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-secondary/10">
              {generatedPdfPages.length > 0 ? (
                <div className="bg-background rounded-lg border border-border p-4 shadow-sm">
                  <PageThumbnailGrid pages={generatedPdfPages} selectedIds={[]} onToggleSelect={() => {}} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted">Loading preview...</div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/50 flex justify-end gap-3">
              <button onClick={() => { setPreviewPdfPath(null); setGeneratedPdfPages([]) }} className="px-4 py-2 rounded font-medium text-sm border border-border hover:bg-elevated transition-colors">
                Cancel
              </button>
              <PrimaryButton onClick={handleExportGeneratedPdf} className="px-6">
                Export PDF
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <ProgressModal isOpen={isProcessing} title={title} status={processingMessage} />
    </div>
  )
}
