import path from 'path'
import { app } from 'electron'
import { createWorker } from 'tesseract.js'

// Determine path to our bundled offline language data
const getTessdataPath = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'tessdata')
  } else {
    // In development mode
    return path.join(__dirname, '../../../../resources/tessdata')
  }
}

export async function recognizeImageText(imageBase64: string, language: string = 'eng'): Promise<string> {
  const worker = await createWorker(language, 1, {
    logger: (_m: any) => {},
    langPath: getTessdataPath(),
    cachePath: getTessdataPath(),
  })

  try {
    const { data } = await worker.recognize(imageBase64)
    return data.text
  } finally {
    await worker.terminate()
  }
}

export async function recognizeImageBoxes(imageBase64: string, language: string = 'eng'): Promise<any> {
  const worker = await createWorker(language, 1, {
    logger: (_m: any) => {},
    langPath: getTessdataPath(),
    cachePath: getTessdataPath(),
  })

  try {
    const { data } = await worker.recognize(imageBase64)
    const anyData = data as any
    return {
      words: anyData.words.map((w: any) => ({
        text: w.text,
        bbox: w.bbox
      })),
      width: (data as any).width || 0,
      height: (data as any).height || 0
    }
  } finally {
    await worker.terminate()
  }
}
