import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fs from 'fs'
import path from 'path'
import os from 'os'

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
  color: string // hex format e.g. '#facc15'
  strokeWidth?: number // in px
  opacity?: number // 0-1
  points?: AnnotationPoint[]
  text?: string
  fontSize?: number
}

export interface SaveAnnotatedPdfOptions {
  originalPath: string
  annotations: ViewerAnnotation[]
  outputPath?: string
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '#000000').replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) / 255
    const g = parseInt(clean[1] + clean[1], 16) / 255
    const b = parseInt(clean[2] + clean[2], 16) / 255
    return { r, g, b }
  }
  const r = parseInt(clean.substring(0, 2), 16) / 255
  const g = parseInt(clean.substring(2, 4), 16) / 255
  const b = parseInt(clean.substring(4, 6), 16) / 255
  return { r, g, b }
}

export async function saveAnnotatedPdf(options: SaveAnnotatedPdfOptions): Promise<string> {
  const fileBytes = fs.readFileSync(options.originalPath)
  const pdfDoc = await PDFDocument.load(fileBytes)
  const totalPages = pdfDoc.getPageCount()

  let standardFont: any = null

  for (const ann of options.annotations) {
    if (ann.pageIndex < 0 || ann.pageIndex >= totalPages) continue

    const page = pdfDoc.getPage(ann.pageIndex)
    const pdfWidth = page.getWidth()
    const pdfHeight = page.getHeight()
    const { r, g, b } = parseHexColor(ann.color)

    const baseScale = pdfWidth / 600

    switch (ann.type) {
      case 'highlight-box': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const x = (ann.x / 100) * pdfWidth
        const y = pdfHeight - (ann.y / 100) * pdfHeight - h

        page.drawRectangle({
          x,
          y,
          width: Math.max(1, w),
          height: Math.max(1, h),
          color: rgb(r, g, b),
          opacity: ann.opacity ?? 0.38
        })
        break
      }

      case 'highlight-freehand': {
        if (ann.points && ann.points.length > 1) {
          const thickness = Math.max(8, (ann.strokeWidth || 12) * baseScale)
          for (let i = 0; i < ann.points.length - 1; i++) {
            const p1 = ann.points[i]
            const p2 = ann.points[i + 1]
            page.drawLine({
              start: {
                x: (p1.x / 100) * pdfWidth,
                y: pdfHeight - (p1.y / 100) * pdfHeight
              },
              end: {
                x: (p2.x / 100) * pdfWidth,
                y: pdfHeight - (p2.y / 100) * pdfHeight
              },
              thickness,
              color: rgb(r, g, b),
              opacity: ann.opacity ?? 0.38
            })
          }
        }
        break
      }

      case 'pen': {
        if (ann.points && ann.points.length > 1) {
          const thickness = Math.max(1.5, (ann.strokeWidth || 2) * baseScale)
          for (let i = 0; i < ann.points.length - 1; i++) {
            const p1 = ann.points[i]
            const p2 = ann.points[i + 1]
            page.drawLine({
              start: {
                x: (p1.x / 100) * pdfWidth,
                y: pdfHeight - (p1.y / 100) * pdfHeight
              },
              end: {
                x: (p2.x / 100) * pdfWidth,
                y: pdfHeight - (p2.y / 100) * pdfHeight
              },
              thickness,
              color: rgb(r, g, b),
              opacity: 1
            })
          }
        }
        break
      }

      case 'underline': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const x = (ann.x / 100) * pdfWidth
        const y = pdfHeight - (ann.y / 100) * pdfHeight - h
        page.drawLine({
          start: { x, y },
          end: { x: x + w, y },
          thickness: Math.max(1.5, (ann.strokeWidth || 2) * baseScale),
          color: rgb(r, g, b),
          opacity: 1
        })
        break
      }

      case 'strikethrough': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const x = (ann.x / 100) * pdfWidth
        const y = pdfHeight - (ann.y / 100) * pdfHeight - h / 2
        page.drawLine({
          start: { x, y },
          end: { x: x + w, y },
          thickness: Math.max(1.5, (ann.strokeWidth || 2) * baseScale),
          color: rgb(r, g, b),
          opacity: 1
        })
        break
      }

      case 'rect': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const x = (ann.x / 100) * pdfWidth
        const y = pdfHeight - (ann.y / 100) * pdfHeight - h
        page.drawRectangle({
          x,
          y,
          width: Math.max(1, w),
          height: Math.max(1, h),
          borderColor: rgb(r, g, b),
          borderWidth: Math.max(1.5, (ann.strokeWidth || 2) * baseScale),
          opacity: 1
        })
        break
      }

      case 'circle': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const x = (ann.x / 100) * pdfWidth
        const y = pdfHeight - (ann.y / 100) * pdfHeight - h
        page.drawEllipse({
          x: x + w / 2,
          y: y + h / 2,
          xScale: Math.max(1, w / 2),
          yScale: Math.max(1, h / 2),
          borderColor: rgb(r, g, b),
          borderWidth: Math.max(1.5, (ann.strokeWidth || 2) * baseScale),
          opacity: 1
        })
        break
      }

      case 'arrow': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const startX = (ann.x / 100) * pdfWidth
        const startY = pdfHeight - (ann.y / 100) * pdfHeight
        const endX = startX + w
        const endY = startY - h

        const thickness = Math.max(1.5, (ann.strokeWidth || 2) * baseScale)
        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness,
          color: rgb(r, g, b)
        })

        const angle = Math.atan2(endY - startY, endX - startX)
        const headLength = 12 * baseScale
        const arrowAngle = Math.PI / 6

        page.drawLine({
          start: { x: endX, y: endY },
          end: {
            x: endX - headLength * Math.cos(angle - arrowAngle),
            y: endY - headLength * Math.sin(angle - arrowAngle)
          },
          thickness,
          color: rgb(r, g, b)
        })
        page.drawLine({
          start: { x: endX, y: endY },
          end: {
            x: endX - headLength * Math.cos(angle + arrowAngle),
            y: endY - headLength * Math.sin(angle + arrowAngle)
          },
          thickness,
          color: rgb(r, g, b)
        })
        break
      }

      case 'line': {
        const w = ((ann.width || 0) / 100) * pdfWidth
        const h = ((ann.height || 0) / 100) * pdfHeight
        const startX = (ann.x / 100) * pdfWidth
        const startY = pdfHeight - (ann.y / 100) * pdfHeight
        const endX = startX + w
        const endY = startY - h

        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness: Math.max(1.5, (ann.strokeWidth || 2) * baseScale),
          color: rgb(r, g, b)
        })
        break
      }

      case 'note': {
        const x = (ann.x / 100) * pdfWidth
        const y = pdfHeight - (ann.y / 100) * pdfHeight - 20
        // Draw note icon / square
        page.drawRectangle({
          x,
          y,
          width: 20,
          height: 20,
          color: rgb(1, 0.88, 0.2),
          borderColor: rgb(0.85, 0.65, 0.1),
          borderWidth: 1.2
        })
        if (ann.text) {
          if (!standardFont) {
            standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
          }
          page.drawText(ann.text.substring(0, 40), {
            x: x + 24,
            y: y + 5,
            size: 9,
            font: standardFont,
            color: rgb(0.1, 0.1, 0.1)
          })
        }
        break
      }

      case 'text': {
        if (ann.text) {
          if (!standardFont) {
            standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
          }
          const fontSize = Math.max(10, (ann.fontSize || 12) * baseScale)
          const x = (ann.x / 100) * pdfWidth
          const y = pdfHeight - (ann.y / 100) * pdfHeight - fontSize
          page.drawText(ann.text, {
            x,
            y,
            size: fontSize,
            font: standardFont,
            color: rgb(r, g, b)
          })
        }
        break
      }
    }
  }

  const modifiedBytes = await pdfDoc.save()

  let finalPath = options.outputPath
  if (!finalPath) {
    const tempDir = os.tmpdir()
    const baseName = path.basename(options.originalPath, '.pdf')
    finalPath = path.join(tempDir, `${baseName}-annotated-${Date.now()}.pdf`)
  }

  fs.writeFileSync(finalPath, modifiedBytes)
  return finalPath
}
