import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, degrees } from 'pdf-lib'

export interface MergeOrganizePageEntry {
  filePath: string
  sourcePageIndex: number // 0-based index in the source file
  rotation?: number // in degrees: 0, 90, 180, 270
}

export interface MergeOrganizeOptions {
  pages: MergeOrganizePageEntry[]
  outputFileName?: string
}

export async function mergeOrganizePdf(options: MergeOrganizeOptions): Promise<string> {
  const { pages, outputFileName } = options
  if (!pages || pages.length === 0) {
    throw new Error('At least one page is required to create a PDF.')
  }

  // Cache loaded source documents to prevent reading and parsing the same file multiple times
  const loadedDocs = new Map<string, PDFDocument>()

  for (const page of pages) {
    if (!loadedDocs.has(page.filePath)) {
      if (!fs.existsSync(page.filePath)) {
        throw new Error(`File not found: ${page.filePath}`)
      }
      try {
        const fileBytes = fs.readFileSync(page.filePath)
        const doc = await PDFDocument.load(fileBytes)
        loadedDocs.set(page.filePath, doc)
      } catch (err: any) {
        throw new Error(`Failed to load PDF ${path.basename(page.filePath)}: ${err.message}`)
      }
    }
  }

  const mergedDoc = await PDFDocument.create()

  for (const item of pages) {
    const srcDoc = loadedDocs.get(item.filePath)!
    if (item.sourcePageIndex < 0 || item.sourcePageIndex >= srcDoc.getPageCount()) {
      throw new Error(`Page index ${item.sourcePageIndex + 1} out of bounds for ${path.basename(item.filePath)}`)
    }

    const [copiedPage] = await mergedDoc.copyPages(srcDoc, [item.sourcePageIndex])
    if (item.rotation) {
      const currentRotation = copiedPage.getRotation().angle
      const finalRotation = ((currentRotation + item.rotation) % 360 + 360) % 360
      copiedPage.setRotation(degrees(finalRotation))
    }
    mergedDoc.addPage(copiedPage)
  }

  const outBytes = await mergedDoc.save()
  const tempDir = os.tmpdir()
  const baseName = outputFileName ? path.basename(outputFileName, '.pdf') : 'organized_merged'
  const outputPath = path.join(tempDir, `${baseName}-${Date.now()}.pdf`)
  fs.writeFileSync(outputPath, outBytes)
  return outputPath
}
