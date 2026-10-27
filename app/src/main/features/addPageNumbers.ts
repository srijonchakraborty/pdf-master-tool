import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface AddPageNumbersOptions {
  filePath: string
  position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  format: string   // e.g. "{n}" or "Page {n} of {total}"
  startAt: number
  fontSize: number
  pages: 'all' | number[]
}

export async function addPageNumbers(options: AddPageNumbersOptions): Promise<string> {
  const { filePath, position, format, startAt, fontSize, pages } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const totalPages = pdfDoc.getPageCount()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageIndices: number[] = pages === 'all'
    ? Array.from({ length: totalPages }, (_, i) => i)
    : (pages as number[]).map(p => p - 1).filter(i => i >= 0 && i < totalPages)

  const margin = 30

  for (let i = 0; i < pageIndices.length; i++) {
    const idx = pageIndices[i]
    const page = pdfDoc.getPage(idx)
    const { width, height } = page.getSize()
    const pageNum = startAt + i
    const label = format
      .replace('{n}', String(pageNum))
      .replace('{total}', String(totalPages))

    const textWidth = font.widthOfTextAtSize(label, fontSize)
    const textHeight = fontSize

    let x = margin
    let y = margin

    if (position.includes('center')) {
      x = (width - textWidth) / 2
    } else if (position.includes('right')) {
      x = width - textWidth - margin
    }

    if (position.startsWith('top')) {
      y = height - textHeight - margin
    } else {
      y = margin
    }

    page.drawText(label, { x, y, size: fontSize, font, color: rgb(0, 0, 0) })
  }

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-numbered-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
