import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { cn } from '../lib/utils'
import { toast } from 'sonner'
import { PdfPageHoverTooltip } from './PdfPageHoverTooltip'

export interface PdfPageInfo {
  id: string
  pageNumber: number
  pdfDocument: pdfjsLib.PDFDocumentProxy
  rotation?: number
  fileName?: string
  totalDocumentPages?: number
}

export interface PageThumbnailProps {
  pageInfo: PdfPageInfo
  selected?: boolean
  onClick?: () => void
  disabledTooltip?: boolean
  className?: string
  showPageNumber?: boolean
}

export function PageThumbnail({
  pageInfo,
  selected,
  onClick,
  disabledTooltip = false,
  className,
  showPageNumber = true,
}: PageThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const hoverTimerRef = useRef<any>(null)

  useEffect(() => {
    let renderTask: pdfjsLib.RenderTask | null = null

    const renderPage = async () => {
      try {
        const page = await pageInfo.pdfDocument.getPage(pageInfo.pageNumber)
        // Use intrinsic rotation only for rendering
        const viewport = page.getViewport({ scale: 1.0 })
        const canvas = canvasRef.current
        if (!canvas) return

        // Scale to a reasonable thumbnail size (e.g., width 160px)
        const scale = 160 / viewport.width
        const scaledViewport = page.getViewport({ scale })

        canvas.width = scaledViewport.width
        canvas.height = scaledViewport.height
        
        const context = canvas.getContext('2d')
        if (!context) return

        renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        } as any)
        
        await renderTask.promise
        setLoading(false)
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || err instanceof pdfjsLib.RenderingCancelledException) {
          // Ignore cancelled exceptions
        } else {
          console.error("Error rendering thumbnail:", err)
          toast.error(`Thumbnail Error: ${err?.message || String(err)}`)
        }
      }
    }

    renderPage()

    return () => {
      if (renderTask) {
        try {
          renderTask.cancel()
        } catch {}
      }
    }
  }, [pageInfo.pageNumber, pageInfo.pdfDocument])

  // Handle hover tooltip with subtle delay to prevent flicker during fast mouse sweeps
  const handleMouseEnter = () => {
    if (disabledTooltip) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      if (containerRef.current) {
        setAnchorRect(containerRef.current.getBoundingClientRect())
        setIsHovered(true)
      }
    }, 200)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setIsHovered(false)
  }

  // Dismiss tooltip on window scroll or unmount
  useEffect(() => {
    const handleScroll = () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      setIsHovered(false)
    }
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  // If disabledTooltip changes to true (e.g. on drag start), close tooltip
  useEffect(() => {
    if (disabledTooltip) {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
      setIsHovered(false)
    }
  }, [disabledTooltip])

  return (
    <>
      <div 
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative flex flex-col items-center p-2 rounded-lg border-2 transition-all cursor-pointer bg-elevated shadow-sm select-none",
          selected ? "border-accent ring-2 ring-accent/20" : "border-border hover:border-accent/50",
          className
        )}
        onClick={onClick}
      >
        <div className="relative w-full aspect-square bg-secondary/10 rounded flex items-center justify-center overflow-hidden">
          {loading && <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 animate-pulse" />}
          <canvas 
            ref={canvasRef} 
            className="block max-w-full max-h-full object-contain shadow-sm transition-transform duration-300" 
            style={{ transform: `rotate(${pageInfo.rotation || 0}deg)` }}
          />
        </div>
        {showPageNumber && (
          <div className="mt-2 text-xs text-muted font-medium truncate max-w-full">
            Page {pageInfo.pageNumber}
          </div>
        )}
      </div>

      <PdfPageHoverTooltip
        pageInfo={pageInfo}
        anchorRect={anchorRect}
        visible={isHovered && !disabledTooltip}
      />
    </>
  )
}

interface PageThumbnailGridProps {
  pages: PdfPageInfo[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
  onReorder?: (startIndex: number, endIndex: number) => void
  disabledTooltip?: boolean
}

export function PageThumbnailGrid({ pages, selectedIds, onToggleSelect, disabledTooltip }: PageThumbnailGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-4">
      {pages.map((page) => (
        <PageThumbnail 
          key={page.id} 
          pageInfo={page} 
          selected={selectedIds.includes(page.id)}
          onClick={() => onToggleSelect(page.id)}
          disabledTooltip={disabledTooltip}
        />
      ))}
    </div>
  )
}
