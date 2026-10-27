import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as pdfjsLib from 'pdfjs-dist'
import { ZoomIn, FileText, Loader2 } from 'lucide-react'

export interface TooltipPageInfo {
  id: string
  pageNumber: number
  pdfDocument: pdfjsLib.PDFDocumentProxy
  rotation?: number
  fileName?: string
  totalDocumentPages?: number
}

// Module-level cache so we never re-render the same page twice on hover
const previewCache = new Map<string, string>()

interface PdfPageHoverTooltipProps {
  pageInfo: TooltipPageInfo
  anchorRect: DOMRect | null
  visible: boolean
}

export function PdfPageHoverTooltip({ pageInfo, anchorRect, visible }: PdfPageHoverTooltipProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height?: number } | null>(null)
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null)

  // Calculate position relative to anchor element
  useEffect(() => {
    if (!visible || !anchorRect) {
      setCoords(null)
      return
    }

    const margin = 12
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight

    // Desired tooltip dimensions
    const tooltipWidth = Math.min(380, viewportW - 32)
    const estimatedHeight = Math.min(500, viewportH - 32)

    let top = 0
    let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2

    // Check vertical space (prefer above, then below, then centered)
    if (anchorRect.top >= estimatedHeight + margin) {
      top = anchorRect.top - estimatedHeight - margin
    } else if (viewportH - anchorRect.bottom >= estimatedHeight + margin) {
      top = anchorRect.bottom + margin
    } else {
      // Place adjacent or centered vertically
      top = Math.max(16, Math.min(viewportH - estimatedHeight - 16, anchorRect.top + (anchorRect.height - estimatedHeight) / 2))
      if (anchorRect.left >= tooltipWidth + margin) {
        left = anchorRect.left - tooltipWidth - margin
      } else if (viewportW - anchorRect.right >= tooltipWidth + margin) {
        left = anchorRect.right + margin
      }
    }

    // Clamp inside viewport
    left = Math.max(16, Math.min(viewportW - tooltipWidth - 16, left))
    top = Math.max(16, Math.min(viewportH - estimatedHeight - 16, top))

    setCoords({ top, left, width: tooltipWidth })
  }, [visible, anchorRect])

  // Render high-resolution page preview on demand
  useEffect(() => {
    if (!visible) {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
      }
      return
    }

    const cacheKey = `${pageInfo.id}-${pageInfo.pageNumber}`
    if (previewCache.has(cacheKey)) {
      setPreviewUrl(previewCache.get(cacheKey)!)
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)

    const renderHighRes = async () => {
      try {
        const page = await pageInfo.pdfDocument.getPage(pageInfo.pageNumber)
        if (!isMounted) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        // High resolution target width (~400px)
        const targetWidth = 420
        const scale = Math.max(1.3, targetWidth / unscaledViewport.width)
        const viewport = page.getViewport({ scale })

        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const context = canvas.getContext('2d')

        if (context) {
          context.fillStyle = '#ffffff'
          context.fillRect(0, 0, canvas.width, canvas.height)

          const task = page.render({
            canvasContext: context,
            viewport,
          } as any)
          renderTaskRef.current = task
          await task.promise

          if (isMounted) {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
            previewCache.set(cacheKey, dataUrl)
            setPreviewUrl(dataUrl)
            setLoading(false)
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Failed to render hover preview:', err)
        }
        if (isMounted) setLoading(false)
      }
    }

    renderHighRes()

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {}
      }
    }
  }, [visible, pageInfo.id, pageInfo.pageNumber, pageInfo.pdfDocument])

  if (!visible || !coords) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: coords.top,
          left: coords.left,
          width: coords.width,
        }}
        className="z-[999999] pointer-events-none p-3.5 rounded-2xl bg-zinc-900/95 text-zinc-100 border border-zinc-700/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-md flex flex-col gap-2.5"
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full border-b border-zinc-800 pb-2 px-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="bg-accent/25 text-accent-light px-2.5 py-0.5 rounded-full font-semibold text-xs flex items-center gap-1 shrink-0">
              <ZoomIn className="w-3 h-3" />
              Page {pageInfo.pageNumber}
              {pageInfo.totalDocumentPages ? ` of ${pageInfo.totalDocumentPages}` : ''}
            </span>
            {pageInfo.fileName && (
              <span className="text-xs text-zinc-400 truncate max-w-[200px]" title={pageInfo.fileName}>
                {pageInfo.fileName}
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase px-2 py-0.5 rounded bg-zinc-800/80 shrink-0">
            Large Preview
          </span>
        </div>

        {/* Page Preview Image Display */}
        <div className="relative w-full min-h-[220px] max-h-[420px] rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-center overflow-hidden p-2">
          {loading && !previewUrl ? (
            <div className="flex flex-col items-center gap-2 text-zinc-400 py-12">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <span className="text-xs font-medium">Rendering page content...</span>
            </div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={`Page ${pageInfo.pageNumber} preview`}
              className="max-h-[400px] w-auto max-w-full object-contain shadow-lg rounded bg-white transition-transform duration-200"
              style={{ transform: `rotate(${pageInfo.rotation || 0}deg)` }}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-400 py-12">
              <FileText className="w-8 h-8 opacity-40" />
              <span className="text-xs">Preview unavailable</span>
            </div>
          )}
        </div>

        {/* Subtitle Hint */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-0.5">
          <span>Move mouse away to close</span>
          {pageInfo.rotation ? <span>Rotated {pageInfo.rotation}°</span> : null}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
