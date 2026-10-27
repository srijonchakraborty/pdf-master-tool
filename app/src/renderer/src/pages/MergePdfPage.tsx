import { useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import { GripVertical, X, FileText } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'

interface PdfFileItem {
  id: string
  path: string
  name: string
  pageCount: number | null
  thumbnail?: string
}

function SortableFileItem({ item, onRemove }: { item: PdfFileItem, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 mb-2 bg-elevated border border-border rounded-lg transition-colors group",
        isDragging ? "opacity-50 border-accent z-10 shadow-lg relative" : "hover:border-accent/50"
      )}
    >
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing p-1 text-muted hover:text-foreground transition-colors"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="p-2 bg-secondary rounded text-accent flex-shrink-0 flex items-center justify-center overflow-hidden w-12 h-16 relative">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <FileText className="w-6 h-6 z-10" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{item.name}</p>
        <p className="text-xs text-muted">
          {item.pageCount !== null ? `${item.pageCount} pages` : 'Loading...'}
        </p>
      </div>
      <button 
        onClick={() => onRemove(item.id)}
        className="p-2 text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-secondary"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

export function MergePdfPage() {
  const [files, setFiles] = useState<PdfFileItem[]>([])
  const [isMerging, setIsMerging] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getPdfInfo = async (file: File): Promise<{ count: number; thumbnail?: string }> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ 
        data: new Uint8Array(arrayBuffer)
      }).promise
      const count = pdf.numPages
      let thumbnail: string | undefined

      if (count > 0) {
        try {
          const page = await pdf.getPage(1)
          const viewport = page.getViewport({ scale: 0.5 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const context = canvas.getContext('2d')
          if (context) {
            context.fillStyle = 'white'
            context.fillRect(0, 0, canvas.width, canvas.height)
            await page.render({ canvasContext: context, viewport } as any).promise
            thumbnail = canvas.toDataURL('image/jpeg', 0.8)
          }
        } catch (e: any) {
          console.warn("Failed to generate thumbnail for", file.name, e)
          window.dispatchEvent(new CustomEvent('thumb-error', { detail: e?.message || String(e) }))
        }
      }
      return { count, thumbnail }
    } catch (err) {
      console.error("Failed to read PDF info", err)
      return { count: 0 }
    }
  }

  const handleFileSelect = useCallback(async (selectedFiles: FileList) => {
    const newItems: PdfFileItem[] = []
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      if (file.type !== 'application/pdf') continue
      
      const id = `${file.name}-${Date.now()}-${i}`
      // We need the absolute path for Node to process it later
      // HTML5 File object has a non-standard `path` property in Electron
      const path = window.api.getFilePath(file)
      
      newItems.push({ id, path, name: file.name, pageCount: null })
    }

    if (newItems.length === 0) return

    setFiles(prev => [...prev, ...newItems])

    // Fetch info asynchronously
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      if (file.type !== 'application/pdf') continue
      
      const info = await getPdfInfo(file)
      setFiles(prev => prev.map(f => f.name === file.name && f.pageCount === null ? { ...f, pageCount: info.count, thumbnail: info.thumbnail } : f))
    }
  }, [])

  // Listen for thumbnail errors to display in UI for debugging
  useState(() => {
    window.addEventListener('thumb-error', (e: any) => {
      toast.error(`Thumbnail Error: ${e.detail}`)
    })
  })

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const totalPages = files.reduce((acc, f) => acc + (f.pageCount || 0), 0)

  const handleMerge = async () => {
    if (files.length < 2) return

    setIsMerging(true)
    try {
      const paths = files.map(f => f.path)
      const res = await window.api.mergePdf(paths)

      if (!res.success) {
        throw new Error(res.error)
      }

      setIsMerging(false)
      toast.success('PDFs merged successfully! Select where to save.')

      const saveRes = await window.api.saveFile(res.outputPath!, 'MergedDocument.pdf')
      
      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success(`Saved to ${saveRes.savedPath}`)
        setFiles([]) // Reset on success
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsMerging(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
        <header>
          <h1 className="text-3xl font-bold text-foreground mb-2">Merge PDF</h1>
          <p className="text-muted">Combine multiple PDFs in the order you want.</p>
        </header>

        <Dropzone onFileSelect={handleFileSelect} multiple accept=".pdf" />

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Selected Files ({files.length})</h2>
              <span className="text-sm font-medium text-muted bg-secondary px-3 py-1 rounded-full">
                Total Pages: {totalPages}
              </span>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {files.map(file => (
                    <SortableFileItem key={file.id} item={file} onRemove={removeFile} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-border mt-8">
          <PrimaryButton 
            disabled={files.length < 2} 
            onClick={handleMerge}
            className="w-full sm:w-auto px-8"
          >
            {files.length < 2 ? 'Select at least 2 files' : `Merge ${files.length} files`}
          </PrimaryButton>
        </div>
      </div>

      <ProgressModal 
        isOpen={isMerging} 
        title="Merging PDFs" 
        status="Combining your files, please wait..." 
      />
    </div>
  )
}
