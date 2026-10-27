import { useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { Image, X, GripVertical, FileText } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'
import { PageThumbnailGrid, PdfPageInfo } from '../components/PageThumbnailGrid'
import { ImageCropperModal } from '../components/ImageCropperModal'

interface ImageItem { id: string; name: string; path: string; previewUrl: string; croppedPath?: string }
type PageSize = 'fit' | 'a4' | 'letter'

function SortableItem({ item, onRemove, onPreview, onEdit }: { item: ImageItem, onRemove: (id: string) => void, onPreview: (url: string) => void, onEdit: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-3 p-3 bg-elevated border border-border rounded-lg mb-2 group", isDragging && "opacity-50 shadow-lg")}>
      <div {...attributes} {...listeners} className="cursor-grab text-muted">
        <GripVertical className="w-5 h-5" />
      </div>
      <img src={item.croppedPath || item.previewUrl} alt={item.name} onClick={() => onPreview(item.croppedPath || item.previewUrl)} className="w-12 h-12 object-cover rounded border border-border cursor-pointer hover:opacity-80 transition-opacity bg-neutral-900" />
      <span className="flex-1 text-sm font-medium truncate">{item.name} {item.croppedPath && <span className="text-xs text-accent ml-2">(Cropped)</span>}</span>
      <button onClick={() => onEdit(item.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-accent p-1" title="Crop & Edit">
        <Image className="w-4 h-4" />
      </button>
      <button onClick={() => onRemove(item.id)} className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger p-1" title="Remove">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function JpgToPdfPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<PageSize>('a4')
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  // PDF Preview state
  const [previewPdfPath, setPreviewPdfPath] = useState<string | null>(null)
  const [pdfPages, setPdfPages] = useState<PdfPageInfo[]>([])

  const [editingImageId, setEditingImageId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor))

  const handleFileSelect = (files: FileList) => {
    const newItems: ImageItem[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (!f.type.startsWith('image/')) continue
      newItems.push({
        id: `img-${Date.now()}-${i}`,
        name: f.name,
        path: window.api.getFilePath(f),
        previewUrl: URL.createObjectURL(f)
      })
    }
    setImages(prev => [...prev, ...newItems])
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setImages(items => {
        const oi = items.findIndex(i => i.id === active.id)
        const ni = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oi, ni)
      })
    }
  }

  const handleConvert = async () => {
    if (images.length === 0) return
    setIsProcessing(true)
    try {
      const res = await window.api.jpgToPdf(images.map(i => i.croppedPath || i.path), pageSize)
      if (!res.success || !res.outputPath) throw new Error(res.error)

      // Load PDF for preview
      const readRes = await window.api.readFile(res.outputPath)
      if (!readRes.success || !readRes.data) throw new Error("Failed to read generated PDF")

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(readRes.data) })
      const pdf = await loadingTask.promise
      const pages: PdfPageInfo[] = []

      for (let i = 1; i <= pdf.numPages; i++) {
        pages.push({ id: `page-${i}`, pageNumber: i, pdfDocument: pdf })
      }

      setPdfPages(pages)
      setPreviewPdfPath(res.outputPath)
      setIsProcessing(false)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const handleExport = async () => {
    if (!previewPdfPath) return
    try {
      const saveRes = await window.api.saveFile(previewPdfPath, 'images-converted.pdf')
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { 
        toast.success('PDF saved successfully!')
        setImages([])
        setPreviewPdfPath(null)
        setPdfPages([])
      }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-2xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">JPG to PDF</h1>
          <p className="text-muted">Convert one or more images into a single PDF document.</p>
        </header>

        <Dropzone onFileSelect={handleFileSelect} accept=".jpg,.jpeg,.png,.webp" multiple />

        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Images ({images.length})</h2>
              <span className="text-sm text-muted">Drag to reorder</span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={images.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div>{images.map(img => <SortableItem key={img.id} item={img} onRemove={(id) => setImages(p => p.filter(i => i.id !== id))} onPreview={setPreviewImage} onEdit={setEditingImageId} />)}</div>
              </SortableContext>
            </DndContext>

            <div className="bg-secondary border border-border rounded-xl p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">Page Size</p>
              <div className="flex gap-3">
                {(['fit', 'a4', 'letter'] as PageSize[]).map(s => (
                  <button key={s} onClick={() => setPageSize(s)}
                    className={cn("flex-1 py-2 rounded border text-sm font-medium transition-colors capitalize",
                      pageSize === s ? "border-accent bg-accent/10 text-accent" : "border-border hover:border-accent/50")}>
                    {s === 'fit' ? 'Fit to Image' : s.toUpperCase()}
                  </button>
                ))}
              </div>
              <p className="text-sm text-accent font-medium">This will create a {images.length}-page PDF.</p>
            </div>

            <div className="flex justify-end">
              <PrimaryButton onClick={handleConvert} className="px-8">Convert to PDF</PrimaryButton>
            </div>
          </div>
        )}
      </div>
      
      {/* Input Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-8" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-border" />
            <button onClick={() => setPreviewImage(null)} className="absolute -top-4 -right-4 p-2 bg-background border border-border rounded-full shadow-md text-foreground hover:bg-elevated transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {editingImageId && (
        <ImageCropperModal
          imageSrc={images.find(i => i.id === editingImageId)?.previewUrl || ''}
          onClose={() => setEditingImageId(null)}
          onSave={(croppedDataUrl) => {
            setImages(prev => prev.map(i => i.id === editingImageId ? { ...i, croppedPath: croppedDataUrl } : i))
            setEditingImageId(null)
          }}
        />
      )}

      {/* Output PDF Preview Modal */}
      {previewPdfPath && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-8">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Preview PDF
              </h2>
              <button onClick={() => { setPreviewPdfPath(null); setPdfPages([]) }} className="p-2 text-muted hover:text-foreground transition-colors rounded hover:bg-elevated">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-secondary/10">
              {pdfPages.length > 0 ? (
                <div className="bg-background rounded-lg border border-border p-4 shadow-sm">
                  <PageThumbnailGrid pages={pdfPages} selectedIds={[]} onToggleSelect={() => {}} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted">Loading preview...</div>
              )}
            </div>

            <div className="p-4 border-t border-border bg-secondary/50 flex justify-end gap-3">
              <button onClick={() => { setPreviewPdfPath(null); setPdfPages([]) }} className="px-4 py-2 rounded font-medium text-sm border border-border hover:bg-elevated transition-colors">
                Cancel
              </button>
              <PrimaryButton onClick={handleExport} className="px-6">
                Export PDF
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <ProgressModal isOpen={isProcessing} title="Creating PDF" status="Embedding images..." />
    </div>
  )
}
