import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument } from 'pdf-lib'
import { saveAnnotatedPdf, ViewerAnnotation } from './saveAnnotatedPdf'

describe('saveAnnotatedPdf', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'save-annotated-test-'))
  let samplePdfPath: string

  beforeAll(async () => {
    const doc = await PDFDocument.create()
    doc.addPage([500, 700])
    doc.addPage([500, 700])
    const bytes = await doc.save()
    samplePdfPath = path.join(tempDir, 'sample.pdf')
    fs.writeFileSync(samplePdfPath, bytes)
  })

  afterAll(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should bake highlights, marks, notes, and shapes into PDF correctly', async () => {
    const annotations: ViewerAnnotation[] = [
      {
        id: '1',
        pageIndex: 0,
        type: 'highlight-box',
        x: 10,
        y: 20,
        width: 40,
        height: 5,
        color: '#facc15',
        opacity: 0.35
      },
      {
        id: '2',
        pageIndex: 0,
        type: 'pen',
        x: 0,
        y: 0,
        color: '#ef4444',
        strokeWidth: 2,
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 15 },
          { x: 20, y: 10 }
        ]
      },
      {
        id: '3',
        pageIndex: 1,
        type: 'note',
        x: 50,
        y: 50,
        color: '#facc15',
        text: 'Important note here'
      },
      {
        id: '4',
        pageIndex: 1,
        type: 'rect',
        x: 10,
        y: 10,
        width: 30,
        height: 20,
        color: '#3b82f6',
        strokeWidth: 2
      }
    ]

    const outputPath = await saveAnnotatedPdf({
      originalPath: samplePdfPath,
      annotations
    })

    expect(fs.existsSync(outputPath)).toBe(true)

    const resultBytes = fs.readFileSync(outputPath)
    const resultDoc = await PDFDocument.load(resultBytes)

    expect(resultDoc.getPageCount()).toBe(2)
    // Saved PDF should be larger than original due to drawn annotations
    expect(resultBytes.length).toBeGreaterThan(fs.readFileSync(samplePdfPath).length)
  })
})
