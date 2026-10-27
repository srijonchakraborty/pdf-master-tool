import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import JSZip from 'jszip'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { convertWithLibreOffice } from './libreOfficeConvert'

describe('libreOfficeConvert', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-toolkit-test-'))
  let dummyPdfPath: string
  let dummyDocxPath: string
  
  beforeAll(async () => {
    // Generate a simple PDF
    dummyPdfPath = path.join(tempDir, 'dummy.pdf')
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595, 842])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    page.drawText('This is a test PDF for converting to Word.', {
      x: 50,
      y: 800,
      size: 14,
      font,
      color: rgb(0, 0, 0)
    })
    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(dummyPdfPath, pdfBytes)

    // Generate a minimal valid DOCX
    dummyDocxPath = path.join(tempDir, 'dummy.docx')
    const zip = new JSZip()
    
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>This is a test docx content.</w:t></w:r></w:p>
  </w:body>
</w:document>`)
    
    const docxBytes = await zip.generateAsync({ type: 'nodebuffer' })
    fs.writeFileSync(dummyDocxPath, docxBytes)
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should convert PDF to Word (docx)', async () => {
    const resultPath = await convertWithLibreOffice(dummyPdfPath, 'docx')
    expect(fs.existsSync(resultPath)).toBe(true)
    const stats = fs.statSync(resultPath)
    expect(stats.size).toBeGreaterThan(0)
    expect(resultPath.endsWith('.docx')).toBe(true)
  }, 60000)

  it('should convert Word (docx) to PDF', async () => {
    const resultPath = await convertWithLibreOffice(dummyDocxPath, 'pdf')
    expect(fs.existsSync(resultPath)).toBe(true)
    const stats = fs.statSync(resultPath)
    expect(stats.size).toBeGreaterThan(0)
    expect(resultPath.endsWith('.pdf')).toBe(true)
  }, 60000)
})
