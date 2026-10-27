import { useState, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { PageThumbnailGrid, PageThumbnail, PdfPageInfo } from '../components/PageThumbnailGrid'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, X } from 'lucide-react'
import { cn } from '../lib/utils'

interface PageItem extends PdfPageInfo {
  sourcePageIndex: number // 0-based original page index
}

function SortableThumb({ item, selected, onToggleSelect, onDelete }: {
  item: PageItem, selected: boolean, onToggleSelect: (id: string) => void, onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative group cursor-pointer", isDragging && "opacity-50 z-10")}>
      <div onClick={() => onToggleSelect(item.id)}>
        <PageThumbnail pageInfo={item} selected={selected} disabledTooltip={isDragging} />
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-danger/90 text-white rounded transition-opacity">
        <Trash2 className="w-3 h-3" />
      </button>
      <div {...attributes} {...listeners} className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 cursor-grab p-1 bg-secondary/80 rounded">
        <svg className="w-3 h-3 text-muted" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
      </div>
    </div>
  )
}

export function OrganizePdfPage() {
  const [file, setFile] = useState<{ name: string; path: string } | null>(null)
  const [pages, setPages] = useState<PageItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor))

  const handleFileSelect = async (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    const ab = await f.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise
    const newPages: PageItem[] = []
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      newPages.push({ id: `page-${i}`, pageNumber: i, sourcePageIndex: i - 1, pdfDocument: pdfDoc })
    }
    setPages(newPages)
    setFile({ name: f.name, path: window.api.getFilePath(f) })
    setSelectedIds([])
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setPages(items => {
        const oi = items.findIndex(i => i.id === active.id)
        const ni = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oi, ni)
      })
    }
  }

  const handleDelete = (id: string) => {
    if (pages.length <= 1) { toast.error('A PDF must have at least 1 page.'); return }
    setPages(p => p.filter(i => i.id !== id))
    setSelectedIds(s => s.filter(i => i !== id))
  }

  const handleDeleteSelected = () => {
    if (pages.length - selectedIds.length < 1) { toast.error('Cannot delete all pages.'); return }
    setPages(p => p.filter(i => !selectedIds.includes(i.id)))
    setSelectedIds([])
  }

  const handleSave = async () => {
    if (!file || !pages.length) return
    setIsProcessing(true)
    try {
      const pageOrder = pages.map(p => p.sourcePageIndex)
      const res = await window.api.organizePdf(file.path, pageOrder)
      if (!res.success) throw new Error(res.error)

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, `${file.name.replace('.pdf', '')}_organized.pdf`)
      if (saveRes.canceled) toast.info('Save canceled.')
      else if (saveRes.success) { toast.success('PDF organized!'); setFile(null); setPages([]) }
      else throw new Error(saveRes.error)
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <div className="p-8 pb-4 shrink-0 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Organize PDF</h1>
            <p className="text-muted">Drag pages to reorder or click to select then delete.</p>
          </div>
          {file && (
            <div className="flex items-center gap-3 flex-wrap">
              {selectedIds.length > 0 && (
                <button onClick={handleDeleteSelected} className="flex items-center gap-1 px-3 py-2 bg-danger/10 border border-danger/30 text-danger rounded hover:bg-danger/20 text-sm">
                  <Trash2 className="w-4 h-4" /> Delete {selectedIds.length} selected
                </button>
              )}
              <span className="text-sm text-muted">{pages.length} pages</span>
              <PrimaryButton onClick={handleSave}>Save PDF</PrimaryButton>
              <button onClick={() => { setFile(null); setPages([]) }} className="p-2 text-muted hover:text-danger">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {!file ? (
          <div className="max-w-3xl mx-auto">
            <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {pages.map(page => (
                  <SortableThumb key={page.id} item={page} selected={selectedIds.includes(page.id)} onToggleSelect={toggleSelect} onDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <ProgressModal isOpen={isProcessing} title="Saving PDF" status="Applying page order..." />
    </div>
  )
}
