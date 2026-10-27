import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export async function organizePdf(filePath: string, pageOrder: number[]): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const sourcePdf = await PDFDocument.load(pdfBytes)
  const newPdf = await PDFDocument.create()

  // pageOrder is 0-indexed page indices from source doc
  const copiedPages = await newPdf.copyPages(sourcePdf, pageOrder)
  copiedPages.forEach(p => newPdf.addPage(p))

  const outBytes = await newPdf.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-organized-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
