import React, { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { PageThumbnail, PdfPageInfo } from '../components/PageThumbnailGrid'
import { toast } from 'sonner'
import * as pdfjsLib from 'pdfjs-dist'
import {
  Layers,
  FileText,
  RotateCw,
  RotateCcw,
  Trash2,
  Plus,
  Copy,
  GripVertical,
  CheckSquare,
  Square,
  ArrowUpDown,
  LayoutGrid,
  ListOrdered,
  X,
} from 'lucide-react'
import { cn } from '../lib/utils'

// Distinct color badges for multi-file differentiation
const FILE_COLORS = [
  'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'bg-rose-500/10 text-rose-400 border-rose-500/30',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  'bg-teal-500/10 text-teal-400 border-teal-500/30',
]

export interface LoadedPdfFile {
  id: string
  name: string
  path: string
  pageCount: number
  color: string
}

export interface OrganizePageItem extends PdfPageInfo {
  fileId: string
  filePath: string
  fileName: string
  fileColor: string
  sourcePageIndex: number // 0-based in original document
  rotation: number // 0, 90, 180, 270
}

interface SortablePageCardProps {
  page: OrganizePageItem
  index: number
  selected: boolean
  onToggleSelect: (id: string) => void
  onRotatePage: (id: string, degrees: number) => void
  onDeletePage: (id: string) => void
  onDuplicatePage: (id: string) => void
}

function SortablePageCard({
  page,
  index,
  selected,
  onToggleSelect,
  onRotatePage,
  onDeletePage,
  onDuplicatePage,
}: SortablePageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col bg-elevated border-2 rounded-xl p-2.5 transition-all shadow-sm',
        selected
          ? 'border-accent ring-2 ring-accent/30 shadow-md'
          : 'border-border hover:border-accent/40',
        isDragging && 'opacity-40 z-30 scale-105 shadow-xl'
      )}
    >
      {/* Top bar: Drag Handle, Merged Index, Checkbox */}
      <div className="flex items-center justify-between gap-1 mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted hover:text-foreground rounded transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold font-mono text-foreground px-1.5 py-0.5 rounded bg-secondary">
            #{index + 1}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleSelect(page.id)}
          className="text-muted hover:text-accent p-0.5 rounded transition-colors"
          title={selected ? 'Deselect page' : 'Select page'}
        >
          {selected ? (
            <CheckSquare className="w-4 h-4 text-accent" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* File Badge */}
      <div className="mb-2">
        <div
          className={cn(
            'flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium truncate max-w-full',
            page.fileColor
          )}
          title={`${page.fileName} (Original Page ${page.pageNumber})`}
        >
          <span className="truncate">{page.fileName}</span>
          <span className="shrink-0 opacity-75">· p.{page.pageNumber}</span>
        </div>
      </div>

      {/* Visual Thumbnail (with built-in large hover tooltip) */}
      <div
        className="cursor-pointer"
        onClick={() => onToggleSelect(page.id)}
      >
        <PageThumbnail
          pageInfo={page}
          selected={selected}
          disabledTooltip={isDragging}
          showPageNumber={false}
          className="p-1 border-0 bg-transparent shadow-none"
        />
      </div>

      {/* Card Action Buttons (always visible or on hover) */}
      <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-border/60 text-muted">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRotatePage(page.id, 90)
            }}
            className="p-1 rounded hover:bg-secondary hover:text-foreground transition-colors"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicatePage(page.id)
            }}
            className="p-1 rounded hover:bg-secondary hover:text-foreground transition-colors"
            title="Duplicate Page"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDeletePage(page.id)
          }}
          className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Delete Page"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function SortableFileRow({
  file,
  index,
  onRemove,
}: {
  file: LoadedPdfFile
  index: number
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: file.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 bg-elevated border rounded-lg transition-colors group',
        file.color,
        isDragging && 'opacity-50 z-20 shadow-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-muted hover:text-foreground"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-background">
        #{index + 1}
      </span>

      <FileText className="w-5 h-5 shrink-0 opacity-80" />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
        <p className="text-xs text-muted">{file.pageCount} pages</p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="p-1.5 text-muted hover:text-danger rounded hover:bg-danger/10 transition-colors"
        title="Remove this file and its pages"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

export function MergeOrganizePdfPage() {
  const [files, setFiles] = useState<LoadedPdfFile[]>([])
  const [pages, setPages] = useState<OrganizePageItem[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'pages' | 'files'>('pages')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('Combining and organizing pages...')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load pages from newly selected File objects
  const processFiles = useCallback(async (selectedFiles: FileList | File[]) => {
    const newFiles: LoadedPdfFile[] = []
    const newPages: OrganizePageItem[] = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i]
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) continue

      const fileId = `file-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`
      const filePath = window.api.getFilePath(f)
      const colorIndex = (files.length + newFiles.length) % FILE_COLORS.length
      const color = FILE_COLORS[colorIndex]

      try {
        const arrayBuffer = await f.arrayBuffer()
        const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
        const pageCount = pdfDoc.numPages

        newFiles.push({
          id: fileId,
          name: f.name,
          path: filePath,
          pageCount,
          color,
        })

        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          newPages.push({
            id: `${fileId}-p${pageNum}-${Math.random().toString(36).substring(2, 7)}`,
            fileId,
            filePath,
            fileName: f.name,
            fileColor: color,
            pageNumber: pageNum,
            sourcePageIndex: pageNum - 1,
            totalDocumentPages: pageCount,
            pdfDocument: pdfDoc,
            rotation: 0,
          })
        }
      } catch (err: any) {
        toast.error(`Failed to load ${f.name}: ${err?.message || 'Invalid or password-protected PDF'}`)
      }
    }

    if (newPages.length === 0) return

    setFiles((prev) => [...prev, ...newFiles])
    setPages((prev) => [...prev, ...newPages])
    toast.success(`Added ${newFiles.length} file(s) with ${newPages.length} pages`)
  }, [files.length])

  // Drag End for Pages
  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Drag End for Files
  const handleFileDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFiles((prevFiles) => {
        const oldIndex = prevFiles.findIndex((f) => f.id === active.id)
        const newIndex = prevFiles.findIndex((f) => f.id === over.id)
        const updatedFiles = arrayMove(prevFiles, oldIndex, newIndex)

        // Also rearrange pages according to new file order
        setPages((currentPages) => {
          const grouped = new Map<string, OrganizePageItem[]>()
          updatedFiles.forEach((f) => grouped.set(f.id, []))
          currentPages.forEach((p) => {
            const arr = grouped.get(p.fileId)
            if (arr) arr.push(p)
          })
          const reordered: OrganizePageItem[] = []
          updatedFiles.forEach((f) => {
            const arr = grouped.get(f.id)
            if (arr) reordered.push(...arr)
          })
          return reordered
        })

        return updatedFiles
      })
    }
  }

  // Selection toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === pages.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(pages.map((p) => p.id))
    }
  }

  // Page Operations
  const handleRotatePage = (id: string, degrees: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: ((p.rotation + degrees) % 360 + 360) % 360 } : p
      )
    )
  }

  const handleRotateSelected = (degrees: number) => {
    const targetIds = selectedIds.length > 0 ? selectedIds : pages.map((p) => p.id)
    setPages((prev) =>
      prev.map((p) =>
        targetIds.includes(p.id)
          ? { ...p, rotation: ((p.rotation + degrees) % 360 + 360) % 360 }
          : p
      )
    )
    toast.success(`Rotated ${targetIds.length} page(s)`)
  }

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) {
      toast.error('A PDF document must have at least 1 page.')
      return
    }
    setPages((prev) => prev.filter((p) => p.id !== id))
    setSelectedIds((prev) => prev.filter((item) => item !== id))
  }

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return
    if (pages.length - selectedIds.length < 1) {
      toast.error('Cannot delete all pages. At least 1 page must remain.')
      return
    }
    const count = selectedIds.length
    setPages((prev) => prev.filter((p) => !selectedIds.includes(p.id)))
    setSelectedIds([])
    toast.success(`Deleted ${count} page(s)`)
  }

  const handleDuplicatePage = (id: string) => {
    const index = pages.findIndex((p) => p.id === id)
    if (index === -1) return
    const original = pages[index]
    const duplicate: OrganizePageItem = {
      ...original,
      id: `${original.fileId}-dup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    }
    setPages((prev) => {
      const copy = [...prev]
      copy.splice(index + 1, 0, duplicate)
      return copy
    })
    toast.success(`Duplicated Page #${index + 1}`)
  }

  const handleRemoveFile = (fileId: string) => {
    const remainingPages = pages.filter((p) => p.fileId !== fileId)
    if (remainingPages.length === 0 && files.length <= 1) {
      setFiles([])
      setPages([])
      setSelectedIds([])
      return
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
    setPages(remainingPages)
    setSelectedIds((prev) =>
      prev.filter((id) => remainingPages.some((p) => p.id === id))
    )
    toast.info('File removed from merge set.')
  }

  const handleResetOrder = () => {
    // Group pages by original file order and original page index
    const sorted = [...pages].sort((a, b) => {
      const fileIndexA = files.findIndex((f) => f.id === a.fileId)
      const fileIndexB = files.findIndex((f) => f.id === b.fileId)
      if (fileIndexA !== fileIndexB) return fileIndexA - fileIndexB
      return a.sourcePageIndex - b.sourcePageIndex
    })
    setPages(sorted)
    toast.info('Reset page order to original file sequence')
  }

  const handleReverseOrder = () => {
    setPages((prev) => [...prev].reverse())
    toast.info('Reversed page order')
  }

  // Merge and Save Action
  const handleSave = async () => {
    if (pages.length === 0) {
      toast.error('No pages to merge or organize.')
      return
    }

    setIsProcessing(true)
    setProcessingStatus('Merging and organizing pages...')

    try {
      const payloadPages = pages.map((p) => ({
        filePath: p.filePath,
        sourcePageIndex: p.sourcePageIndex,
        rotation: p.rotation,
      }))

      const defaultName =
        files.length === 1
          ? `${files[0].name.replace(/\.pdf$/i, '')}_organized.pdf`
          : `Merged_${files.length}_Files.pdf`

      const res = await window.api.mergeOrganizePdf({
        pages: payloadPages,
        outputFileName: defaultName,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to merge and organize PDF')
      }

      setIsProcessing(false)
      const saveRes = await window.api.saveFile(res.outputPath!, defaultName)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success(`PDF saved successfully to: ${saveRes.savedPath}`)
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      setIsProcessing(false)
      toast.error(`Error: ${err.message}`)
    }
  }

  // File picker handler for "Add More Files"
  const handleAddMoreFilesClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files)
      e.target.value = ''
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header bar */}
      <div className="p-6 pb-4 shrink-0 border-b border-border bg-bg-secondary/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                <Layers className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Merge & Organize PDF</h1>
            </div>
            <p className="text-xs text-muted">
              Combine multiple PDFs, drag to reorder, delete or rotate pages freely. Hover any page for a large preview.
            </p>
          </div>

          {pages.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* Add more files button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <button
                type="button"
                onClick={handleAddMoreFilesClick}
                className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border text-foreground hover:bg-elevated rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 text-accent" />
                Add More Files
              </button>

              {/* View Switcher: Pages vs Files */}
              <div className="flex items-center bg-secondary border border-border rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('pages')}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                    viewMode === 'pages'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Pages ({pages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('files')}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                    viewMode === 'files'
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-muted hover:text-foreground'
                  )}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  Files ({files.length})
                </button>
              </div>

              {/* Primary Merge & Save Button */}
              <PrimaryButton onClick={handleSave} className="px-6">
                {files.length > 1
                  ? `Merge & Save (${pages.length} Pages)`
                  : `Save Organized PDF (${pages.length} Pages)`}
              </PrimaryButton>

              {/* Clear All */}
              <button
                type="button"
                onClick={() => {
                  setFiles([])
                  setPages([])
                  setSelectedIds([])
                }}
                className="p-2 text-muted hover:text-danger rounded hover:bg-secondary transition-colors"
                title="Clear all files and start over"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Multi-action toolbar (when pages exist and in pages view) */}
        {pages.length > 0 && viewMode === 'pages' && (
          <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap text-xs">
            {/* Left: Selection and quick tools */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border text-foreground hover:bg-elevated rounded-md font-medium transition-colors"
              >
                {selectedIds.length === pages.length ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Select All ({pages.length})
                  </>
                )}
              </button>

              {selectedIds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 rounded-md font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotateSelected(90)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border text-foreground hover:bg-elevated rounded-md transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotate Selected
                  </button>
                </>
              )}

              {selectedIds.length === 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleRotateSelected(90)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border text-muted hover:text-foreground rounded-md transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotate All
                  </button>
                  <button
                    type="button"
                    onClick={handleResetOrder}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border text-muted hover:text-foreground rounded-md transition-colors"
                    title="Sort pages back to original document order"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" /> Reset Order
                  </button>
                  <button
                    type="button"
                    onClick={handleReverseOrder}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border text-muted hover:text-foreground rounded-md transition-colors"
                  >
                    Reverse
                  </button>
                </>
              )}
            </div>

            {/* Right: Hint */}
            <div className="text-muted text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Hover on any page to preview contents in large zoom
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {pages.length === 0 ? (
          <div className="max-w-2xl mx-auto mt-12 space-y-6">
            <Dropzone
              onFileSelect={processFiles}
              multiple={true}
              accept=".pdf,application/pdf"
            />
            <div className="bg-elevated border border-border rounded-xl p-5 text-sm space-y-2 text-muted">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" />
                Merge & Organize All in One Place
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Drop single or multiple PDF documents into this tool.</li>
                <li>Drag and drop individual pages across documents to build your perfect custom order.</li>
                <li>Hover over any page thumbnail at any time to see a large, readable tooltip preview.</li>
                <li>Rotate, delete, or duplicate pages with a single click.</li>
              </ul>
            </div>
          </div>
        ) : viewMode === 'pages' ? (
          <div className="max-w-7xl mx-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handlePageDragEnd}
            >
              <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {pages.map((page, index) => (
                    <SortablePageCard
                      key={page.id}
                      page={page}
                      index={index}
                      selected={selectedIds.includes(page.id)}
                      onToggleSelect={toggleSelect}
                      onRotatePage={handleRotatePage}
                      onDeletePage={handleDeletePage}
                      onDuplicatePage={handleDuplicatePage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          /* Files View */
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">
                Loaded Files ({files.length})
              </h2>
              <span className="text-xs text-muted">
                Drag to reorder entire files and their pages
              </span>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFileDragEnd}
            >
              <SortableContext
                items={files.map((f) => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {files.map((file, index) => (
                    <SortableFileRow
                      key={file.id}
                      file={file}
                      index={index}
                      onRemove={handleRemoveFile}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      <ProgressModal isOpen={isProcessing} title="Processing PDF" status={processingStatus} />
    </div>
  )
}
