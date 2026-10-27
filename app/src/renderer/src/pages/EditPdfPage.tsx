import { useState, useRef, useEffect } from 'react'
import { Dropzone } from '../components/Dropzone'
import { PrimaryButton } from '../components/PrimaryButton'
import { ProgressModal } from '../components/ProgressModal'
import { toast } from 'sonner'
import {
  FileText, ArrowLeft, Save, Trash2, Undo2, Redo2,
  Type, PenTool, Square, Circle, Minus, ArrowRight,
  Highlighter, Underline, CheckSquare, Radio, List,
  ChevronDown, Image as ImageIcon, Eraser, MousePointer,
  Strikethrough, MessageSquare, StickyNote, Link as LinkIcon,
  Cloud, Hexagon, Spline, Paperclip, Stamp, AlignLeft,
  AlignCenter, AlignRight, AlignJustify, Bold, Italic,
  Sliders, Plus, Layers
} from 'lucide-react'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'

export type TabType = 'annotate' | 'shapes' | 'insert' | 'edit-text' | 'forms'
export type ToolType =
  | 'select'
  | 'text'
  | 'pencil'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'squiggly'
  | 'freehand-highlight'
  | 'callout'
  | 'note'
  | 'link'
  | 'rectangle'
  | 'ellipse'
  | 'arc'
  | 'polygon'
  | 'cloud'
  | 'line'
  | 'polyline'
  | 'arrow'
  | 'stamp'
  | 'signature'
  | 'attachment'
  | 'image'
  | 'field-signature'
  | 'field-text'
  | 'field-multiline'
  | 'field-checkbox'
  | 'field-radio'
  | 'field-listbox'
  | 'field-combobox'

export interface Point {
  x: number
  y: number
}

export interface Annotation {
  id: string
  pageIndex: number
  type: ToolType
  x: number // percentage relative to page width (0-100)
  y: number // percentage relative to page height (0-100)
  width?: number // percentage
  height?: number // percentage
  points?: Point[]
  text?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  strokeColor?: string
  strokeWidth?: number
  align?: 'left' | 'center' | 'right' | 'justify'
  isBold?: boolean
  isItalic?: boolean
  isUnderline?: boolean
  stampText?: string
  stampColor?: string
  options?: string[]
  imageDataUrl?: string
}

const STANDARD_STAMPS = [
  { text: 'APPROVED', color: '#16a34a', bg: '#dcfce7' },
  { text: 'AS IS', color: '#475569', bg: '#f1f5f9' },
  { text: 'COMPLETED', color: '#16a34a', bg: '#dcfce7' },
  { text: 'CONFIDENTIAL', color: '#dc2626', bg: '#fee2e2' },
  { text: 'DEPARTMENTAL', color: '#2563eb', bg: '#dbeafe' },
  { text: 'DRAFT', color: '#64748b', bg: '#f1f5f9' },
  { text: 'EXPERIMENTAL', color: '#9333ea', bg: '#f3e8ff' },
  { text: 'EXPIRED', color: '#dc2626', bg: '#fee2e2' },
  { text: 'FINAL', color: '#16a34a', bg: '#dcfce7' },
  { text: 'FOR COMMENT', color: '#d97706', bg: '#fef3c7' },
  { text: 'FOR PUBLIC RELEASE', color: '#2563eb', bg: '#dbeafe' },
  { text: 'INFORMATION ONLY', color: '#0284c7', bg: '#e0f2fe' },
  { text: 'NOT APPROVED', color: '#dc2626', bg: '#fee2e2' }
]

const COLOR_SWATCHES = [
  '#000000', '#475569', '#dc2626', '#d97706',
  '#16a34a', '#0284c7', '#2563eb', '#9333ea'
]

export function EditPdfPage() {
  const [file, setFile] = useState<{ name: string; path: string; size: number } | null>(null)
  const [pages, setPages] = useState<{ canvasUrl: string; width: number; height: number }[]>([])
  const [activePageIndex, setActivePageIndex] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  // Active Tool & Tabs
  const [activeTab, setActiveTab] = useState<TabType>('annotate')
  const [activeTool, setActiveTool] = useState<ToolType>('select')
  const [fontFamily, setFontFamily] = useState<string>('Helvetica')
  const [fontSize, setFontSize] = useState<number>(12)
  const [textColor, setTextColor] = useState<string>('#000000')
  const [strokeColor, setStrokeColor] = useState<string>('#dc2626')
  const [strokeWidth, setStrokeWidth] = useState<number>(1)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)

  // Annotations & History
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [history, setHistory] = useState<Annotation[][]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [shapeStart, setShapeStart] = useState<Point | null>(null)
  const [shapeEnd, setShapeEnd] = useState<Point | null>(null)

  // Signature modal
  const [isSigModalOpen, setIsSigModalOpen] = useState(false)
  const [typedSig, setTypedSig] = useState('')

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    annotationId: string
    startX: number
    startY: number
    origX: number
    origY: number
    mode: 'drag' | 'resize'
    origW?: number
    origH?: number
  } | null>(null)

  // Push state to undo/redo history
  const pushState = (newAnn: Annotation[]) => {
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(newAnn)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
    setAnnotations(newAnn)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations(history[historyIndex - 1])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations(history[historyIndex + 1])
    }
  }

  // Load PDF
  useEffect(() => {
    if (!file) {
      setPages([])
      setAnnotations([])
      setHistory([])
      setHistoryIndex(-1)
      return
    }

    const loadPdf = async () => {
      setLoadingMsg('Loading PDF pages...')
      setIsProcessing(true)
      try {
        const fileData = await window.api.readFile(file.path)
        if (!fileData.success) throw new Error(fileData.error)

        const pdf = await pdfjsLib.getDocument({ data: fileData.data! }).promise
        const totalPages = pdf.numPages
        const loadedPages: { canvasUrl: string; width: number; height: number }[] = []

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: 1.5 })
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) continue

          canvas.height = viewport.height
          canvas.width = viewport.width

          await page.render({
            canvasContext: context,
            viewport: viewport
          } as any).promise

          loadedPages.push({
            canvasUrl: canvas.toDataURL('image/jpeg', 0.8),
            width: viewport.width,
            height: viewport.height
          })
        }

        setPages(loadedPages)
        setActivePageIndex(0)
        pushState([])
      } catch (err: any) {
        toast.error(`Error loading PDF: ${err.message}`)
        setFile(null)
      } finally {
        setIsProcessing(false)
      }
    }

    loadPdf()
  }, [file])

  const handleFileSelect = (files: FileList) => {
    if (!files.length) return
    const f = files[0]
    setFile({ name: f.name, path: window.api.getFilePath(f), size: f.size })
  }

  // Canvas relative point helpers
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>): Point | null => {
    if (!canvasContainerRef.current) return null
    const rect = canvasContainerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  // Mouse Handlers for Canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select') return
    const pt = getCanvasCoords(e)
    if (!pt) return

    if (activeTool === 'pencil' || activeTool === 'freehand-highlight') {
      setIsDrawing(true)
      setCurrentPath([pt])
    } else if (['rectangle', 'ellipse', 'line', 'arrow', 'cloud', 'polygon', 'arc', 'highlight', 'underline', 'strikethrough', 'squiggly'].includes(activeTool)) {
      setIsDrawing(true)
      setShapeStart(pt)
      setShapeEnd(pt)
    } else if (activeTool === 'text' || activeTool === 'callout') {
      const newAnn: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: activePageIndex,
        type: activeTool,
        x: pt.x,
        y: pt.y,
        width: 25,
        height: 8,
        text: activeTool === 'callout' ? 'Callout text' : 'Enter text here',
        fontSize,
        fontFamily,
        color: textColor,
        align: textAlign,
        isBold,
        isItalic
      }
      pushState([...annotations, newAnn])
      setSelectedId(newAnn.id)
      setActiveTool('select')
    } else if (activeTool === 'note') {
      const newAnn: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: activePageIndex,
        type: 'note',
        x: pt.x,
        y: pt.y,
        text: 'Note',
        color: '#fbbf24'
      }
      pushState([...annotations, newAnn])
      setSelectedId(newAnn.id)
      setActiveTool('select')
    } else if (activeTool.startsWith('field-')) {
      const newAnn: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: activePageIndex,
        type: activeTool,
        x: pt.x,
        y: pt.y,
        width: activeTool === 'field-checkbox' || activeTool === 'field-radio' ? 4 : 20,
        height: activeTool === 'field-checkbox' || activeTool === 'field-radio' ? 4 : 5,
        text: activeTool === 'field-text' ? 'Field Value' : 'Option'
      }
      pushState([...annotations, newAnn])
      setSelectedId(newAnn.id)
      setActiveTool('select')
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Handle annotation drag/resize
    if (dragRef.current) {
      const rect = canvasContainerRef.current!.getBoundingClientRect()
      const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100
      const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100
      if (dragRef.current.mode === 'drag') {
        const newX = Math.max(0, Math.min(95, dragRef.current.origX + dx))
        const newY = Math.max(0, Math.min(95, dragRef.current.origY + dy))
        setAnnotations(prev => prev.map(a => (a.id === dragRef.current!.annotationId ? { ...a, x: newX, y: newY } : a)))
      } else {
        const newW = Math.max(3, dragRef.current.origW! + dx)
        const newH = Math.max(2, dragRef.current.origH! + dy)
        setAnnotations(prev => prev.map(a => (a.id === dragRef.current!.annotationId ? { ...a, width: newW, height: newH } : a)))
      }
      return
    }

    if (!isDrawing) return
    const pt = getCanvasCoords(e)
    if (!pt) return

    if (activeTool === 'pencil' || activeTool === 'freehand-highlight') {
      setCurrentPath(prev => [...prev, pt])
    } else if (['rectangle', 'ellipse', 'line', 'arrow', 'cloud', 'polygon', 'arc', 'highlight', 'underline', 'strikethrough', 'squiggly'].includes(activeTool)) {
      setShapeEnd(pt)
    }
  }

  const handleMouseUp = () => {
    // End annotation drag/resize
    if (dragRef.current) {
      pushState([...annotations])
      dragRef.current = null
      return
    }

    if (!isDrawing) return
    setIsDrawing(false)

    if ((activeTool === 'pencil' || activeTool === 'freehand-highlight') && currentPath.length > 1) {
      const newAnn: Annotation = {
        id: Math.random().toString(36).substring(2, 9),
        pageIndex: activePageIndex,
        type: activeTool,
        x: 0,
        y: 0,
        points: currentPath,
        strokeColor: activeTool === 'freehand-highlight' ? '#fef08a' : strokeColor,
        strokeWidth: activeTool === 'freehand-highlight' ? 8 : strokeWidth
      }
      pushState([...annotations, newAnn])
      setCurrentPath([])
    } else if (shapeStart && shapeEnd) {
      let x = Math.min(shapeStart.x, shapeEnd.x)
      let y = Math.min(shapeStart.y, shapeEnd.y)
      let width = Math.abs(shapeEnd.x - shapeStart.x)
      let height = Math.abs(shapeEnd.y - shapeStart.y)

      if (['line', 'arrow', 'arc'].includes(activeTool)) {
        const newAnn: Annotation = {
          id: Math.random().toString(36).substring(2, 9),
          pageIndex: activePageIndex,
          type: activeTool,
          x: shapeStart.x,
          y: shapeStart.y,
          points: [shapeStart, shapeEnd],
          strokeColor,
          strokeWidth
        }
        pushState([...annotations, newAnn])
      } else if (width > 0.5 && height > 0.5) {
        const newAnn: Annotation = {
          id: Math.random().toString(36).substring(2, 9),
          pageIndex: activePageIndex,
          type: activeTool,
          x,
          y,
          width,
          height,
          color: activeTool === 'highlight' ? '#fef08a' : undefined,
          strokeColor: activeTool === 'highlight' ? 'transparent' : strokeColor,
          strokeWidth
        }
        pushState([...annotations, newAnn])
      }
      setShapeStart(null)
      setShapeEnd(null)
    }
  }

  // Stamp selection handler
  const handlePlaceStamp = (stamp: { text: string; color: string; bg: string }) => {
    const newAnn: Annotation = {
      id: Math.random().toString(36).substring(2, 9),
      pageIndex: activePageIndex,
      type: 'stamp',
      x: 35,
      y: 20,
      width: 30,
      height: 7,
      stampText: stamp.text,
      stampColor: stamp.color,
      color: stamp.bg
    }
    pushState([...annotations, newAnn])
    setSelectedId(newAnn.id)
  }

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    const updated = annotations.map(a => (a.id === id ? { ...a, ...updates } : a))
    pushState(updated)
  }

  const deleteSelected = () => {
    if (!selectedId) return
    pushState(annotations.filter(a => a.id !== selectedId))
    setSelectedId(null)
  }

  const handleAddSignature = (imageDataUrl: string) => {
    const newAnn: Annotation = {
      id: Math.random().toString(36).substring(2, 9),
      pageIndex: activePageIndex,
      type: 'signature',
      x: 35,
      y: 70,
      width: 25,
      height: 10,
      imageDataUrl
    }
    pushState([...annotations, newAnn])
    setSelectedId(newAnn.id)
    setIsSigModalOpen(false)
  }

  const handleInsertImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (ev) => {
      const f = (ev.target as HTMLInputElement).files?.[0]
      if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const newAnn: Annotation = {
          id: Math.random().toString(36).substring(2, 9),
          pageIndex: activePageIndex,
          type: 'image',
          x: 20,
          y: 20,
          width: 30,
          height: 25,
          imageDataUrl: dataUrl
        }
        pushState([...annotations, newAnn])
        setSelectedId(newAnn.id)
      }
      reader.readAsDataURL(f)
    }
    input.click()
  }

  const handleAnnotationDragStart = (e: React.MouseEvent, ann: Annotation) => {
    if (activeTool !== 'select') return
    e.stopPropagation()
    // No preventDefault here so textareas can still gain focus if clicked directly
    setSelectedId(ann.id)
    dragRef.current = {
      annotationId: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: ann.x,
      origY: ann.y,
      mode: 'drag'
    }
  }

  const handleResizeStart = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      annotationId: ann.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: ann.x,
      origY: ann.y,
      mode: 'resize',
      origW: ann.width || 10,
      origH: ann.height || 5
    }
  }

  // Save changes via pdf-lib
  const handleSave = async () => {
    if (!file) return
    setIsProcessing(true)
    setLoadingMsg('Saving edits to PDF...')

    try {
      const fileData = await window.api.readFile(file.path)
      if (!fileData.success) throw new Error(fileData.error)

      const pdfDoc = await PDFDocument.load(fileData.data!)
      const pdfPages = pdfDoc.getPages()
      const form = pdfDoc.getForm()

      const hexToRgb = (hexStr?: string) => {
        if (!hexStr || hexStr === 'transparent') return rgb(0, 0, 0)
        const clean = hexStr.replace('#', '')
        const r = parseInt(clean.substring(0, 2), 16) / 255
        const g = parseInt(clean.substring(2, 4), 16) / 255
        const b = parseInt(clean.substring(4, 6), 16) / 255
        return rgb(r, g, b)
      }

      for (const ann of annotations) {
        if (ann.pageIndex >= pdfPages.length) continue
        const page = pdfPages[ann.pageIndex]
        const { width, height } = page.getSize()

        if (ann.type === 'text') {
          const actualX = (ann.x / 100) * width
          const actualY = height - (ann.y / 100) * height - (ann.fontSize || 12)
          page.drawText(ann.text || '', {
            x: actualX,
            y: actualY,
            size: ann.fontSize || 12,
            color: hexToRgb(ann.color)
          })
        } else if (ann.type === 'rectangle' || ann.type === 'highlight' || ann.type === 'cloud') {
          const actualX = (ann.x / 100) * width
          const actualY = height - ((ann.y + (ann.height || 0)) / 100) * height
          const actualWidth = ((ann.width || 0) / 100) * width
          const actualHeight = ((ann.height || 0) / 100) * height

          page.drawRectangle({
            x: actualX,
            y: actualY,
            width: actualWidth,
            height: actualHeight,
            color: ann.type === 'highlight' ? rgb(1, 0.95, 0.4) : undefined,
            borderColor: ann.strokeColor ? hexToRgb(ann.strokeColor) : undefined,
            borderWidth: ann.strokeWidth || 1,
            opacity: ann.type === 'highlight' ? 0.4 : 1
          })
        } else if (ann.type === 'stamp') {
          const actualX = (ann.x / 100) * width
          const actualY = height - ((ann.y + (ann.height || 0)) / 100) * height
          const actualWidth = ((ann.width || 0) / 100) * width
          const actualHeight = ((ann.height || 0) / 100) * height

          page.drawRectangle({
            x: actualX,
            y: actualY,
            width: actualWidth,
            height: actualHeight,
            color: hexToRgb(ann.color),
            borderColor: hexToRgb(ann.stampColor),
            borderWidth: 2
          })
          page.drawText(ann.stampText || '', {
            x: actualX + 10,
            y: actualY + actualHeight / 3,
            size: 14,
            color: hexToRgb(ann.stampColor)
          })
        } else if (ann.type === 'signature' && ann.imageDataUrl) {
          const imageBytes = await fetch(ann.imageDataUrl).then(res => res.arrayBuffer())
          const image = await pdfDoc.embedPng(imageBytes)
          const actualX = (ann.x / 100) * width
          const actualY = height - ((ann.y + (ann.height || 0)) / 100) * height
          const actualWidth = ((ann.width || 0) / 100) * width
          const actualHeight = ((ann.height || 0) / 100) * height

          page.drawImage(image, {
            x: actualX,
            y: actualY,
            width: actualWidth,
            height: actualHeight
          })
        } else if (ann.type === 'ellipse') {
          const cx = ((ann.x + (ann.width || 0) / 2) / 100) * width
          const cy = height - ((ann.y + (ann.height || 0) / 2) / 100) * height
          const rx = ((ann.width || 0) / 200) * width
          const ry = ((ann.height || 0) / 200) * height
          page.drawEllipse({
            x: cx,
            y: cy,
            xScale: rx,
            yScale: ry,
            borderColor: ann.strokeColor ? hexToRgb(ann.strokeColor) : undefined,
            borderWidth: ann.strokeWidth || 1
          })
        } else if ((ann.type === 'pencil' || ann.type === 'freehand-highlight') && ann.points && ann.points.length > 1) {
          for (let i = 0; i < ann.points.length - 1; i++) {
            const x1 = (ann.points[i].x / 100) * width
            const y1 = height - (ann.points[i].y / 100) * height
            const x2 = (ann.points[i + 1].x / 100) * width
            const y2 = height - (ann.points[i + 1].y / 100) * height
            page.drawLine({
              start: { x: x1, y: y1 },
              end: { x: x2, y: y2 },
              thickness: ann.strokeWidth || 2,
              color: hexToRgb(ann.strokeColor),
              opacity: ann.type === 'freehand-highlight' ? 0.4 : 1
            })
          }
        } else if ((ann.type === 'line' || ann.type === 'arrow' || ann.type === 'arc') && ann.points && ann.points.length === 2) {
          const x1 = (ann.points[0].x / 100) * width
          const y1 = height - (ann.points[0].y / 100) * height
          const x2 = (ann.points[1].x / 100) * width
          const y2 = height - (ann.points[1].y / 100) * height
          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness: ann.strokeWidth || 1,
            color: hexToRgb(ann.strokeColor)
          })
        } else if (ann.type === 'image' && ann.imageDataUrl) {
          try {
            const imgBytes = await fetch(ann.imageDataUrl).then(res => res.arrayBuffer())
            const isJpeg = ann.imageDataUrl.includes('image/jpeg') || ann.imageDataUrl.includes('image/jpg')
            const img = isJpeg ? await pdfDoc.embedJpg(imgBytes) : await pdfDoc.embedPng(imgBytes)
            const actualX = (ann.x / 100) * width
            const actualY = height - ((ann.y + (ann.height || 0)) / 100) * height
            const actualWidth = ((ann.width || 0) / 100) * width
            const actualHeight = ((ann.height || 0) / 100) * height
            page.drawImage(img, { x: actualX, y: actualY, width: actualWidth, height: actualHeight })
          } catch { /* skip invalid images */ }
        } else if (ann.type === 'callout') {
          const actualX = (ann.x / 100) * width
          const actualY = height - (ann.y / 100) * height - (ann.fontSize || 10)
          page.drawText(ann.text || '', {
            x: actualX,
            y: actualY,
            size: ann.fontSize || 10,
            color: hexToRgb(ann.color)
          })
        } else if (ann.type === 'underline' || ann.type === 'strikethrough') {
          const actualX = (ann.x / 100) * width
          const yOffset = ann.type === 'strikethrough' ? (ann.height || 0) / 2 : (ann.height || 0)
          const actualY = height - ((ann.y + yOffset) / 100) * height
          const actualWidth = ((ann.width || 0) / 100) * width
          page.drawLine({
            start: { x: actualX, y: actualY },
            end: { x: actualX + actualWidth, y: actualY },
            thickness: 2,
            color: hexToRgb(ann.strokeColor)
          })
        } else if (ann.type.startsWith('field-')) {
          const actualX = (ann.x / 100) * width
          const actualY = height - ((ann.y + (ann.height || 0)) / 100) * height
          const actualWidth = ((ann.width || 0) / 100) * width
          const actualHeight = ((ann.height || 0) / 100) * height

          if (ann.type === 'field-text' || ann.type === 'field-multiline') {
            const textField = form.createTextField(`text_${ann.id}`)
            textField.setText(ann.text || '')
            textField.addToPage(page, { x: actualX, y: actualY, width: actualWidth, height: actualHeight })
          } else if (ann.type === 'field-checkbox') {
            const cb = form.createCheckBox(`cb_${ann.id}`)
            cb.addToPage(page, { x: actualX, y: actualY, width: Math.min(actualWidth, 20), height: Math.min(actualHeight, 20) })
          }
        }
      }

      const pdfBytes = await pdfDoc.save()
      const saveRes = await window.api.saveFileFromBuffer(pdfBytes, `Edited_${file.name}`)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('Edited PDF saved successfully!')
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      toast.error(`Error saving edits: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!file) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto w-full space-y-8 pb-12">
          <header>
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit PDF</h1>
            <p className="text-muted">Full PDF Editor with Annotations, Shapes, Stamps, Typography, and Forms.</p>
          </header>
          <Dropzone onFileSelect={handleFileSelect} accept=".pdf" multiple={false} />
        </div>
      </div>
    )
  }

  const selectedAnnotation = annotations.find(a => a.id === selectedId)

  return (
    <div className="flex h-full flex-col bg-secondary overflow-hidden text-foreground">
      {/* Top Navbar Header */}
      <div className="bg-background border-b border-border flex flex-col shrink-0">
        <div className="h-12 px-6 flex items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-3">
            <button onClick={() => setFile(null)} className="p-1.5 text-muted hover:text-foreground rounded-lg hover:bg-secondary">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              <span className="font-semibold text-sm truncate max-w-[200px]">{file.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 text-muted hover:text-foreground disabled:opacity-30">
              <Undo2 className="w-4 h-4" />
            </button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 text-muted hover:text-foreground disabled:opacity-30">
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={deleteSelected} disabled={!selectedId} className="p-1.5 text-danger hover:bg-danger/10 rounded disabled:opacity-30">
              <Trash2 className="w-4 h-4" />
            </button>
            <PrimaryButton onClick={handleSave} className="ml-2 py-1.5 text-sm">
              <Save className="w-4 h-4 mr-1.5" /> Save Changes
            </PrimaryButton>
          </div>
        </div>

        {/* Tab Header Selector (Annotate | Shapes | Insert | Edit Text | Forms) */}
        <div className="flex items-center px-6 h-11 border-b border-border bg-secondary/20 text-sm overflow-x-auto gap-4">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 rounded ${activeTool === 'select' ? 'bg-accent text-white' : 'text-muted hover:text-foreground'}`}
            title="Select Mode"
          >
            <MousePointer className="w-4 h-4" />
          </button>
          {(['annotate', 'shapes', 'insert', 'edit-text', 'forms'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 font-medium capitalize rounded-md transition-colors ${
                activeTab === tab ? 'bg-accent/10 text-accent font-semibold' : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Sub-Toolbar (Matches Images 1-5 exactly) */}
        <div className="flex items-center px-6 h-10 bg-secondary/50 text-xs overflow-x-auto gap-1 border-b border-border">
          {/* ANNOTATE SUB-TOOLBAR (Image 1) */}
          {activeTab === 'annotate' && (
            <>
              <button onClick={() => setActiveTool('text')} className={`p-1.5 rounded ${activeTool === 'text' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Text Box">
                <Type className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('highlight')} className={`p-1.5 rounded ${activeTool === 'highlight' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Highlight">
                <Highlighter className="w-4 h-4 text-amber-500" />
              </button>
              <button onClick={() => setActiveTool('underline')} className={`p-1.5 rounded ${activeTool === 'underline' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Underline">
                <Underline className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('strikethrough')} className={`p-1.5 rounded ${activeTool === 'strikethrough' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Strikethrough">
                <Strikethrough className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('pencil')} className={`p-1.5 rounded ${activeTool === 'pencil' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Pencil Draw">
                <PenTool className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('freehand-highlight')} className={`p-1.5 rounded ${activeTool === 'freehand-highlight' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Freehand Highlight">
                <Highlighter className="w-4 h-4 text-yellow-400" />
              </button>
              <button onClick={() => setActiveTool('callout')} className={`p-1.5 rounded ${activeTool === 'callout' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Text Callout">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('note')} className={`p-1.5 rounded ${activeTool === 'note' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Sticky Note">
                <StickyNote className="w-4 h-4 text-amber-400" />
              </button>
              <button onClick={() => setActiveTool('link')} className={`p-1.5 rounded ${activeTool === 'link' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Add Link">
                <LinkIcon className="w-4 h-4" />
              </button>
            </>
          )}

          {/* SHAPES SUB-TOOLBAR (Image 2) */}
          {activeTab === 'shapes' && (
            <>
              <button onClick={() => setActiveTool('rectangle')} className={`p-1.5 rounded ${activeTool === 'rectangle' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Rectangle">
                <Square className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('ellipse')} className={`p-1.5 rounded ${activeTool === 'ellipse' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Ellipse">
                <Circle className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('arc')} className={`p-1.5 rounded ${activeTool === 'arc' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Arc">
                <Spline className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('polygon')} className={`p-1.5 rounded ${activeTool === 'polygon' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Polygon">
                <Hexagon className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('cloud')} className={`p-1.5 rounded ${activeTool === 'cloud' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Cloud Shape">
                <Cloud className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('line')} className={`p-1.5 rounded ${activeTool === 'line' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Line">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('arrow')} className={`p-1.5 rounded ${activeTool === 'arrow' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Arrow">
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* INSERT SUB-TOOLBAR (Image 3) */}
          {activeTab === 'insert' && (
            <>
              <button onClick={() => setActiveTool('stamp')} className={`flex items-center gap-1 px-2 py-1 rounded ${activeTool === 'stamp' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`}>
                <Stamp className="w-4 h-4" /> Stamps
              </button>
              <button onClick={() => setIsSigModalOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-background">
                <PenTool className="w-4 h-4" /> Signature
              </button>
              <button onClick={() => setActiveTool('attachment')} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-background">
                <Paperclip className="w-4 h-4" /> Attach File
              </button>
              <button onClick={handleInsertImage} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-background">
                <ImageIcon className="w-4 h-4" /> Image
              </button>
            </>
          )}

          {/* EDIT TEXT SUB-TOOLBAR (Image 4) */}
          {activeTab === 'edit-text' && (
            <>
              <button onClick={() => setActiveTool('text')} className="flex items-center gap-1 px-2 py-1 bg-accent text-white rounded font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Paragraph
              </button>
            </>
          )}

          {/* FORMS SUB-TOOLBAR (Image 5) */}
          {activeTab === 'forms' && (
            <>
              <button onClick={() => setActiveTool('field-signature')} className={`p-1.5 rounded ${activeTool === 'field-signature' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Signature Field">
                <PenTool className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('field-text')} className={`p-1.5 rounded ${activeTool === 'field-text' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Text Field">
                <Type className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('field-checkbox')} className={`p-1.5 rounded ${activeTool === 'field-checkbox' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Checkbox">
                <CheckSquare className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('field-radio')} className={`p-1.5 rounded ${activeTool === 'field-radio' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="Radio Button">
                <Radio className="w-4 h-4" />
              </button>
              <button onClick={() => setActiveTool('field-listbox')} className={`p-1.5 rounded ${activeTool === 'field-listbox' ? 'bg-accent/20 text-accent' : 'hover:bg-background'}`} title="List Box">
                <List className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Right Stroke/Color Selector on Sub-toolbar */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted">Color:</span>
            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-5 h-5 rounded border-none cursor-pointer" />
            <span className="text-[11px] text-muted">Stroke:</span>
            <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="w-5 h-5 rounded border-none cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Main Container with 3 Columns (Left Drawer | PDF Workspace | Right Inspector) */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* LEFT CONTEXTUAL DRAWER (Stamps for Insert, Paragraph tools for Edit Text) */}
        {activeTab === 'insert' && (
          <div className="w-64 bg-background border-r border-border p-4 overflow-y-auto space-y-3 shrink-0 scrollbar-thin">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Standard Stamps</h3>
            <div className="space-y-2">
              {STANDARD_STAMPS.map(stamp => (
                <button
                  key={stamp.text}
                  onClick={() => handlePlaceStamp(stamp)}
                  className="w-full text-left px-3 py-2 rounded-lg font-bold text-xs border transition-all hover:scale-[1.02]"
                  style={{ color: stamp.color, backgroundColor: stamp.bg, borderColor: stamp.color }}
                >
                  {stamp.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'edit-text' && (
          <div className="w-64 bg-background border-r border-border p-4 overflow-y-auto space-y-4 shrink-0 scrollbar-thin">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Add Paragraph Tool</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Font & Size</label>
                <div className="flex gap-2">
                  <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="flex-1 text-xs bg-secondary border border-border rounded p-1.5">
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times-Roman">Times Roman</option>
                    <option value="Courier">Courier</option>
                  </select>
                  <input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-14 text-xs bg-secondary border border-border rounded p-1.5" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Formatting</label>
                <div className="flex gap-1 bg-secondary p-1 rounded">
                  <button onClick={() => setIsBold(!isBold)} className={`p-1.5 rounded flex-1 flex justify-center ${isBold ? 'bg-background shadow' : ''}`}><Bold className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setIsItalic(!isItalic)} className={`p-1.5 rounded flex-1 flex justify-center ${isItalic ? 'bg-background shadow' : ''}`}><Italic className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Alignment</label>
                <div className="flex gap-1 bg-secondary p-1 rounded">
                  <button onClick={() => setTextAlign('left')} className={`p-1.5 rounded flex-1 flex justify-center ${textAlign === 'left' ? 'bg-background shadow' : ''}`}><AlignLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setTextAlign('center')} className={`p-1.5 rounded flex-1 flex justify-center ${textAlign === 'center' ? 'bg-background shadow' : ''}`}><AlignCenter className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setTextAlign('right')} className={`p-1.5 rounded flex-1 flex justify-center ${textAlign === 'right' ? 'bg-background shadow' : ''}`}><AlignRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted block mb-1">Color Palette</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_SWATCHES.map(color => (
                    <button key={color} onClick={() => setTextColor(color)} className="w-full aspect-square rounded border border-border" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thumbnail Sidebar (default left side when no special tab drawer) */}
        {activeTab !== 'insert' && activeTab !== 'edit-text' && (
          <div className="w-48 bg-background border-r border-border p-3 overflow-y-auto space-y-3 shrink-0 scrollbar-thin">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">Pages</h3>
            {pages.map((p, i) => (
              <div
                key={i}
                onClick={() => setActivePageIndex(i)}
                className={`relative cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${activePageIndex === i ? 'border-accent ring-2 ring-accent/20' : 'border-transparent hover:border-border'}`}
              >
                <img src={p.canvasUrl} alt={`Page ${i + 1}`} className="w-full h-auto" />
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1 rounded">{i + 1}</div>
              </div>
            ))}
          </div>
        )}

        {/* Center Editor PDF Workspace */}
        <div className="flex-1 overflow-auto bg-secondary/50 p-8 flex justify-center items-start scrollbar-thin">
          {pages.length > 0 && pages[activePageIndex] && (
            <div
              ref={canvasContainerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f && f.type.startsWith('image/')) {
                  const reader = new FileReader()
                  reader.onload = () => {
                    const rect = canvasContainerRef.current!.getBoundingClientRect()
                    const x = ((e.clientX - rect.left) / rect.width) * 100
                    const y = ((e.clientY - rect.top) / rect.height) * 100
                    const newAnn: Annotation = {
                      id: Math.random().toString(36).substring(2, 9),
                      pageIndex: activePageIndex,
                      type: 'image',
                      x: Math.max(0, Math.min(100, x)),
                      y: Math.max(0, Math.min(100, y)),
                      width: 30,
                      height: 25,
                      imageDataUrl: reader.result as string
                    }
                    pushState([...annotations, newAnn])
                    setSelectedId(newAnn.id)
                  }
                  reader.readAsDataURL(f)
                }
              }}
              className={`relative shadow-2xl bg-white select-none ${activeTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{
                width: '100%',
                maxWidth: '800px',
                aspectRatio: `${pages[activePageIndex].width} / ${pages[activePageIndex].height}`
              }}
            >
              <img src={pages[activePageIndex].canvasUrl} alt="Active Page" className="w-full h-full object-contain pointer-events-none" />

              {/* Render Positioned Annotations (everything except pencil/freehand paths and line/arrow) */}
              {annotations
                .filter(ann => ann.pageIndex === activePageIndex && !['pencil', 'freehand-highlight', 'line', 'arrow', 'arc'].includes(ann.type))
                .map(ann => (
                  <div
                    key={ann.id}
                    onMouseDown={e => handleAnnotationDragStart(e, ann)}
                    onClick={e => { e.stopPropagation(); setSelectedId(ann.id) }}
                    className={`absolute group ${selectedId === ann.id ? 'ring-2 ring-accent z-20' : 'z-10'} ${activeTool === 'select' ? 'cursor-move' : ''}`}
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                      width: ann.width ? `${ann.width}%` : undefined,
                      height: ann.height ? `${ann.height}%` : undefined
                    }}
                  >
                    {/* TEXT */}
                    {ann.type === 'text' && (
                      <textarea
                        value={ann.text || ''}
                        onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-full bg-blue-50/20 border border-blue-300/40 outline-none resize-none p-1 rounded"
                        style={{
                          fontSize: `${ann.fontSize || 12}px`,
                          color: ann.color || '#000',
                          textAlign: ann.align || 'left',
                          fontWeight: ann.isBold ? 'bold' : 'normal',
                          fontStyle: ann.isItalic ? 'italic' : 'normal'
                        }}
                      />
                    )}
                    {/* CALLOUT */}
                    {ann.type === 'callout' && (
                      <div className="w-full h-full bg-amber-50 border border-amber-400 rounded shadow-sm p-1">
                        <textarea
                          value={ann.text || 'Callout'}
                          onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
                          onMouseDown={e => e.stopPropagation()}
                          className="w-full h-full bg-transparent outline-none resize-none text-xs"
                          style={{ color: ann.color || '#000' }}
                        />
                      </div>
                    )}
                    {/* RECTANGLE */}
                    {ann.type === 'rectangle' && (
                      <div className="w-full h-full" style={{ backgroundColor: ann.color || 'transparent', border: `${ann.strokeWidth || 1}px solid ${ann.strokeColor || '#dc2626'}` }} />
                    )}
                    {/* ELLIPSE */}
                    {ann.type === 'ellipse' && (
                      <div className="w-full h-full rounded-full" style={{ backgroundColor: ann.color || 'transparent', border: `${ann.strokeWidth || 1}px solid ${ann.strokeColor || '#dc2626'}` }} />
                    )}
                    {/* CLOUD */}
                    {ann.type === 'cloud' && (
                      <div className="w-full h-full rounded-2xl" style={{ border: `${ann.strokeWidth || 1}px dashed ${ann.strokeColor || '#dc2626'}` }} />
                    )}
                    {/* POLYGON */}
                    {ann.type === 'polygon' && (
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon points="50,5 95,35 80,95 20,95 5,35" fill="none" stroke={ann.strokeColor || '#dc2626'} strokeWidth={ann.strokeWidth || 1} vectorEffect="non-scaling-stroke" />
                      </svg>
                    )}
                    {/* HIGHLIGHT */}
                    {ann.type === 'highlight' && (
                      <div className="w-full h-full rounded-sm" style={{ backgroundColor: '#fef08a', opacity: 0.4 }} />
                    )}
                    {/* UNDERLINE */}
                    {ann.type === 'underline' && (
                      <div className="w-full h-full flex items-end"><div className="w-full" style={{ borderBottom: `2px solid ${ann.strokeColor || '#dc2626'}` }} /></div>
                    )}
                    {/* STRIKETHROUGH */}
                    {ann.type === 'strikethrough' && (
                      <div className="w-full h-full flex items-center"><div className="w-full" style={{ borderBottom: `2px solid ${ann.strokeColor || '#dc2626'}` }} /></div>
                    )}
                    {/* SQUIGGLY */}
                    {ann.type === 'squiggly' && (
                      <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                        <path d="M0,15 Q5,5 10,15 Q15,25 20,15 Q25,5 30,15 Q35,25 40,15 Q45,5 50,15 Q55,25 60,15 Q65,5 70,15 Q75,25 80,15 Q85,5 90,15 Q95,25 100,15" fill="none" stroke={ann.strokeColor || '#dc2626'} strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      </svg>
                    )}
                    {/* STAMP */}
                    {ann.type === 'stamp' && (
                      <div className="w-full h-full flex items-center justify-center font-bold text-sm rounded border-2 uppercase tracking-wider" style={{ color: ann.stampColor, backgroundColor: ann.color, borderColor: ann.stampColor }}>
                        {ann.stampText}
                      </div>
                    )}
                    {/* SIGNATURE */}
                    {ann.type === 'signature' && ann.imageDataUrl && (
                      <img src={ann.imageDataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                    )}
                    {/* IMAGE */}
                    {ann.type === 'image' && ann.imageDataUrl && (
                      <img src={ann.imageDataUrl} alt="Inserted" className="w-full h-full object-contain pointer-events-none" />
                    )}
                    {/* NOTE */}
                    {ann.type === 'note' && (
                      <div className="w-8 h-8 bg-amber-300 rounded shadow-md flex items-center justify-center" title={ann.text || 'Note'}>
                        <StickyNote className="w-4 h-4 text-amber-800" />
                      </div>
                    )}
                    {/* FORM: CHECKBOX */}
                    {ann.type === 'field-checkbox' && (
                      <input type="checkbox" className="w-5 h-5 accent-accent" />
                    )}
                    {/* FORM: RADIO */}
                    {ann.type === 'field-radio' && (
                      <input type="radio" className="w-5 h-5 accent-accent" />
                    )}
                    {/* FORM: TEXT */}
                    {ann.type === 'field-text' && (
                      <input type="text" value={ann.text || ''} onChange={e => updateAnnotation(ann.id, { text: e.target.value })} onMouseDown={e => e.stopPropagation()} className="w-full h-full border border-blue-400 px-2 text-xs bg-blue-50/30" />
                    )}
                    {/* FORM: MULTILINE */}
                    {ann.type === 'field-multiline' && (
                      <textarea value={ann.text || ''} onChange={e => updateAnnotation(ann.id, { text: e.target.value })} onMouseDown={e => e.stopPropagation()} className="w-full h-full border border-blue-400 px-2 text-xs bg-blue-50/30 resize-none" />
                    )}
                    {/* FORM: LISTBOX / COMBOBOX */}
                    {(ann.type === 'field-listbox' || ann.type === 'field-combobox') && (
                      <select className="w-full h-full border border-blue-400 px-1 text-xs bg-blue-50/30"><option>{ann.text || 'Option'}</option></select>
                    )}
                    {/* RESIZE HANDLE (bottom-right corner) */}
                    {selectedId === ann.id && ann.width && ann.height && (
                      <div
                        onMouseDown={e => handleResizeStart(e, ann)}
                        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-accent border border-white rounded-sm cursor-nwse-resize z-30 shadow-sm"
                      />
                    )}
                    {/* DRAG HANDLE (top-left corner) for easier dragging of full-size elements like textareas */}
                    {selectedId === ann.id && (
                      <div
                        onMouseDown={e => handleAnnotationDragStart(e, ann)}
                        className="absolute -top-3 -left-3 w-6 h-6 bg-accent border-2 border-white rounded-full cursor-move z-30 shadow-md flex items-center justify-center text-white opacity-80 hover:opacity-100"
                        title="Drag to move"
                      >
                        <MousePointer className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}

              {/* SVG overlay for path-based annotations (pencil, freehand, line, arrow) + live drawing preview */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                {/* Pencil & Freehand-Highlight strokes */}
                {annotations
                  .filter(a => a.pageIndex === activePageIndex && (a.type === 'pencil' || a.type === 'freehand-highlight') && a.points && a.points.length > 1)
                  .map(ann => (
                    <polyline
                      key={ann.id}
                      points={ann.points!.map(p => `${p.x}%,${p.y}%`).join(' ')}
                      fill="none"
                      stroke={ann.strokeColor || '#000'}
                      strokeWidth={ann.strokeWidth || 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={ann.type === 'freehand-highlight' ? 0.4 : 1}
                    />
                  ))}
                {/* Line / Arrow / Arc annotations */}
                {annotations
                  .filter(a => a.pageIndex === activePageIndex && ['line', 'arrow', 'arc'].includes(a.type) && a.points && a.points.length === 2)
                  .map(ann => (
                    <g key={ann.id}>
                      {ann.type === 'arrow' && (
                        <defs>
                          <marker id={`ah-${ann.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill={ann.strokeColor || '#dc2626'} />
                          </marker>
                        </defs>
                      )}
                      <line
                        x1={`${ann.points![0].x}%`}
                        y1={`${ann.points![0].y}%`}
                        x2={`${ann.points![1].x}%`}
                        y2={`${ann.points![1].y}%`}
                        stroke={ann.strokeColor || '#dc2626'}
                        strokeWidth={ann.strokeWidth || 2}
                        markerEnd={ann.type === 'arrow' ? `url(#ah-${ann.id})` : undefined}
                      />
                    </g>
                  ))}
                {/* Live pencil/freehand drawing preview */}
                {isDrawing && (activeTool === 'pencil' || activeTool === 'freehand-highlight') && currentPath.length > 1 && (
                  <polyline
                    points={currentPath.map(p => `${p.x}%,${p.y}%`).join(' ')}
                    fill="none"
                    stroke={activeTool === 'freehand-highlight' ? '#fef08a' : strokeColor}
                    strokeWidth={activeTool === 'freehand-highlight' ? 8 : strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={activeTool === 'freehand-highlight' ? 0.4 : 1}
                  />
                )}
                {/* Live line/arrow drawing preview */}
                {isDrawing && shapeStart && shapeEnd && ['line', 'arrow', 'arc'].includes(activeTool) && (
                  <line
                    x1={`${shapeStart.x}%`} y1={`${shapeStart.y}%`}
                    x2={`${shapeEnd.x}%`} y2={`${shapeEnd.y}%`}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray="4 4"
                  />
                )}
              </svg>

              {/* Live shape drawing preview (rectangles, ellipses, highlights, etc.) */}
              {isDrawing && shapeStart && shapeEnd && !['line', 'arrow', 'arc'].includes(activeTool) && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${Math.min(shapeStart.x, shapeEnd.x)}%`,
                    top: `${Math.min(shapeStart.y, shapeEnd.y)}%`,
                    width: `${Math.abs(shapeEnd.x - shapeStart.x)}%`,
                    height: `${Math.abs(shapeEnd.y - shapeStart.y)}%`,
                    zIndex: 5
                  }}
                >
                  {activeTool === 'rectangle' && <div className="w-full h-full border-2 border-dashed" style={{ borderColor: strokeColor }} />}
                  {activeTool === 'ellipse' && <div className="w-full h-full rounded-full border-2 border-dashed" style={{ borderColor: strokeColor }} />}
                  {activeTool === 'cloud' && <div className="w-full h-full rounded-2xl border-2 border-dashed" style={{ borderColor: strokeColor }} />}
                  {activeTool === 'polygon' && <div className="w-full h-full border-2 border-dashed" style={{ borderColor: strokeColor }} />}
                  {activeTool === 'highlight' && <div className="w-full h-full bg-yellow-300/40 rounded-sm" />}
                  {(activeTool === 'underline' || activeTool === 'strikethrough' || activeTool === 'squiggly') && (
                    <div className="w-full h-full flex items-end"><div className="w-full border-b-2 border-dashed" style={{ borderColor: strokeColor }} /></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT CONTEXTUAL INSPECTOR (Text Styles or Form Fields List) */}
        {activeTab === 'edit-text' && selectedAnnotation && (
          <div className="w-64 bg-background border-l border-border p-4 overflow-y-auto space-y-4 shrink-0 scrollbar-thin">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Text Styles</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted block mb-1">Text Content</label>
                <input
                  type="text"
                  value={selectedAnnotation.text || ''}
                  onChange={e => updateAnnotation(selectedAnnotation.id, { text: e.target.value })}
                  className="w-full text-xs bg-secondary border border-border rounded p-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Font Size</label>
                <input
                  type="number"
                  value={selectedAnnotation.fontSize || 12}
                  onChange={e => updateAnnotation(selectedAnnotation.id, { fontSize: Number(e.target.value) })}
                  className="w-full text-xs bg-secondary border border-border rounded p-2"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Color</label>
                <input
                  type="color"
                  value={selectedAnnotation.color || '#000000'}
                  onChange={e => updateAnnotation(selectedAnnotation.id, { color: e.target.value })}
                  className="w-full h-8 rounded border border-border cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'forms' && (
          <div className="w-64 bg-background border-l border-border p-4 overflow-y-auto shrink-0 scrollbar-thin">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Form Field List ({annotations.filter(a => a.type.startsWith('field-')).length})</h3>
            <div className="space-y-2">
              {annotations.filter(a => a.type.startsWith('field-')).map(field => (
                <div key={field.id} className="p-2 bg-secondary border border-border rounded text-xs flex justify-between items-center">
                  <span className="font-medium truncate">{field.text || field.type}</span>
                  <button onClick={() => deleteSelected()} className="text-danger hover:opacity-80"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              {annotations.filter(a => a.type.startsWith('field-')).length === 0 && (
                <p className="text-xs text-muted text-center py-8">This document has no form fields added.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {isSigModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-bold text-lg text-foreground">Add Signature</h3>
            <input
              type="text"
              placeholder="Type your signature..."
              value={typedSig}
              onChange={e => setTypedSig(e.target.value)}
              className="w-full p-2.5 border border-border rounded bg-secondary text-foreground outline-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsSigModalOpen(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground">Cancel</button>
              <PrimaryButton
                onClick={() => {
                  const canvas = document.createElement('canvas')
                  canvas.width = 300
                  canvas.height = 100
                  const ctx = canvas.getContext('2d')!
                  ctx.fillStyle = 'white'
                  ctx.fillRect(0, 0, 300, 100)
                  ctx.font = '32px cursive'
                  ctx.fillStyle = 'black'
                  ctx.fillText(typedSig || 'Signature', 20, 60)
                  handleAddSignature(canvas.toDataURL())
                }}
              >
                Add Signature
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <ProgressModal isOpen={isProcessing} title="Editing PDF" status={loadingMsg} />
    </div>
  )
}
