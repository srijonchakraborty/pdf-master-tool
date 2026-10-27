import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import {
  BookOpen, Search, LayoutGrid, FilePen, ZoomIn, ZoomOut, RotateCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Save, Undo2, Redo2,
  Highlighter, PenTool, MessageSquare, Square, Circle, ArrowUpRight,
  Minus, Type, Eraser, Hand, MousePointer, PanelLeftClose, PanelLeft,
  Underline as UnderlineIcon, Strikethrough as StrikethroughIcon,
  Sun, Moon, Eye, Download, UploadCloud, X, Check, FileText
} from 'lucide-react'
import { useAppStore, ViewerFile } from '../store/appStore'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { DeveloperModal } from '../components/DeveloperModal'
import { GithubIcon } from '../components/GithubIcon'

// Annotation types
export type ViewerTool =
  | 'select'
  | 'hand'
  | 'highlight-box'
  | 'highlight-freehand'
  | 'pen'
  | 'underline'
  | 'strikethrough'
  | 'note'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'text'
  | 'eraser'

export interface AnnotationPoint {
  x: number // percentage 0-100
  y: number // percentage 0-100
}

export interface ViewerAnnotation {
  id: string
  pageIndex: number // 0-based
  type:
    | 'highlight-box'
    | 'highlight-freehand'
    | 'pen'
    | 'underline'
    | 'strikethrough'
    | 'note'
    | 'rect'
    | 'circle'
    | 'arrow'
    | 'line'
    | 'text'
  x: number // percentage 0-100
  y: number // percentage 0-100
  width?: number // percentage 0-100
  height?: number // percentage 0-100
  color: string
  strokeWidth?: number // in px
  opacity?: number
  points?: AnnotationPoint[]
  text?: string
  fontSize?: number
}

interface OutlineNode {
  title: string
  bold?: boolean
  italic?: boolean
  dest?: any
  items?: OutlineNode[]
  pageIndex?: number
}

interface SearchResult {
  pageIndex: number
  snippet: string
  matchIndex: number
}

const HIGHLIGHT_COLORS = ['#facc15', '#22c55e', '#38bdf8', '#f472b6', '#fb923c', '#a855f7']
const PEN_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#111827', '#ffffff']

export function PdfReaderPage() {
  const { viewerFile, setViewerFile, openInViewer } = useAppStore()

  // Document state
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1) // 1-based for UI
  const [pageInputVal, setPageInputVal] = useState<string>('1')
  const [zoom, setZoom] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [readingMode, setReadingMode] = useState<'default' | 'dark' | 'sepia'>('default')

  // Left sidebar & tabs
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const [sidebarTab, setSidebarTab] = useState<'thumbnails' | 'outline' | 'search' | 'annotations'>('thumbnails')
  const [outline, setOutline] = useState<OutlineNode[]>([])
  const [outlineLoading, setOutlineLoading] = useState<boolean>(false)
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({})

  // Content search
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState<boolean>(false)

  // Tools & Annotations
  const [activeTool, setActiveTool] = useState<ViewerTool>('select')
  const [selectedColor, setSelectedColor] = useState<string>('#facc15')
  const [strokeWidth, setStrokeWidth] = useState<number>(2)
  const [annotations, setAnnotations] = useState<ViewerAnnotation[]>([])
  const [history, setHistory] = useState<ViewerAnnotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Interactive drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([])
  const [dragStart, setDragStart] = useState<AnnotationPoint | null>(null)
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [activeTextId, setActiveTextId] = useState<string | null>(null)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // Top Menu Bar state (Adobe style dropdowns)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [isDevModalOpen, setIsDevModalOpen] = useState<boolean>(false)

  // Push state to undo/redo history
  const pushAnnotations = useCallback((newAnn: ViewerAnnotation[]) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(newAnn)
      return next
    })
    setHistoryIndex((prev) => prev + 1)
    setAnnotations(newAnn)
  }, [historyIndex])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setAnnotations(history[newIndex])
    }
  }, [historyIndex, history])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setAnnotations(history[newIndex])
    }
  }, [historyIndex, history])

  // Load PDF when viewerFile changes
  useEffect(() => {
    if (!viewerFile) {
      setPdfDoc(null)
      setTotalPages(0)
      setAnnotations([])
      setHistory([[]])
      setHistoryIndex(0)
      setOutline([])
      setSearchResults([])
      return
    }

    let isMounted = true
    const loadDocument = async () => {
      try {
        let data = viewerFile.data
        if (!data && viewerFile.path) {
          const res = await window.api.readFile(viewerFile.path)
          if (!res.success || !res.data) throw new Error(res.error || 'Failed to read file')
          data = new Uint8Array(res.data)
        }
        if (!data) return

        const loadingTask = pdfjsLib.getDocument({ data })
        const loadedPdf = await loadingTask.promise
        if (!isMounted) return

        setPdfDoc(loadedPdf)
        setTotalPages(loadedPdf.numPages)
        setCurrentPage(1)
        setPageInputVal('1')

        // Fetch outline (TOC)
        setOutlineLoading(true)
        try {
          const rawOutline = await loadedPdf.getOutline()
          if (rawOutline && rawOutline.length > 0) {
            const enriched = await resolveOutlineTree(loadedPdf, rawOutline)
            if (isMounted) setOutline(enriched)
          } else {
            if (isMounted) setOutline([])
          }
        } catch (e) {
          console.warn('Outline fetch failed:', e)
        } finally {
          if (isMounted) setOutlineLoading(false)
        }
      } catch (err: any) {
        toast.error(`Failed to load document: ${err.message}`)
      }
    }

    loadDocument()
    return () => {
      isMounted = false
    }
  }, [viewerFile])

  // Helper to resolve outline destinations
  const resolveOutlineTree = async (doc: pdfjsLib.PDFDocumentProxy, nodes: any[]): Promise<OutlineNode[]> => {
    const list: OutlineNode[] = []
    for (const node of nodes) {
      let pageIndex: number | undefined
      try {
        let dest = node.dest
        if (typeof dest === 'string') {
          dest = await doc.getDestination(dest)
        }
        if (Array.isArray(dest) && dest.length > 0) {
          const pageRef = dest[0]
          if (typeof pageRef === 'number') {
            pageIndex = pageRef
          } else if (pageRef && typeof pageRef === 'object') {
            pageIndex = await doc.getPageIndex(pageRef)
          }
        } else if (typeof dest === 'number') {
          pageIndex = dest
        }
      } catch (e) {}

      const children = node.items && node.items.length > 0
        ? await resolveOutlineTree(doc, node.items)
        : []

      list.push({
        title: node.title,
        bold: node.bold,
        italic: node.italic,
        dest: node.dest,
        items: children,
        pageIndex
      })
    }
    return list
  }

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return

    let cancelled = false
    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel()
        }

        const page = await pdfDoc.getPage(currentPage)
        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return

        const dpr = window.devicePixelRatio || 1
        const viewport = page.getViewport({ scale: zoom * 1.5, rotation })

        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        if (overlayRef.current) {
          overlayRef.current.style.width = `${Math.floor(viewport.width)}px`
          overlayRef.current.style.height = `${Math.floor(viewport.height)}px`
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0)

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        }

        const renderTask = page.render(renderContext as any)
        renderTaskRef.current = renderTask
        await renderTask.promise
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err)
        }
      }
    }

    renderPage()

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
    }
  }, [pdfDoc, currentPage, zoom, rotation])

  // Synchronize page input display
  useEffect(() => {
    setPageInputVal(currentPage.toString())
  }, [currentPage])

  // Navigation handlers
  const goToPage = (p: number) => {
    if (!pdfDoc) return
    const target = Math.max(1, Math.min(totalPages, p))
    setCurrentPage(target)
    setPageInputVal(target.toString())
  }

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseInt(pageInputVal, 10)
    if (!isNaN(p)) {
      goToPage(p)
    } else {
      setPageInputVal(currentPage.toString())
    }
  }

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(3.0, +(z + 0.15).toFixed(2)))
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, +(z - 0.15).toFixed(2)))
  const handleZoomReset = () => setZoom(1.0)
  const handleFitWidth = () => {
    if (!containerRef.current || !canvasRef.current) return
    const containerWidth = containerRef.current.clientWidth - 64
    const currentCanvasWidth = parseInt(canvasRef.current.style.width || '800', 10)
    if (currentCanvasWidth > 0) {
      const factor = containerWidth / currentCanvasWidth
      setZoom((z) => Math.max(0.4, Math.min(3.0, +(z * factor).toFixed(2))))
    }
  }

  // Open file from dialog
  const handleOpenFile = async () => {
    try {
      const res = await window.api.openFileDialog()
      if (res.canceled) return
      if (!res.success || !res.filePath) {
        toast.error(res.error || 'Failed to open file')
        return
      }
      openInViewer({
        path: res.filePath,
        name: res.name || 'document.pdf',
        size: res.size,
        data: res.data
      })
      toast.success(`Opened ${res.name}`)
    } catch (err: any) {
      toast.error(`Error opening file: ${err.message}`)
    }
  }

  // Save annotated PDF
  const handleSaveAnnotatedPdf = async () => {
    if (!viewerFile?.path) {
      toast.error('No file path found to save')
      return
    }

    if (annotations.length === 0) {
      toast.info('No annotations or markings to save. Add highlights or drawings first!')
    }

    try {
      toast.loading('Saving annotated PDF with highlights & markings...', { id: 'save-pdf' })
      const res = await window.api.saveAnnotatedPdf({
        originalPath: viewerFile.path,
        annotations
      })
      toast.dismiss('save-pdf')

      if (res.canceled) return
      if (!res.success) {
        toast.error(`Failed to save: ${res.error}`)
        return
      }

      toast.success(`Annotated PDF saved successfully!`)
    } catch (err: any) {
      toast.dismiss('save-pdf')
      toast.error(`Save error: ${err.message}`)
    }
  }

  // Content Search execution
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfDoc || !searchQuery.trim()) return

    setIsSearching(true)
    setSearchResults([])
    try {
      const q = searchQuery.toLowerCase()
      const matches: SearchResult[] = []

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i)
        const textContent = await page.getTextContent()
        const fullText = textContent.items.map((item: any) => item.str).join(' ')
        const lower = fullText.toLowerCase()

        let pos = 0
        while ((pos = lower.indexOf(q, pos)) !== -1) {
          const start = Math.max(0, pos - 35)
          const end = Math.min(fullText.length, pos + q.length + 35)
          const snippet = (start > 0 ? '...' : '') + fullText.substring(start, end) + (end < fullText.length ? '...' : '')
          matches.push({
            pageIndex: i - 1,
            snippet,
            matchIndex: pos
          })
          pos += q.length
          if (matches.length >= 100) break
        }
        if (matches.length >= 100) break
      }

      setSearchResults(matches)
      if (matches.length === 0) {
        toast.info(`No matches found for "${searchQuery}"`)
      } else {
        toast.success(`Found ${matches.length} matches`)
      }
    } catch (err: any) {
      toast.error(`Search error: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  // Coordinate helper: converts mouse event to 0-100% within the active page overlay
  const getOverlayPercentCoords = (e: React.MouseEvent<HTMLDivElement>): AnnotationPoint | null => {
    if (!overlayRef.current) return null
    const rect = overlayRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    }
  }

  // Mouse Handlers for Marking & Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || activeTool === 'hand') return
    const pt = getOverlayPercentCoords(e)
    if (!pt) return

    setIsDrawing(true)
    setDragStart(pt)

    if (activeTool === 'pen' || activeTool === 'highlight-freehand') {
      setCurrentPoints([pt])
    } else if (
      activeTool === 'highlight-box' ||
      activeTool === 'rect' ||
      activeTool === 'circle' ||
      activeTool === 'arrow' ||
      activeTool === 'line' ||
      activeTool === 'underline' ||
      activeTool === 'strikethrough'
    ) {
      setCurrentBox({ x: pt.x, y: pt.y, w: 0, h: 0 })
    } else if (activeTool === 'note') {
      const newAnn: ViewerAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: currentPage - 1,
        type: 'note',
        x: pt.x,
        y: pt.y,
        color: selectedColor || '#facc15',
        text: 'New note'
      }
      pushAnnotations([...annotations, newAnn])
      setActiveNoteId(newAnn.id)
      setIsDrawing(false)
      setActiveTool('select')
    } else if (activeTool === 'text') {
      const newAnn: ViewerAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: currentPage - 1,
        type: 'text',
        x: pt.x,
        y: pt.y,
        color: selectedColor || '#111827',
        fontSize: 14,
        text: 'Type text here'
      }
      pushAnnotations([...annotations, newAnn])
      setActiveTextId(newAnn.id)
      setIsDrawing(false)
      setActiveTool('select')
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing) return
    const pt = getOverlayPercentCoords(e)
    if (!pt) return

    if (activeTool === 'pen' || activeTool === 'highlight-freehand') {
      setCurrentPoints((prev) => [...prev, pt])
    } else if (dragStart) {
      const x = Math.min(dragStart.x, pt.x)
      const y = Math.min(dragStart.y, pt.y)
      const w = Math.abs(pt.x - dragStart.x)
      const h = Math.abs(pt.y - dragStart.y)
      setCurrentBox({ x, y, w, h })
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)

    const pageIdx = currentPage - 1

    if ((activeTool === 'pen' || activeTool === 'highlight-freehand') && currentPoints.length > 1) {
      const newAnn: ViewerAnnotation = {
        id: `ann-${Date.now()}`,
        pageIndex: pageIdx,
        type: activeTool,
        x: currentPoints[0].x,
        y: currentPoints[0].y,
        color: selectedColor,
        strokeWidth: activeTool === 'highlight-freehand' ? 12 : strokeWidth,
        opacity: activeTool === 'highlight-freehand' ? 0.4 : 1,
        points: currentPoints
      }
      pushAnnotations([...annotations, newAnn])
    } else if (currentBox && dragStart) {
      if (currentBox.w > 0.5 || currentBox.h > 0.5) {
        let type: ViewerAnnotation['type'] = 'highlight-box'
        let opacity = 0.4
        let width = currentBox.w
        let height = currentBox.h

        if (activeTool === 'rect') {
          type = 'rect'
          opacity = 1
        } else if (activeTool === 'circle') {
          type = 'circle'
          opacity = 1
        } else if (activeTool === 'arrow') {
          type = 'arrow'
          opacity = 1
        } else if (activeTool === 'line') {
          type = 'line'
          opacity = 1
        } else if (activeTool === 'underline') {
          type = 'underline'
          opacity = 1
          height = 0.5
        } else if (activeTool === 'strikethrough') {
          type = 'strikethrough'
          opacity = 1
          height = 0.5
        }

        const newAnn: ViewerAnnotation = {
          id: `ann-${Date.now()}`,
          pageIndex: pageIdx,
          type,
          x: currentBox.x,
          y: currentBox.y,
          width,
          height,
          color: selectedColor,
          strokeWidth,
          opacity: activeTool === 'highlight-box' ? 0.38 : 1
        }
        pushAnnotations([...annotations, newAnn])
      }
    }

    setCurrentPoints([])
    setCurrentBox(null)
    setDragStart(null)
  }

  // Delete annotation handler
  const handleDeleteAnnotation = (id: string) => {
    pushAnnotations(annotations.filter((a) => a.id !== id))
    if (activeNoteId === id) setActiveNoteId(null)
    if (activeTextId === id) setActiveTextId(null)
  }

  // Update note text
  const handleUpdateNoteText = (id: string, text: string) => {
    pushAnnotations(annotations.map((a) => (a.id === id ? { ...a, text } : a)))
  }

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        goToPage(currentPage + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        goToPage(currentPage - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goToPage(1)
      } else if (e.key === 'End') {
        e.preventDefault()
        goToPage(totalPages)
      } else if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        handleZoomIn()
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault()
        handleZoomOut()
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault()
        handleZoomReset()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveAnnotatedPdf()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        handleOpenFile()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, totalPages, handleUndo, handleRedo, handleSaveAnnotatedPdf])

  // Annotations for current page
  const pageAnnotations = useMemo(() => {
    return annotations.filter((a) => a.pageIndex === currentPage - 1)
  }, [annotations, currentPage])

  // If no file loaded, show Adobe Reader Style welcome screen
  if (!viewerFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background text-foreground select-none overflow-y-auto">
        <div className="max-w-xl w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center mx-auto shadow-lg text-accent">
            <BookOpen className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">PDF Reader & Viewer</h2>
            <p className="text-muted text-base max-w-md mx-auto">
              Adobe-style reader with page & bookmark navigation, text highlighting, freehand markings, and annotation saving.
            </p>
          </div>

          {/* Dropzone card */}
          <div
            onClick={handleOpenFile}
            className="border-2 border-dashed border-border hover:border-accent/60 bg-elevated/40 hover:bg-elevated/70 p-10 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center group shadow-sm hover:shadow-md"
          >
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="font-semibold text-lg text-foreground mb-1">Click to Open any PDF Document</p>
            <p className="text-sm text-muted">Supports all standard PDF documents, outlines, and form fields</p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-1.5">
                <LayoutGrid className="w-4 h-4" />
                <span>Page Navigation</span>
              </div>
              <p className="text-xs text-muted">Page thumbnails, fast jumping, and keyboard shortcuts.</p>
            </div>

            <div className="p-4 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-1.5">
                <BookOpen className="w-4 h-4" />
                <span>Content Navigation</span>
              </div>
              <p className="text-xs text-muted">Hierarchical bookmarks, chapter table of contents & search.</p>
            </div>

            <div className="p-4 rounded-xl bg-secondary border border-border">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-1.5">
                <Highlighter className="w-4 h-4" />
                <span>Highlights & Marks</span>
              </div>
              <p className="text-xs text-muted">Highlight text, draw with pen, place notes, and export to PDF.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-background overflow-hidden select-none">
      {/* 1. ADOBE-STYLE TOP MENU BAR */}
      <div className="h-8 bg-secondary border-b border-border flex items-center px-3 text-xs text-muted flex-shrink-0 relative">
        <div className="flex items-center gap-1">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
              className={cn("px-2.5 py-1 rounded hover:bg-elevated hover:text-foreground transition-colors", openMenu === 'file' && "bg-elevated text-foreground")}
            >
              File
            </button>
            {openMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-secondary border border-border rounded-lg shadow-xl py-1.5 z-50 text-foreground">
                <button
                  onClick={() => { setOpenMenu(null); handleOpenFile() }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Open PDF...</span>
                  <span className="text-muted text-[10px]">Ctrl+O</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); handleSaveAnnotatedPdf() }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span className="font-semibold text-accent">Save Annotated PDF</span>
                  <span className="text-muted text-[10px]">Ctrl+S</span>
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { setOpenMenu(null); setViewerFile(null) }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-danger/15 text-danger text-left text-xs"
                >
                  <span>Close Document</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
              className={cn("px-2.5 py-1 rounded hover:bg-elevated hover:text-foreground transition-colors", openMenu === 'edit' && "bg-elevated text-foreground")}
            >
              Edit
            </button>
            {openMenu === 'edit' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-secondary border border-border rounded-lg shadow-xl py-1.5 z-50 text-foreground">
                <button
                  onClick={() => { setOpenMenu(null); handleUndo() }}
                  disabled={historyIndex <= 0}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs disabled:opacity-40"
                >
                  <span>Undo</span>
                  <span className="text-muted text-[10px]">Ctrl+Z</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); handleRedo() }}
                  disabled={historyIndex >= history.length - 1}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs disabled:opacity-40"
                >
                  <span>Redo</span>
                  <span className="text-muted text-[10px]">Ctrl+Y</span>
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { setOpenMenu(null); pushAnnotations([]) }}
                  className="w-full flex items-center px-3 py-1.5 hover:bg-danger/15 text-danger text-left text-xs"
                >
                  <span>Clear All Annotations</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'view' ? null : 'view')}
              className={cn("px-2.5 py-1 rounded hover:bg-elevated hover:text-foreground transition-colors", openMenu === 'view' && "bg-elevated text-foreground")}
            >
              View
            </button>
            {openMenu === 'view' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-secondary border border-border rounded-lg shadow-xl py-1.5 z-50 text-foreground">
                <button
                  onClick={() => { setOpenMenu(null); handleZoomIn() }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Zoom In</span>
                  <span className="text-muted text-[10px]">Ctrl++</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); handleZoomOut() }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Zoom Out</span>
                  <span className="text-muted text-[10px]">Ctrl+-</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); handleZoomReset() }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Actual Size (100%)</span>
                  <span className="text-muted text-[10px]">Ctrl+0</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); handleFitWidth() }}
                  className="w-full flex items-center px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Fit Page Width</span>
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { setOpenMenu(null); setRotation((r) => (r + 90) % 360) }}
                  className="w-full flex items-center px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Rotate Clockwise (90°)</span>
                </button>
                <div className="h-px bg-border my-1" />
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-muted">Reading Theme</div>
                <button
                  onClick={() => { setOpenMenu(null); setReadingMode('default') }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Standard White</span>
                  {readingMode === 'default' && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
                <button
                  onClick={() => { setOpenMenu(null); setReadingMode('dark') }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Dark Mode Reader</span>
                  {readingMode === 'dark' && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
                <button
                  onClick={() => { setOpenMenu(null); setReadingMode('sepia') }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Warm Sepia</span>
                  {readingMode === 'sepia' && <Check className="w-3.5 h-3.5 text-accent" />}
                </button>
              </div>
            )}
          </div>

          {/* Navigate Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'nav' ? null : 'nav')}
              className={cn("px-2.5 py-1 rounded hover:bg-elevated hover:text-foreground transition-colors", openMenu === 'nav' && "bg-elevated text-foreground")}
            >
              Navigate
            </button>
            {openMenu === 'nav' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-secondary border border-border rounded-lg shadow-xl py-1.5 z-50 text-foreground">
                <button
                  onClick={() => { setOpenMenu(null); goToPage(currentPage - 1) }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Previous Page</span>
                  <span className="text-muted text-[10px]">PageUp</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); goToPage(currentPage + 1) }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Next Page</span>
                  <span className="text-muted text-[10px]">PageDown</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); goToPage(1) }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>First Page</span>
                  <span className="text-muted text-[10px]">Home</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); goToPage(totalPages) }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <span>Last Page</span>
                  <span className="text-muted text-[10px]">End</span>
                </button>
              </div>
            )}
          </div>

          {/* Annotate Menu */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'annotate' ? null : 'annotate')}
              className={cn("px-2.5 py-1 rounded hover:bg-elevated hover:text-foreground transition-colors", openMenu === 'annotate' && "bg-elevated text-foreground")}
            >
              Annotate
            </button>
            {openMenu === 'annotate' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-secondary border border-border rounded-lg shadow-xl py-1.5 z-50 text-foreground">
                <button
                  onClick={() => { setOpenMenu(null); setActiveTool('highlight-box') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <Highlighter className="w-3.5 h-3.5 text-warning" />
                  <span>Highlight Box</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); setActiveTool('highlight-freehand') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <Highlighter className="w-3.5 h-3.5 text-success" />
                  <span>Freehand Highlighter</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); setActiveTool('pen') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <PenTool className="w-3.5 h-3.5 text-accent" />
                  <span>Pen Markup</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); setActiveTool('note') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-warning" />
                  <span>Sticky Note Comment</span>
                </button>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => { setOpenMenu(null); setActiveTool('rect') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <Square className="w-3.5 h-3.5 text-foreground" />
                  <span>Rectangle Shape</span>
                </button>
                <button
                  onClick={() => { setOpenMenu(null); setActiveTool('arrow') }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/15 text-left text-xs"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-foreground" />
                  <span>Arrow Pointer</span>
                </button>
              </div>
            )}
          </div>

          {/* Developer Menu */}
          <button
            onClick={() => setIsDevModalOpen(true)}
            className="px-2.5 py-1 rounded hover:bg-elevated hover:text-foreground text-accent font-semibold transition-colors flex items-center gap-1.5"
            title="Developer: Srijon Chakraborty (Click for info & GitHub)"
          >
            <GithubIcon className="w-3 h-3" />
            <span>Developer</span>
          </button>
        </div>

        {/* Document title on top bar */}
        <div className="ml-auto flex items-center gap-2 text-muted text-[11px] truncate max-w-md">
          <span className="truncate">{viewerFile.name}</span>
          <span>•</span>
          <span>{totalPages} Pages</span>
        </div>
      </div>

      {/* 2. ADOBE-STYLE PRIMARY TOOLBAR */}
      <div className="h-12 bg-secondary/80 backdrop-blur border-b border-border flex items-center justify-between px-3 gap-2 flex-shrink-0 z-20 overflow-x-auto scrollbar-none">
        {/* Left: Sidebar toggle & Tools */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              "p-2 rounded-lg text-muted hover:text-foreground hover:bg-elevated transition-colors",
              sidebarOpen && "bg-elevated text-accent"
            )}
            title="Toggle Navigation Sidebar (Thumbnails, Outline, Search)"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Selection / Pan tools */}
          <button
            onClick={() => setActiveTool('select')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'select' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Select & Click Tool"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('hand')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'hand' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Hand / Pan Tool"
          >
            <Hand className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Annotation & Markup Tools */}
          <button
            onClick={() => { setActiveTool('highlight-box'); setSelectedColor('#facc15') }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeTool === 'highlight-box' ? "bg-warning/20 text-warning border border-warning/40" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Highlight Box (Drag over text or diagram)"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Highlight</span>
          </button>

          <button
            onClick={() => setActiveTool('highlight-freehand')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'highlight-freehand' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Freehand Highlighter Pen"
          >
            <Highlighter className="w-4 h-4 rotate-12" />
          </button>

          <button
            onClick={() => setActiveTool('pen')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'pen' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Pen / Freehand Markup"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('underline')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'underline' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Underline Text"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('strikethrough')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'strikethrough' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Strikethrough Text"
          >
            <StrikethroughIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('note')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'note' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Sticky Note Comment"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('rect')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'rect' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Rectangle Shape"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('arrow')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'arrow' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Arrow Markup"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('text')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'text' ? "bg-accent text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Typewriter / Text Comment"
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTool('eraser')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              activeTool === 'eraser' ? "bg-danger text-white" : "text-muted hover:text-foreground hover:bg-elevated"
            )}
            title="Eraser (Click any annotation to delete)"
          >
            <Eraser className="w-4 h-4" />
          </button>

          {/* Quick Color Picker */}
          {['highlight-box', 'highlight-freehand'].includes(activeTool) && (
            <div className="flex items-center gap-1 bg-elevated px-2 py-1 rounded-lg border border-border ml-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={cn(
                    "w-4 h-4 rounded-full border border-black/20 transition-transform",
                    selectedColor === c ? "scale-125 ring-2 ring-accent" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {['pen', 'rect', 'circle', 'arrow', 'underline', 'strikethrough'].includes(activeTool) && (
            <div className="flex items-center gap-1 bg-elevated px-2 py-1 rounded-lg border border-border ml-1">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={cn(
                    "w-4 h-4 rounded-full border border-black/20 transition-transform",
                    selectedColor === c ? "scale-125 ring-2 ring-accent" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Center: PAGE-WISE NAVIGATION */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-elevated disabled:opacity-30 text-muted hover:text-foreground transition-colors"
            title="First Page (Home)"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-elevated disabled:opacity-30 text-muted hover:text-foreground transition-colors"
            title="Previous Page (PageUp)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={pageInputVal}
              onChange={(e) => setPageInputVal(e.target.value)}
              onBlur={handlePageInputSubmit}
              className="w-12 text-center text-xs font-semibold bg-elevated border border-border rounded py-1 focus:outline-none focus:border-accent text-foreground"
            />
            <span className="text-xs text-muted">/ {totalPages}</span>
          </form>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-elevated disabled:opacity-30 text-muted hover:text-foreground transition-colors"
            title="Next Page (PageDown)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-elevated disabled:opacity-30 text-muted hover:text-foreground transition-colors"
            title="Last Page (End)"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom & Save Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-elevated text-muted hover:text-foreground transition-colors"
            title="Zoom Out (Ctrl+-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <select
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="text-xs bg-elevated border border-border rounded px-2 py-1 text-foreground focus:outline-none cursor-pointer"
          >
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1.0">100%</option>
            <option value="1.25">125%</option>
            <option value="1.5">150%</option>
            <option value="2.0">200%</option>
          </select>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-elevated text-muted hover:text-foreground transition-colors"
            title="Zoom In (Ctrl++)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitWidth}
            className="px-2 py-1 rounded hover:bg-elevated text-xs text-muted hover:text-foreground font-medium hidden md:inline"
            title="Fit Page to Width"
          >
            Fit Width
          </button>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded hover:bg-elevated text-muted hover:text-foreground transition-colors"
            title="Rotate Clockwise 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded hover:bg-elevated disabled:opacity-30 text-muted hover:text-foreground transition-colors"
            title="Undo Annotation (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded hover:bg-elevated disabled:opacity-30 text-muted hover:text-foreground transition-colors"
            title="Redo Annotation (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-border mx-1" />

          {/* Save Annotated PDF */}
          <button
            onClick={handleSaveAnnotatedPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all shadow-accent/20"
            title="Save PDF with all highlights & markings embedded"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save PDF</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (LEFT NAVIGATION SIDEBAR + DOCUMENT VIEWER) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT NAVIGATION DRAWER (PAGE & CONTENT NAVIGATION) */}
        {sidebarOpen && (
          <aside className="w-72 bg-secondary border-r border-border flex flex-col flex-shrink-0 z-10 transition-all">
            {/* Drawer Tabs Header */}
            <div className="grid grid-cols-4 border-b border-border text-xs bg-secondary">
              <button
                onClick={() => setSidebarTab('thumbnails')}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 font-medium transition-colors border-b-2",
                  sidebarTab === 'thumbnails'
                    ? "border-accent text-accent bg-elevated/50"
                    : "border-transparent text-muted hover:text-foreground hover:bg-elevated/30"
                )}
                title="Page Thumbnails Navigation"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[11px]">Pages</span>
              </button>

              <button
                onClick={() => setSidebarTab('outline')}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 font-medium transition-colors border-b-2",
                  sidebarTab === 'outline'
                    ? "border-accent text-accent bg-elevated/50"
                    : "border-transparent text-muted hover:text-foreground hover:bg-elevated/30"
                )}
                title="Table of Contents / Bookmarks"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-[11px]">Outline</span>
              </button>

              <button
                onClick={() => setSidebarTab('search')}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 font-medium transition-colors border-b-2",
                  sidebarTab === 'search'
                    ? "border-accent text-accent bg-elevated/50"
                    : "border-transparent text-muted hover:text-foreground hover:bg-elevated/30"
                )}
                title="Search Content in Document"
              >
                <Search className="w-4 h-4" />
                <span className="text-[11px]">Search</span>
              </button>

              <button
                onClick={() => setSidebarTab('annotations')}
                className={cn(
                  "py-2.5 flex flex-col items-center gap-1 font-medium transition-colors border-b-2",
                  sidebarTab === 'annotations'
                    ? "border-accent text-accent bg-elevated/50"
                    : "border-transparent text-muted hover:text-foreground hover:bg-elevated/30"
                )}
                title="View All Annotations & Highlights"
              >
                <FilePen className="w-4 h-4" />
                <span className="text-[11px]">Notes ({annotations.length})</span>
              </button>
            </div>

            {/* TAB 1: PAGE THUMBNAILS (PAGE-WISE NAVIGATION) */}
            {sidebarTab === 'thumbnails' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Page Thumbnails</span>
                  <span>{totalPages} Pages</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1
                    const isActive = pageNum === currentPage
                    return (
                      <div
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={cn(
                          "flex flex-col items-center p-2 rounded-xl cursor-pointer transition-all border group bg-elevated/40",
                          isActive
                            ? "border-accent ring-2 ring-accent/30 bg-accent/5 shadow-md shadow-accent/10"
                            : "border-border hover:border-accent/40 hover:bg-elevated"
                        )}
                      >
                        {/* Thumbnail placeholder canvas */}
                        <PageThumbnailItem
                          pdfDoc={pdfDoc}
                          pageNumber={pageNum}
                          isActive={isActive}
                        />
                        <span className={cn(
                          "mt-1.5 text-xs font-medium",
                          isActive ? "text-accent font-bold" : "text-muted group-hover:text-foreground"
                        )}>
                          Page {pageNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: TABLE OF CONTENTS / BOOKMARKS (CONTENT-WISE NAVIGATION) */}
            {sidebarTab === 'outline' && (
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-1">
                  Document Bookmarks
                </div>

                {outlineLoading ? (
                  <div className="text-xs text-muted text-center py-8">Loading table of contents...</div>
                ) : outline.length > 0 ? (
                  <div className="space-y-1">
                    <OutlineTree
                      nodes={outline}
                      currentPage={currentPage}
                      onSelectPage={(p) => goToPage(p)}
                    />
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 space-y-3">
                    <BookOpen className="w-8 h-8 text-muted/40 mx-auto" />
                    <p className="text-xs text-muted font-medium">No bookmarks or outlines embedded in this PDF.</p>
                    <p className="text-[11px] text-muted/80">
                      Use the <button onClick={() => setSidebarTab('search')} className="text-accent underline font-semibold">Search Tab</button> or <button onClick={() => setSidebarTab('thumbnails')} className="text-accent underline font-semibold">Thumbnails</button> for content navigation.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: CONTENT SEARCH */}
            {sidebarTab === 'search' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-border bg-secondary">
                  <form onSubmit={handleSearch} className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Search text in document..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 bg-elevated border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSearchResults([]) }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </form>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                    <span>Press Enter to search</span>
                    {searchResults.length > 0 && (
                      <span className="font-semibold text-accent">{searchResults.length} matches</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
                  {isSearching ? (
                    <div className="text-xs text-muted text-center py-8">Searching across pages...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((res, idx) => (
                      <div
                        key={idx}
                        onClick={() => goToPage(res.pageIndex + 1)}
                        className="p-2.5 rounded-lg bg-elevated/40 hover:bg-elevated border border-border hover:border-accent/40 cursor-pointer transition-colors space-y-1 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-accent">Page {res.pageIndex + 1}</span>
                          <ChevronRight className="w-3 h-3 text-muted" />
                        </div>
                        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                          {res.snippet}
                        </p>
                      </div>
                    ))
                  ) : searchQuery ? (
                    <div className="text-xs text-muted text-center py-8">No results found for "{searchQuery}"</div>
                  ) : (
                    <div className="text-xs text-muted text-center py-8">Type a keyword to search anywhere in the document.</div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: ANNOTATIONS & NOTES LIST */}
            {sidebarTab === 'annotations' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
                <div className="flex items-center justify-between text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  <span>Annotations</span>
                  {annotations.length > 0 && (
                    <button
                      onClick={() => pushAnnotations([])}
                      className="text-danger hover:underline font-normal text-[11px]"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {annotations.length === 0 ? (
                  <div className="text-center py-10 px-4 space-y-2">
                    <Highlighter className="w-8 h-8 text-muted/40 mx-auto" />
                    <p className="text-xs text-muted">No annotations created yet.</p>
                    <p className="text-[11px] text-muted/70">
                      Use the top toolbar tools (Highlight, Pen, Notes, Shapes) to mark up this PDF.
                    </p>
                  </div>
                ) : (
                  annotations.map((ann) => (
                    <div
                      key={ann.id}
                      onClick={() => goToPage(ann.pageIndex + 1)}
                      className="p-2.5 rounded-lg bg-elevated/50 hover:bg-elevated border border-border hover:border-accent/40 cursor-pointer transition-all flex items-start justify-between gap-2 group"
                    >
                      <div className="flex items-start gap-2 overflow-hidden">
                        <div
                          className="w-3.5 h-3.5 rounded-full mt-0.5 flex-shrink-0"
                          style={{ backgroundColor: ann.color }}
                        />
                        <div className="space-y-0.5 truncate text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-foreground capitalize">
                              {ann.type.replace('-', ' ')}
                            </span>
                            <span className="text-[10px] text-muted">Page {ann.pageIndex + 1}</span>
                          </div>
                          {ann.text && (
                            <p className="text-xs text-muted truncate">{ann.text}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAnnotation(ann.id)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger rounded hover:bg-danger/10 transition-all"
                        title="Delete Annotation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </aside>
        )}

        {/* DOCUMENT VIEW SURFACE */}
        <div
          ref={containerRef}
          className={cn(
            "flex-1 overflow-auto flex items-start justify-center p-8 scrollbar-thin relative select-none",
            readingMode === 'dark' ? "bg-[#18181b]" : readingMode === 'sepia' ? "bg-[#f4ecd8]" : "bg-elevated/20"
          )}
        >
          <div
            className={cn(
              "relative shadow-2xl transition-all border border-border/40",
              readingMode === 'dark' && "invert-[0.9] hue-rotate-180",
              readingMode === 'sepia' && "sepia-[0.35] contrast-[0.95]"
            )}
            style={{ cursor: activeTool === 'hand' ? 'grab' : activeTool === 'select' ? 'default' : 'crosshair' }}
          >
            {/* The PDF Page Canvas */}
            <canvas ref={canvasRef} className="block rounded-sm bg-white" />

            {/* The Marking & Annotation Interactive Overlay Layer */}
            <div
              ref={overlayRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute inset-0 pointer-events-auto"
            >
              {/* Existing saved annotations for this page */}
              {pageAnnotations.map((ann) => {
                if (ann.type === 'highlight-box') {
                  return (
                    <div
                      key={ann.id}
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                      className={cn(
                        "absolute rounded-sm pointer-events-auto transition-opacity",
                        activeTool === 'eraser' && "hover:ring-2 hover:ring-danger cursor-pointer"
                      )}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        backgroundColor: ann.color,
                        opacity: ann.opacity ?? 0.38,
                        mixBlendMode: 'multiply'
                      }}
                      title="Highlight"
                    />
                  )
                }

                if (ann.type === 'rect') {
                  return (
                    <div
                      key={ann.id}
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                      className={cn(
                        "absolute pointer-events-auto",
                        activeTool === 'eraser' && "hover:ring-2 hover:ring-danger cursor-pointer"
                      )}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        border: `${ann.strokeWidth || 2}px solid ${ann.color}`
                      }}
                    />
                  )
                }

                if (ann.type === 'circle') {
                  return (
                    <div
                      key={ann.id}
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                      className={cn(
                        "absolute rounded-full pointer-events-auto",
                        activeTool === 'eraser' && "hover:ring-2 hover:ring-danger cursor-pointer"
                      )}
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.height}%`,
                        border: `${ann.strokeWidth || 2}px solid ${ann.color}`
                      }}
                    />
                  )
                }

                if (ann.type === 'underline' || ann.type === 'strikethrough') {
                  return (
                    <div
                      key={ann.id}
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                      className="absolute pointer-events-auto"
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        width: `${ann.width}%`,
                        height: `${ann.strokeWidth || 2}px`,
                        backgroundColor: ann.color
                      }}
                    />
                  )
                }

                if ((ann.type === 'pen' || ann.type === 'highlight-freehand') && ann.points && ann.points.length > 1) {
                  const pointsStr = ann.points.map((p) => `${p.x},${p.y}`).join(' ')
                  return (
                    <svg
                      key={ann.id}
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                      className={cn(
                        "absolute inset-0 w-full h-full pointer-events-auto",
                        activeTool === 'eraser' && "hover:opacity-60 cursor-pointer"
                      )}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={ann.color}
                        strokeWidth={ann.type === 'highlight-freehand' ? 1.5 : (ann.strokeWidth || 2) * 0.25}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={ann.opacity ?? (ann.type === 'highlight-freehand' ? 0.38 : 1)}
                      />
                    </svg>
                  )
                }

                if (ann.type === 'arrow' || ann.type === 'line') {
                  const x1 = ann.x
                  const y1 = ann.y
                  const x2 = ann.x + (ann.width || 0)
                  const y2 = ann.y + (ann.height || 0)
                  return (
                    <svg
                      key={ann.id}
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                      className="absolute inset-0 w-full h-full pointer-events-auto"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={ann.color}
                        strokeWidth={(ann.strokeWidth || 2) * 0.25}
                        strokeLinecap="round"
                      />
                      {ann.type === 'arrow' && (
                        <circle cx={x2} cy={y2} r="0.8" fill={ann.color} />
                      )}
                    </svg>
                  )
                }

                if (ann.type === 'note') {
                  const isOpened = activeNoteId === ann.id
                  return (
                    <div
                      key={ann.id}
                      className="absolute pointer-events-auto z-20"
                      style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (activeTool === 'eraser') {
                            handleDeleteAnnotation(ann.id)
                          } else {
                            setActiveNoteId(isOpened ? null : ann.id)
                          }
                        }}
                        className="w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center justify-center shadow-lg border border-amber-600 transition-transform hover:scale-110"
                        title={ann.text || 'Sticky Note'}
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-current" />
                      </button>

                      {isOpened && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-6 top-0 w-56 bg-secondary border border-border rounded-xl shadow-2xl p-3 z-30 space-y-2 text-foreground"
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1.5 text-amber-500">
                              <MessageSquare className="w-3.5 h-3.5" />
                              Note
                            </span>
                            <button
                              onClick={() => setActiveNoteId(null)}
                              className="text-muted hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <textarea
                            value={ann.text || ''}
                            onChange={(e) => handleUpdateNoteText(ann.id, e.target.value)}
                            placeholder="Type comment..."
                            className="w-full h-20 p-2 text-xs bg-elevated border border-border rounded-lg text-foreground resize-none focus:outline-none focus:border-accent"
                          />
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDeleteAnnotation(ann.id)}
                              className="text-[11px] text-danger hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                if (ann.type === 'text') {
                  const isEditing = activeTextId === ann.id
                  return (
                    <div
                      key={ann.id}
                      className="absolute pointer-events-auto z-20"
                      style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          value={ann.text || ''}
                          autoFocus
                          onChange={(e) => handleUpdateNoteText(ann.id, e.target.value)}
                          onBlur={() => setActiveTextId(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setActiveTextId(null)}
                          className="px-2 py-1 bg-elevated text-foreground border border-accent rounded text-xs focus:outline-none shadow-md"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            if (activeTool === 'eraser') handleDeleteAnnotation(ann.id)
                            else setActiveTextId(ann.id)
                          }}
                          className="cursor-pointer font-medium hover:ring-1 hover:ring-accent rounded px-1"
                          style={{ color: ann.color, fontSize: `${ann.fontSize || 14}px` }}
                        >
                          {ann.text}
                        </span>
                      )}
                    </div>
                  )
                }

                return null
              })}

              {/* In-progress drawing preview */}
              {isDrawing && currentBox && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${currentBox.x}%`,
                    top: `${currentBox.y}%`,
                    width: `${currentBox.w}%`,
                    height: `${currentBox.h}%`,
                    backgroundColor: activeTool === 'highlight-box' ? selectedColor : 'transparent',
                    border: activeTool === 'rect' ? `${strokeWidth}px solid ${selectedColor}` : 'none',
                    borderRadius: activeTool === 'circle' ? '9999px' : '2px',
                    opacity: activeTool === 'highlight-box' ? 0.38 : 1
                  }}
                />
              )}

              {isDrawing && currentPoints.length > 1 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polyline
                    points={currentPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={selectedColor}
                    strokeWidth={activeTool === 'highlight-freehand' ? 1.5 : strokeWidth * 0.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={activeTool === 'highlight-freehand' ? 0.4 : 1}
                  />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeveloperModal
        isOpen={isDevModalOpen}
        onClose={() => setIsDevModalOpen(false)}
      />
    </div>
  )
}

// Subcomponent: Thumbnail item for Page-wise navigation
function PageThumbnailItem({
  pdfDoc,
  pageNumber,
  isActive
}: {
  pdfDoc: pdfjsLib.PDFDocumentProxy | null
  pageNumber: number
  isActive: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || rendered) return

    let isCurrent = true
    const renderThumb = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber)
        if (!isCurrent) return

        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const viewport = page.getViewport({ scale: 0.25 })
        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvasContext: ctx, viewport } as any).promise
        if (isCurrent) setRendered(true)
      } catch (e) {}
    }

    renderThumb()
    return () => {
      isCurrent = false
    }
  }, [pdfDoc, pageNumber, rendered])

  return (
    <div className="w-full aspect-[3/4] bg-white rounded flex items-center justify-center overflow-hidden shadow-sm">
      <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
    </div>
  )
}

// Subcomponent: Recursive Outline / TOC Tree
function OutlineTree({
  nodes,
  currentPage,
  onSelectPage,
  depth = 0
}: {
  nodes: OutlineNode[]
  currentPage: number
  onSelectPage: (p: number) => void
  depth?: number
}) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node, i) => {
        const hasChildren = node.items && node.items.length > 0
        const pageNum = node.pageIndex !== undefined ? node.pageIndex + 1 : null
        const isCurrent = pageNum === currentPage

        return (
          <div key={i} className="text-xs">
            <div
              onClick={() => pageNum && onSelectPage(pageNum)}
              style={{ paddingLeft: `${depth * 14 + 6}px` }}
              className={cn(
                "py-1.5 pr-2 rounded-md flex items-center justify-between cursor-pointer transition-colors text-left group",
                isCurrent
                  ? "bg-accent/15 text-accent font-semibold"
                  : "text-foreground hover:bg-elevated hover:text-accent"
              )}
            >
              <span className={cn("truncate", node.bold && "font-bold", node.italic && "italic")}>
                {node.title}
              </span>
              {pageNum && (
                <span className="text-[10px] text-muted group-hover:text-foreground ml-2 flex-shrink-0">
                  p.{pageNum}
                </span>
              )}
            </div>

            {hasChildren && (
              <OutlineTree
                nodes={node.items!}
                currentPage={currentPage}
                onSelectPage={onSelectPage}
                depth={depth + 1}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
