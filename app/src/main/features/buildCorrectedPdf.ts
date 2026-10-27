import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Builds a corrected PDF from the given corrected text content,
 * preserving A4 page layout with wrapped lines.
 */
export async function buildCorrectedPdf(originalPdfPath: string, correctedText: string): Promise<string> {
  // Load original to ensure it's valid
  try {
    await PDFDocument.load(fs.readFileSync(originalPdfPath), { ignoreEncryption: true })
  } catch {}

  const pdfDoc = await PDFDocument.create()
  pdfDoc.setCreator('PDF Master Toolkit - Spellchecked')
  pdfDoc.setProducer('PDF Master Toolkit')

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  const pageWidth = 595   // A4
  const pageHeight = 842
  const margin = 60
  const fontSize = 11
  const lineHeight = 16
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight)
  const contentWidth = pageWidth - margin * 2

  function wrapLine(text: string): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const safe = (current ? current + ' ' + word : word).replace(/[^\x20-\x7E]/g, '?')
      try {
        if (font.widthOfTextAtSize(safe, fontSize) <= contentWidth) {
          current = current ? current + ' ' + word : word
        } else {
          if (current) lines.push(current)
          current = word
        }
      } catch {
        current = current ? current + ' ' + word : word
      }
    }
    if (current) lines.push(current)
    return lines.length > 0 ? lines : ['']
  }

  const rawLines = correctedText.split(/\r?\n/)
  const allLines: { text: string; isBold: boolean }[] = []
  for (const raw of rawLines) {
    if (!raw.trim()) { allLines.push({ text: '', isBold: false }); continue }
    const wrapped = wrapLine(raw)
    wrapped.forEach((w, i) => allLines.push({ text: w, isBold: i === 0 && raw.length < 80 && raw === raw.trim() }))
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  let lineOnPage = 0

  // Header on first page
  page.drawText('Spellchecked Document', {
    x: margin, y, size: 14, font: boldFont, color: rgb(0.1, 0.1, 0.5)
  })
  y -= 24
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.9) })
  y -= 16
  lineOnPage = 2

  for (const line of allLines) {
    if (lineOnPage >= maxLinesPerPage) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      lineOnPage = 0
    }
    if (line.text) {
      const safe = line.text.substring(0, 120).replace(/[^\x20-\x7E]/g, '?')
      try {
        page.drawText(safe, {
          x: margin, y,
          size: fontSize,
          font,
          color: rgb(0.08, 0.08, 0.08),
        })
      } catch {}
    }
    y -= lineHeight
    lineOnPage++
  }

  const pdfBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(originalPdfPath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-spellchecked-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, pdfBytes)
  return outputPath
}
