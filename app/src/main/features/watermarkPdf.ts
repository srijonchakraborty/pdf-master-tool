import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, degrees } from 'pdf-lib'

export interface WatermarkOptions {
  filePath: string
  type: 'text' | 'image'
  text?: string
  imagePath?: string
  opacity: number
  rotation: number
  fontSize?: number
  pages: 'all' | number[]
}

export async function watermarkPdf(options: WatermarkOptions): Promise<string> {
  const { filePath, type, text, imagePath, opacity, rotation, fontSize = 60, pages } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const pdfBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const totalPages = pdfDoc.getPageCount()

  const pageIndices: number[] = pages === 'all'
    ? Array.from({ length: totalPages }, (_, i) => i)
    : (pages as number[]).map(p => p - 1).filter(i => i >= 0 && i < totalPages)

  if (type === 'text' && text) {
    const { StandardFonts, rgb } = await import('pdf-lib')
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    for (const idx of pageIndices) {
      const page = pdfDoc.getPage(idx)
      const { width, height } = page.getSize()
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      const textHeight = font.heightAtSize(fontSize)

      // Convert rotation angle (CSS clockwise) to PDF rotation (counter-clockwise)
      const pdfAngle = -rotation
      const rad = (pdfAngle * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      // Center of unrotated bounding box relative to text origin
      const originX = textWidth / 2
      const originY = textHeight / 3 // Approximately text baseline offset

      // Rotated offset of bounding box center
      const rotatedCenterX = originX * cos - originY * sin
      const rotatedCenterY = originX * sin + originY * cos

      const x = width / 2 - rotatedCenterX
      const y = height / 2 - rotatedCenterY

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        opacity,
        rotate: degrees(pdfAngle),
        color: rgb(0.4, 0.4, 0.4),
      })
    }
  } else if (type === 'image' && imagePath && fs.existsSync(imagePath)) {
    const imageBytes = fs.readFileSync(imagePath)
    const ext = path.extname(imagePath).toLowerCase()
    const image = ext === '.png'
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes)

    const imgDims = image.scale(0.5)

    for (const idx of pageIndices) {
      const page = pdfDoc.getPage(idx)
      const { width, height } = page.getSize()

      const pdfAngle = -rotation
      const rad = (pdfAngle * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      const originX = imgDims.width / 2
      const originY = imgDims.height / 2

      const rotatedCenterX = originX * cos - originY * sin
      const rotatedCenterY = originX * sin + originY * cos

      const x = width / 2 - rotatedCenterX
      const y = height / 2 - rotatedCenterY

      page.drawImage(image, {
        x,
        y,
        width: imgDims.width,
        height: imgDims.height,
        opacity,
        rotate: degrees(pdfAngle),
      })
    }
  }

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-watermarked-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
