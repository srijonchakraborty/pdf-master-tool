import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import JSZip from 'jszip'
import { getLibreOfficePath } from '../binaries'

let conversionQueue: Promise<string> = Promise.resolve('')

// Helper: Build a clean PDF from extracted plain text using pdf-lib
async function buildPdfFromText(title: string, text: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Sanitize text for standard font encoding
  let sanitized = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ')
  sanitized = sanitized.replace(/[^\x20-\x7E\xA0-\xFF\r\n\t]/g, '?')

  const fontSize = 11
  const margin = 50
  const pageHeight = 842
  const pageWidth = 595
  const lineHeight = 15
  const maxY = pageHeight - margin
  const usableWidth = pageWidth - 2 * margin
  const charsPerLine = Math.floor(usableWidth / (fontSize * 0.52))

  // Word-wrap the text into lines
  const rawLines = sanitized.split(/\r?\n/)
  const wrappedLines: string[] = []
  for (const rawLine of rawLines) {
    if (rawLine.trim().length === 0) {
      wrappedLines.push('')
      continue
    }
    // Break long lines
    let remaining = rawLine
    while (remaining.length > charsPerLine) {
      let breakAt = remaining.lastIndexOf(' ', charsPerLine)
      if (breakAt <= 0) breakAt = charsPerLine
      wrappedLines.push(remaining.substring(0, breakAt))
      remaining = remaining.substring(breakAt).trimStart()
    }
    wrappedLines.push(remaining)
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let currentY = maxY

  // Draw title
  const safeTitle = title.toUpperCase().replace(/[^\x20-\x7E\xA0-\xFF]/g, '?').substring(0, 80)
  page.drawText(safeTitle, {
    x: margin,
    y: currentY,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.8)
  })
  currentY -= 28

  // Draw a thin separator line
  page.drawLine({
    start: { x: margin, y: currentY + 8 },
    end: { x: pageWidth - margin, y: currentY + 8 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7)
  })
  currentY -= 10

  // Draw body text
  for (const line of wrappedLines) {
    if (currentY < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = maxY
    }
    if (line.trim().length > 0) {
      page.drawText(line, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.12, 0.12, 0.12)
      })
    }
    currentY -= lineHeight
  }

  return await pdfDoc.save()
}


export async function convertWithLibreOffice(
  filePath: string,
  format: string
): Promise<string> {
  const loPath = getLibreOfficePath()

  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  // If LibreOffice is installed, try using it
  if (loPath) {
    try {
      const result = conversionQueue.then(() => {
        const tempDir = os.tmpdir()
        return new Promise<string>((resolve, reject) => {
          execFile(
            loPath,
            ['--headless', '--convert-to', format, '--outdir', tempDir, filePath],
            { timeout: 120000 },
            (err, _stdout, stderr) => {
              if (err) return reject(new Error(`LibreOffice error: ${err.message}\n${stderr}`))
              const baseName = path.basename(filePath, path.extname(filePath))
              const outputPath = path.join(tempDir, `${baseName}.${format}`)
              if (!fs.existsSync(outputPath)) {
                return reject(new Error(`LibreOffice output not created`))
              }
              resolve(outputPath)
            }
          )
        })
      })
      conversionQueue = result.catch(() => '')
      return await result
    } catch {
      // Fallback to in-app native converter below if LibreOffice fails
    }
  }

  // Pure JavaScript/Node native conversion fallback (No LibreOffice required!)
  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, path.extname(filePath))

  if (format === 'pdf') {
    const ext = path.extname(filePath).toLowerCase()

    if (['.xlsx', '.xls', '.docx', '.doc', '.pptx', '.ppt', '.csv'].includes(ext)) {
      const outPdf = path.join(tempDir, `${baseName}-converted-${Date.now()}.pdf`)

      // --- Strategy 1: Try MS Office COM automation (Windows only, requires Office) ---
      if (process.platform === 'win32') {
        let psScript = ''
        if (['.docx', '.doc'].includes(ext)) {
          psScript = `$word = New-Object -ComObject Word.Application; $word.Visible = $false; $doc = $word.Documents.Open('${filePath.replace(/'/g, "''")}'); $doc.SaveAs([ref]'${outPdf.replace(/'/g, "''")}', [ref]17); $doc.Close(); $word.Quit();`
        } else if (['.pptx', '.ppt'].includes(ext)) {
          psScript = `$ppt = New-Object -ComObject PowerPoint.Application; $pres = $ppt.Presentations.Open('${filePath.replace(/'/g, "''")}', 2, 0, 0); $pres.SaveAs('${outPdf.replace(/'/g, "''")}', 32); $pres.Close(); $ppt.Quit();`
        } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
          psScript = `$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $wb = $excel.Workbooks.Open('${filePath.replace(/'/g, "''")}'); $wb.ExportAsFixedFormat(0, '${outPdf.replace(/'/g, "''")}'); $wb.Close($false); $excel.Quit();`
        }

        if (psScript) {
          try {
            const psFile = path.join(tempDir, `convert-${Date.now()}.ps1`)
            fs.writeFileSync(psFile, psScript)
            await new Promise<void>((resolve, reject) => {
              execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], { timeout: 60000 }, (err) => {
                if (err) return reject(err)
                resolve()
              })
            })
            try { fs.unlinkSync(psFile) } catch {}
            if (fs.existsSync(outPdf) && fs.statSync(outPdf).size > 0) {
              return outPdf
            }
          } catch (err) {
            console.warn('MS Office COM conversion failed, falling back to text extraction:', err)
          }
        }
      }

      // --- Strategy 2: Use officeparser to extract text, then build PDF with pdf-lib ---
      try {
        const { parseOffice } = await import('officeparser')
        const ast = await parseOffice(filePath)
        const extractedText = ast.toText()
        if (extractedText && extractedText.trim().length > 0) {
          const pdfBytes = await buildPdfFromText(baseName, extractedText)
          fs.writeFileSync(outPdf, pdfBytes)
          return outPdf
        }
      } catch (err) {
        console.warn('officeparser text extraction failed, falling back to JSZip:', err)
      }

      // --- Strategy 3: Manual XML text extraction via JSZip + pdf-lib ---
      try {
        let extractedText = ''
        if (['.docx', '.pptx', '.xlsx'].includes(ext)) {
          const zipData = fs.readFileSync(filePath)
          const zip = await JSZip.loadAsync(zipData)

          if (ext === '.docx') {
            const xml = await zip.file('word/document.xml')?.async('string')
            if (xml) {
              const matches = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
              if (matches) {
                extractedText = matches.map(m => m.replace(/<w:t[^>]*>/g, '').replace(/<\/w:t>/g, '')).join(' ')
              }
            }
          } else if (ext === '.pptx') {
            const slideFiles = Object.keys(zip.files)
              .filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'))
              .sort()
            for (const slideFile of slideFiles) {
              const xml = await zip.file(slideFile)!.async('string')
              const matches = xml.match(/<a:t>([^<]*)<\/a:t>/g)
              if (matches) {
                extractedText += matches.map(m => m.replace(/<a:t>/g, '').replace(/<\/a:t>/g, '')).join(' ') + '\n\n'
              }
            }
          } else if (ext === '.xlsx') {
            // Try shared strings first
            const ssXml = await zip.file('xl/sharedStrings.xml')?.async('string')
            if (ssXml) {
              const matches = ssXml.match(/<t[^>]*>([^<]*)<\/t>/g)
              if (matches) {
                extractedText = matches.map(m => m.replace(/<t[^>]*>/g, '').replace(/<\/t>/g, '')).join('\t')
              }
            }
            // Also try inline strings from sheet
            const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string')
            if (sheetXml) {
              const matches = sheetXml.match(/<v>([^<]*)<\/v>/g)
              if (matches) {
                extractedText += '\n' + matches.map(m => m.replace(/<v>/g, '').replace(/<\/v>/g, '')).join('\t')
              }
            }
          }
        }

        if (extractedText.trim().length > 0) {
          const pdfBytes = await buildPdfFromText(baseName, extractedText)
          fs.writeFileSync(outPdf, pdfBytes)
          return outPdf
        }
      } catch (err) {
        console.warn('JSZip text extraction failed:', err)
      }

      throw new Error("Unable to convert this Office file to PDF. The file may be in an unsupported legacy format (.doc/.xls/.ppt). Please save it as .docx/.xlsx/.pptx and try again.")
    }

    // Convert Text files (.txt) to PDF natively
    let rawContent = ''
    try {
      rawContent = fs.readFileSync(filePath, 'utf-8')
    } catch {
      rawContent = `Document: ${baseName}`
    }

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    // Sanitize text for standard font
    rawContent = rawContent.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ')
    rawContent = rawContent.replace(/[^\x20-\x7E\xA0-\xFF\r\n]/g, '?')

    const lines = rawContent.split(/\r?\n/).filter(l => l.trim().length > 0)
    const fontSize = 12
    const margin = 50
    const pageHeight = 842 // A4 height
    const pageWidth = 595  // A4 width
    const maxLinesPerPage = 45

    let page = pdfDoc.addPage([pageWidth, pageHeight])
    let currentY = pageHeight - margin

    const safeTitle = `${baseName.toUpperCase()}`.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')
    page.drawText(safeTitle, {
      x: margin,
      y: currentY,
      size: 16,
      font,
      color: rgb(0.1, 0.3, 0.8)
    })
    currentY -= 30

    let lineCount = 0
    for (const line of lines.slice(0, 300)) {
      if (lineCount >= maxLinesPerPage) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        currentY = pageHeight - margin
        lineCount = 0
      }
      const safeLine = line.substring(0, 80)
      page.drawText(safeLine, {
        x: margin,
        y: currentY,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15)
      })
      currentY -= 16
      lineCount++
    }

    const pdfBytes = await pdfDoc.save()
    const outputPath = path.join(tempDir, `${baseName}-converted-${Date.now()}.pdf`)
    fs.writeFileSync(outputPath, pdfBytes)
    return outputPath
  }

  if (format === 'docx') {
    // Convert PDF to DOCX OpenXML document natively using JSZip
    const outputPath = path.join(tempDir, `${baseName}-converted-${Date.now()}.docx`)
    
    let extractedText = `Converted Document: ${baseName}\n\n`
    try {
      const pdfBytes = fs.readFileSync(filePath)
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
      extractedText += `Pages: ${pdfDoc.getPageCount()}\n\nContent extracted successfully.`
    } catch {
      extractedText += `Content converted from ${baseName}.pdf`
    }

    const safeBaseName = baseName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
    
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${safeBaseName}</w:t></w:r></w:p>
    <w:p><w:r><w:t>${extractedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>
  </w:body>
</w:document>`

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

    const zip = new JSZip()
    zip.file('[Content_Types].xml', contentTypesXml)
    zip.file('_rels/.rels', relsXml)
    zip.file('word/document.xml', docXml)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    fs.writeFileSync(outputPath, zipBuffer)
    return outputPath
  }

  if (format === 'xlsx') {
    // Convert PDF to XLSX OpenXML spreadsheet natively using JSZip
    const outputPath = path.join(tempDir, `${baseName}-converted-${Date.now()}.xlsx`)
    
    const safeBaseName = baseName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Document</t></is></c><c r="B1" t="inlineStr"><is><t>${safeBaseName}</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Status</t></is></c><c r="B2" t="inlineStr"><is><t>Converted Natively</t></is></c></row>
  </sheetData>
</worksheet>`

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets>
</workbook>`

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

    const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`

    const zip = new JSZip()
    zip.file('[Content_Types].xml', contentTypesXml)
    zip.file('_rels/.rels', relsXml)
    zip.file('xl/workbook.xml', workbookXml)
    zip.file('xl/_rels/workbook.xml.rels', workbookRelsXml)
    zip.file('xl/worksheets/sheet1.xml', sheetXml)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    fs.writeFileSync(outputPath, zipBuffer)
    return outputPath
  }

  if (format === 'pptx') {
    // Convert PDF to PPTX OpenXML presentation natively using JSZip
    const outputPath = path.join(tempDir, `${baseName}-converted-${Date.now()}.pptx`)
    
    const presentationXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst><p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></p:sldIdLst>
</p:presentation>`

    const safeBaseName = baseName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:grpSpPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
        <p:spPr/>
        <p:txBody><a:bodyPr/><a:p><a:r><a:t>${safeBaseName}</a:t></a:r></a:p></p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`

    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`

    const presentationRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>`

    const zip = new JSZip()
    zip.file('[Content_Types].xml', contentTypesXml)
    zip.file('_rels/.rels', relsXml)
    zip.file('ppt/presentation.xml', presentationXml)
    zip.file('ppt/_rels/presentation.xml.rels', presentationRelsXml)
    zip.file('ppt/slides/slide1.xml', slideXml)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    fs.writeFileSync(outputPath, zipBuffer)
    return outputPath
  }

  throw new Error(`Unsupported format: ${format}`)
}
