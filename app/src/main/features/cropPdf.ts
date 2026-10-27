import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

export async function cropPdf(
  filePath: string,
  cropBox: CropBox,
  pages: 'all' | number[]
): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const totalPages = pdfDoc.getPageCount()

  const pageIndices: number[] = pages === 'all'
    ? Array.from({ length: totalPages }, (_, i) => i)
    : (pages as number[]).map(p => p - 1).filter(i => i >= 0 && i < totalPages)

  for (const idx of pageIndices) {
    const page = pdfDoc.getPage(idx)
    const { width: pw, height: ph } = page.getSize()

    // If 'all pages', scale proportionally to each page's size
    let cx = cropBox.x, cy = cropBox.y, cw = cropBox.width, ch = cropBox.height

    if (pages === 'all') {
      // cropBox is relative to first page; scale proportionally
      const firstPage = pdfDoc.getPage(0)
      const { width: fw, height: fh } = firstPage.getSize()
      cx = (cropBox.x / fw) * pw
      cy = (cropBox.y / fh) * ph
      cw = (cropBox.width / fw) * pw
      ch = (cropBox.height / fh) * ph
    }

    // Clamp to page bounds
    cx = Math.max(0, Math.min(cx, pw))
    cy = Math.max(0, Math.min(cy, ph))
    cw = Math.max(1, Math.min(cw, pw - cx))
    ch = Math.max(1, Math.min(ch, ph - cy))

    page.setCropBox(cx, cy, cw, ch)
  }

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-cropped-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
