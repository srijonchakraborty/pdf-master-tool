import fs from 'fs'
import path from 'path'
import os from 'os'
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib'
import JSZip from 'jszip'

export interface ExtractedAsset {
  type: 'image' | 'font' | 'other'
  name: string
  ext: string
  size: number
  data: Buffer
}

export async function extractAssetsFromPdf(filePath: string): Promise<ExtractedAsset[]> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const inputBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(inputBytes, { ignoreEncryption: true })
  const assets: ExtractedAsset[] = []

  const context = pdfDoc.context
  const imageSubtypes: Record<string, string> = {
    '/DCTDecode': 'jpg',
    '/FlateDecode': 'png',
    '/JPXDecode': 'jp2',
    '/CCITTFaxDecode': 'tiff',
    '/JBIG2Decode': 'jbig2',
  }

  let imgCount = 0
  let fontCount = 0

  // Enumerate all indirect objects
  context.enumerateIndirectObjects().forEach(([, pdfObject]) => {
    if (!(pdfObject instanceof PDFRawStream)) return

    const dict = pdfObject.dict

    // Detect XObject images
    const subtype = dict.get(PDFName.of('Subtype'))
    const type = dict.get(PDFName.of('Type'))
    
    if (subtype && subtype.toString() === '/Image') {
      imgCount++
      const filter = dict.get(PDFName.of('Filter'))
      const filterName = filter ? filter.toString() : '/FlateDecode'
      const ext = imageSubtypes[filterName] || 'bin'
      const data = Buffer.from(pdfObject.contents)
      assets.push({
        type: 'image',
        name: `image_${imgCount}.${ext}`,
        ext,
        size: data.length,
        data,
      })
    }

    // Detect embedded font streams  
    if (type && type.toString() === '/FontDescriptor') {
      fontCount++
      const data = Buffer.from(pdfObject.contents)
      assets.push({
        type: 'font',
        name: `font_${fontCount}.bin`,
        ext: 'bin',
        size: data.length,
        data,
      })
    }
  })

  return assets
}

export async function extractAssetsAsZip(filePath: string): Promise<string> {
  const assets = await extractAssetsFromPdf(filePath)

  if (assets.length === 0) throw new Error('No extractable assets (images, fonts) found in this PDF.')

  const zip = new JSZip()
  const images = assets.filter(a => a.type === 'image')
  const fonts = assets.filter(a => a.type === 'font')

  if (images.length > 0) {
    const imgFolder = zip.folder('images')!
    images.forEach(asset => imgFolder.file(asset.name, asset.data))
  }
  if (fonts.length > 0) {
    const fontFolder = zip.folder('fonts')!
    fonts.forEach(asset => fontFolder.file(asset.name, asset.data))
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-assets-${Date.now()}.zip`)
  fs.writeFileSync(outputPath, zipBuffer)

  return outputPath
}
