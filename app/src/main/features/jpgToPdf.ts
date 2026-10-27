import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'

export async function jpgToPdf(
  filePaths: string[],
  pageSize: 'fit' | 'a4' | 'letter'
): Promise<string> {
  const pdfDoc = await PDFDocument.create()

  for (const imgPath of filePaths) {
    let imgBytes: Buffer
    let ext: string

    if (imgPath.startsWith('data:image/')) {
      const matches = imgPath.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/)
      if (!matches) continue
      ext = '.' + matches[1].toLowerCase()
      imgBytes = Buffer.from(matches[2], 'base64')
    } else {
      if (!fs.existsSync(imgPath)) continue
      imgBytes = fs.readFileSync(imgPath)
      ext = path.extname(imgPath).toLowerCase()
    }

    const img = ext === '.png' ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes)
    const { width: iw, height: ih } = img

    let pw: number, ph: number

    if (pageSize === 'a4') {
      pw = 595.28
      ph = 841.89
    } else if (pageSize === 'letter') {
      pw = 612
      ph = 792
    } else {
      pw = iw
      ph = ih
    }

    const page = pdfDoc.addPage([pw, ph])

    if (pageSize === 'fit') {
      page.drawImage(img, { x: 0, y: 0, width: pw, height: ph })
    } else {
      // Scale image to fit within page with margins
      const margin = 40
      const maxW = pw - margin * 2
      const maxH = ph - margin * 2
      const scale = Math.min(maxW / iw, maxH / ih)
      const dw = iw * scale
      const dh = ih * scale
      const x = (pw - dw) / 2
      const y = (ph - dh) / 2
      page.drawImage(img, { x, y, width: dw, height: dh })
    }
  }

  const outBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const outputPath = path.join(tempDir, `images-to-pdf-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
