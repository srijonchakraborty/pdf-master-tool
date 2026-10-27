import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, degrees } from 'pdf-lib'

export interface RotationEntry {
  page: number // 1-indexed
  degrees: 0 | 90 | 180 | 270
}

export async function rotatePdf(filePath: string, rotations: RotationEntry[]): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)

  for (const r of rotations) {
    const pageIndex = r.page - 1 // convert to 0-indexed
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) continue
    const page = pdfDoc.getPage(pageIndex)
    const currentRotation = page.getRotation().angle
    const newRotation = (currentRotation + r.degrees) % 360
    page.setRotation(degrees(newRotation))
  }

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-rotated-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
