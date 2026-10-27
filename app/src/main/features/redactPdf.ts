import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, rgb } from 'pdf-lib'

export interface RedactionBox {
  page: number // 1-indexed
  x: number
  y: number // from top-left in rendered canvas coords
  width: number
  height: number
  // These are in PDF points (already converted by renderer)
  pdfX: number
  pdfY: number // from bottom-left (PDF coord system)
  pdfWidth: number
  pdfHeight: number
}

export async function redactPdf(filePath: string, redactions: RedactionBox[]): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)

  // Group redactions by page
  const byPage = new Map<number, RedactionBox[]>()
  for (const r of redactions) {
    if (!byPage.has(r.page)) byPage.set(r.page, [])
    byPage.get(r.page)!.push(r)
  }

  for (const [pageNum, boxes] of byPage.entries()) {
    const pageIndex = pageNum - 1
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue
    const page = pdfDoc.getPage(pageIndex)

    for (const box of boxes) {
      page.drawRectangle({
        x: box.pdfX,
        y: box.pdfY,
        width: box.pdfWidth,
        height: box.pdfHeight,
        color: rgb(0, 0, 0),
        borderWidth: 0,
      })
    }
  }

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-redacted-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
