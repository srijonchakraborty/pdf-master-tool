import { useState, useCallback, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { PageThumbnailGrid, PdfPageInfo } from '../components/PageThumbnailGrid'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import { FileText, X, Split, LayoutGrid, List } from 'lucide-react'
import { cn } from '../lib/utils'

type SplitMode = 'ranges' | 'everyPage' | 'selection'

export function SplitPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string; totalPages: number } | null>(null)
  const [pages, setPages] = useState<PdfPageInfo[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  const [mode, setMode] = useState<SplitMode>('ranges')
  const [rangeInput, setRangeInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Clean up pdf document when unmounting or changing file
  useEffect(() => {
    return () => {
      if (pages.length > 0 && pages[0].pdfDocument) {
        ;(pages[0].pdfDocument as any).destroy?.()
      }
    }
  }, [pages])

  const handleFileSelect = async (selectedFiles: FileList) => {
    if (selectedFiles.length === 0) return
    const selected = selectedFiles[0]
    if (selected.type !== 'application/pdf') {
      toast.error('Please select a PDF file.')
      return
    }

    try {
      const arrayBuffer = await selected.arrayBuffer()
      const pdfDocument = await pdfjsLib.getDocument({ 
        data: new Uint8Array(arrayBuffer)
      }).promise
      const totalPages = pdfDocument.numPages
      
      const newPages: PdfPageInfo[] = []
      for (let i = 1; i <= totalPages; i++) {
        newPages.push({
          id: `page-${i}`,
          pageNumber: i,
          pdfDocument
        })
      }

      setPages(newPages)
      setFile({
        name: selected.name,
        path: window.api.getFilePath(selected), // Electron specific
        totalPages
      })
      setSelectedIds([])
      setRangeInput('')
    } catch (err) {
      console.error(err)
      toast.error('Failed to load PDF.')
    }
  }

  const handleToggleSelect = (id: string) => {
    if (mode !== 'selection') return // Only allow toggle in selection mode
    
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSplit = async () => {
    if (!file) return

    setIsProcessing(true)
    try {
      const selectedPages = selectedIds.map(id => parseInt(id.replace('page-', ''), 10))

      const res = await window.api.splitPdf({
        filePath: file.path,
        mode,
        ranges: rangeInput,
        selectedPages
      })

      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      toast.success('PDF split successfully! Select where to save.')

      const defaultName = mode === 'everyPage' 
        ? `${file.name.replace('.pdf', '')}_split.zip`
        : `${file.name.replace('.pdf', '')}_split.pdf`

      const saveRes = await window.api.saveFile(res.outputPath!, defaultName)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success(`Saved to ${saveRes.savedPath}`)
        // Keep the file loaded so they can do another split if they want
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPages([])
    setSelectedIds([])
  }

  // Preview logic
  let previewText = ''
  let isValid = true
  if (file) {
    if (mode === 'everyPage') {
      previewText = `This will create a ZIP containing ${file.totalPages} individual PDF files.`
    } else if (mode === 'selection') {
      previewText = `This will extract ${selectedIds.length} selected pages into a single PDF.`
      if (selectedIds.length === 0) isValid = false
    } else if (mode === 'ranges') {
      if (!rangeInput.trim()) {
        previewText = 'Enter page ranges to extract.'
        isValid = false
      } else {
        // Very basic validation preview for UI only
        const parts = rangeInput.split(',').filter(p => p.trim())
        previewText = `Will extract pages matching: ${parts.join(', ')} into a single PDF.`
      }
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="p-8 pb-4 shrink-0 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Split PDF</h1>
            <p className="text-muted">Extract pages or split into separate files.</p>
          </div>
          {file && (
            <div className="flex items-center gap-4 bg-secondary py-2 px-4 rounded-lg border border-border">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="w-4 h-4 text-accent" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-muted">({file.totalPages} pages)</span>
              </div>
              <button onClick={clearFile} className="text-muted hover:text-danger">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-8">
        <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
          {!file ? (
            <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row h-full">
              {/* Left sidebar: Controls */}
              <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                <div className="bg-secondary rounded-xl border border-border p-5">
                  <h3 className="font-semibold text-foreground mb-4">Split Mode</h3>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      className={cn("flex flex-col text-left p-3 rounded border transition-colors", mode === 'ranges' ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/50 bg-elevated")}
                      onClick={() => setMode('ranges')}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        <List className="w-4 h-4 text-accent" /> Extract by Range
                      </div>
                      <span className="text-xs text-muted">Type specific pages (e.g. 1-3, 5)</span>
                    </button>

                    <button 
                      className={cn("flex flex-col text-left p-3 rounded border transition-colors", mode === 'selection' ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/50 bg-elevated")}
                      onClick={() => setMode('selection')}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        <LayoutGrid className="w-4 h-4 text-accent" /> Select Pages
                      </div>
                      <span className="text-xs text-muted">Click thumbnails to extract</span>
                    </button>

                    <button 
                      className={cn("flex flex-col text-left p-3 rounded border transition-colors", mode === 'everyPage' ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:border-accent/50 bg-elevated")}
                      onClick={() => setMode('everyPage')}
                    >
                      <div className="flex items-center gap-2 font-medium mb-1">
                        <Split className="w-4 h-4 text-accent" /> Split All Pages
                      </div>
                      <span className="text-xs text-muted">Every page into its own file (ZIP)</span>
                    </button>
                  </div>

                  {mode === 'ranges' && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-foreground mb-2">Page Ranges</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1-5, 8, 11-13" 
                        value={rangeInput}
                        onChange={(e) => setRangeInput(e.target.value)}
                        className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-accent mb-4">{previewText}</p>
                    <PrimaryButton 
                      onClick={handleSplit}
                      disabled={!isValid}
                      className="w-full"
                    >
                      Split PDF
                    </PrimaryButton>
                  </div>
                </div>
              </div>

              {/* Right content: Thumbnails */}
              <div className="flex-1 bg-elevated rounded-xl border border-border overflow-y-auto scrollbar-thin relative">
                {mode === 'everyPage' && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="bg-secondary p-4 rounded-lg shadow border border-border text-center">
                      <Split className="w-8 h-8 text-accent mx-auto mb-2" />
                      <p className="font-medium text-foreground">All {file.totalPages} pages will be extracted</p>
                    </div>
                  </div>
                )}
                <PageThumbnailGrid 
                  pages={pages} 
                  selectedIds={mode === 'selection' ? selectedIds : []} 
                  onToggleSelect={handleToggleSelect} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <ProgressModal 
        isOpen={isProcessing} 
        title="Splitting PDF" 
        status="Processing your document..." 
      />
    </div>
  )
}
