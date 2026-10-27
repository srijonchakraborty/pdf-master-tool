import fs from 'fs'
import path from 'path'
import os from 'os'
import JSZip from 'jszip'

/**
 * Converts an EPUB file to PDF by:
 * 1. Unzipping the EPUB (which is a ZIP containing HTML/XHTML files)
 * 2. Extracting the spine order from content.opf
 * 3. Embedding the text content into a properly formatted PDF with pdf-lib
 */
export async function epubToPdf(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const ext = path.extname(filePath).toLowerCase()
  
  // EPUB is a ZIP file
  const fileBuffer = fs.readFileSync(filePath)
  let epubText = ''
  let title = path.basename(filePath, ext)

  if (ext === '.epub') {
    try {
      const zip = await JSZip.loadAsync(fileBuffer)
      
      // Try to find the OPF to get spine order
      let opfPath = ''
      const containerXml = await zip.file('META-INF/container.xml')?.async('text')
      if (containerXml) {
        const match = containerXml.match(/full-path="([^"]+\.opf)"/)
        if (match) opfPath = match[1]
      }

      let orderedFiles: string[] = []
      
      if (opfPath) {
        const opfContent = await zip.file(opfPath)?.async('text')
        if (opfContent) {
          // Get title from metadata
          const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/)
          if (titleMatch) title = titleMatch[1].trim()

          // Build id→href manifest map
          const manifestMap: Record<string, string> = {}
          const manifestMatches = [...opfContent.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*>/g)]
          const opfDir = opfPath.includes('/') ? opfPath.split('/').slice(0, -1).join('/') + '/' : ''
          for (const m of manifestMatches) {
            manifestMap[m[1]] = opfDir + m[2]
          }
          
          // Get spine order
          const spineMatches = [...opfContent.matchAll(/<itemref[^>]+idref="([^"]+)"[^>]*/g)]
          for (const m of spineMatches) {
            if (manifestMap[m[1]]) orderedFiles.push(manifestMap[m[1]])
          }
        }
      }

      // Fallback: find all HTML/XHTML files
      if (orderedFiles.length === 0) {
        orderedFiles = Object.keys(zip.files).filter(f => /\.(html|xhtml|htm)$/i.test(f)).sort()
      }

      // Extract text from each HTML file
      const textParts: string[] = [`=== ${title} ===\n`]
      for (const htmlPath of orderedFiles.slice(0, 100)) {
        const content = await zip.file(htmlPath)?.async('text')
        if (!content) continue
        // Strip HTML tags and decode basic entities
        const text = content
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/\s{3,}/g, '\n\n').trim()
        if (text.length > 10) textParts.push(text)
      }
      epubText = textParts.join('\n\n')
    } catch (e: any) {
      throw new Error(`Failed to parse EPUB file: ${e.message}`)
    }
  } else if (ext === '.mobi' || ext === '.azw' || ext === '.azw3') {
    // MOBI/AZW files are proprietary binary formats — extract what text we can
    try {
      const rawText = fileBuffer.toString('latin1')
      // MOBI has a text section after the PalmDOC header; approximate extraction
      epubText = rawText
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s{4,}/g, '\n\n')
        .substring(0, 100000)
        .trim()
      if (epubText.length < 100) throw new Error('No readable text found in MOBI file')
    } catch (e: any) {
      throw new Error(`MOBI/AZW conversion requires LibreOffice or a MOBI converter. Error: ${e.message}`)
    }
  } else {
    throw new Error(`Unsupported ebook format: ${ext}. Supported: .epub, .mobi`)
  }

  // Build PDF with pdf-lib
  const { PDFDocument: PdfDoc, rgb, StandardFonts } = await import('pdf-lib')
  const pdfDoc = await PdfDoc.create()
  pdfDoc.setTitle(title)
  pdfDoc.setCreator('PDF Master Toolkit')
  pdfDoc.setProducer('PDF Master Toolkit')

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  const pageWidth = 595   // A4
  const pageHeight = 842
  const margin = 60
  const contentWidth = pageWidth - margin * 2
  const fontSize = 11
  const lineHeight = 16
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight)

  // Word wrap helper
  function wrapLine(text: string, maxWidth: number, f: typeof font, size: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const test = current ? current + ' ' + word : word
      const safeTest = test.replace(/[^\x20-\x7E]/g, '?')
      try {
        if (f.widthOfTextAtSize(safeTest, size) <= maxWidth) {
          current = test
        } else {
          if (current) lines.push(current)
          current = word
        }
      } catch {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines
  }

  const rawLines = epubText.split(/\r?\n/)
  const allLines: { text: string; isTitle: boolean; isBlank: boolean }[] = []

  for (const raw of rawLines) {
    const safe = raw.replace(/[^\x20-\x7E\n]/g, ' ').trim()
    if (!safe) { allLines.push({ text: '', isTitle: false, isBlank: true }); continue }
    const isTitle = safe.startsWith('===') && safe.endsWith('===')
    const wrapped = wrapLine(safe, contentWidth, font, fontSize)
    for (const w of wrapped) {
      allLines.push({ text: w, isTitle, isBlank: false })
    }
  }

  // Paginate
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  let lineOnPage = 0

  // Title page
  page.drawText(title.substring(0, 60).replace(/[^\x20-\x7E]/g, '?'), {
    x: margin, y: pageHeight / 2 + 20, size: 20, font: boldFont, color: rgb(0.1, 0.1, 0.4)
  })
  page.drawText('Converted by PDF Master Toolkit', {
    x: margin, y: pageHeight / 2 - 10, size: 10, font, color: rgb(0.5, 0.5, 0.5)
  })
  page.drawLine({ start: { x: margin, y: pageHeight / 2 - 25 }, end: { x: pageWidth - margin, y: pageHeight / 2 - 25 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

  // Content pages
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin
  lineOnPage = 0

  for (const line of allLines) {
    if (lineOnPage >= linesPerPage) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      lineOnPage = 0
    }
    if (!line.isBlank) {
      const displayText = line.text.substring(0, 120).replace(/[^\x20-\x7E]/g, '?')
      try {
        page.drawText(displayText, {
          x: margin, y,
          size: line.isTitle ? 14 : fontSize,
          font: line.isTitle ? boldFont : font,
          color: line.isTitle ? rgb(0.1, 0.1, 0.5) : rgb(0.1, 0.1, 0.1),
        })
      } catch {}
    }
    y -= lineHeight
    lineOnPage++
  }

  const pdfBytes = await pdfDoc.save()
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, ext)
  const outputPath = path.join(tempDir, `${baseName}-converted-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, pdfBytes)
  return outputPath
}
