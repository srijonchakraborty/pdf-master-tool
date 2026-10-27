import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Polyfill TC39 Map.prototype.getOrInsertComputed for pdfjs-dist compatibility
if (!('getOrInsertComputed' in Map.prototype)) {
  ;(Map.prototype as any).getOrInsertComputed = function (key: any, callback: (key: any) => any) {
    if (this.has(key)) {
      return this.get(key)
    }
    const value = callback(key)
    this.set(key, value)
    return value
  }
}
if (!('getOrInsert' in Map.prototype)) {
  ;(Map.prototype as any).getOrInsert = function (key: any, defaultValue: any) {
    if (this.has(key)) {
      return this.get(key)
    }
    this.set(key, defaultValue)
    return defaultValue
  }
}

import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker'

pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
