import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'
import { mergeOrganizePdf } from './mergeOrganizePdf'

describe('mergeOrganizePdf', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-organize-test-'))
  let pdf1Path: string
  let pdf2Path: string

  beforeAll(async () => {
    // Create first PDF with 3 pages
    const doc1 = await PDFDocument.create()
    doc1.addPage([400, 600])
    doc1.addPage([400, 600])
    doc1.addPage([400, 600])
    const bytes1 = await doc1.save()
    pdf1Path = path.join(tempDir, 'doc1.pdf')
    fs.writeFileSync(pdf1Path, bytes1)

    // Create second PDF with 2 pages
    const doc2 = await PDFDocument.create()
    doc2.addPage([400, 600])
    doc2.addPage([400, 600])
    const bytes2 = await doc2.save()
    pdf2Path = path.join(tempDir, 'doc2.pdf')
    fs.writeFileSync(pdf2Path, bytes2)
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should merge and reorder pages across multiple files with rotations', async () => {
    // Desired order:
    // 1. Doc2 page 2 (index 1) rotated 90 degrees
    // 2. Doc1 page 1 (index 0)
    // 3. Doc2 page 1 (index 0)
    // (Omit doc1 page 2 and 3)
    const outputPath = await mergeOrganizePdf({
      pages: [
        { filePath: pdf2Path, sourcePageIndex: 1, rotation: 90 },
        { filePath: pdf1Path, sourcePageIndex: 0, rotation: 0 },
        { filePath: pdf2Path, sourcePageIndex: 0, rotation: 180 },
      ],
      outputFileName: 'custom_output.pdf',
    })

    expect(fs.existsSync(outputPath)).toBe(true)

    const resultBytes = fs.readFileSync(outputPath)
    const resultDoc = await PDFDocument.load(resultBytes)

    expect(resultDoc.getPageCount()).toBe(3)
    expect(resultDoc.getPage(0).getRotation().angle).toBe(90)
    expect(resultDoc.getPage(1).getRotation().angle).toBe(0)
    expect(resultDoc.getPage(2).getRotation().angle).toBe(180)
  })

  it('should throw an error when no pages are provided', async () => {
    await expect(mergeOrganizePdf({ pages: [] })).rejects.toThrow('At least one page is required')
  })
})
