import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export interface SignPdfOptions {
  filePath: string
  signatureImageDataUrl: string // base64 PNG data URL
  page: number // 1-indexed
  x: number
  y: number
  width: number
  height: number
}

export async function signPdf(options: SignPdfOptions): Promise<string> {
  const { filePath, signatureImageDataUrl, page, x, y, width, height } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)

  const pageIndex = page - 1
  if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
    throw new Error(`Invalid page number: ${page}`)
  }

  // Decode base64 PNG from data URL
  const base64Data = signatureImageDataUrl.replace(/^data:image\/png;base64,/, '')
  const imgBytes = Buffer.from(base64Data, 'base64')
  const sigImg = await pdfDoc.embedPng(imgBytes)

  const pdfPage = pdfDoc.getPage(pageIndex)
  const { height: pageHeight } = pdfPage.getSize()

  // PDF coordinates: y=0 is bottom, so flip from canvas coords
  const pdfY = pageHeight - y - height

  pdfPage.drawImage(sigImg, {
    x,
    y: pdfY,
    width,
    height,
  })

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-signed-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
