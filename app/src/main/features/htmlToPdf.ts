import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface HtmlToPdfSource {
  type: 'url' | 'html'
  url?: string
  html?: string
}

export interface HtmlToPdfOptions {
  source: HtmlToPdfSource
  landscape?: boolean
  pageSize?: string
  marginType?: 'default' | 'none' | 'minimum'
  scale?: number
  autoFit?: boolean
}

const PAGE_DIMENSIONS_INCHES: Record<string, { width: number; height: number }> = {
  A0: { width: 33.11, height: 46.81 },
  A1: { width: 23.39, height: 33.11 },
  A2: { width: 16.54, height: 23.39 },
  A3: { width: 11.69, height: 16.54 },
  A4: { width: 8.27, height: 11.69 },
  A5: { width: 5.83, height: 8.27 },
  A6: { width: 4.13, height: 5.83 },
  Letter: { width: 8.5, height: 11.0 },
  Legal: { width: 8.5, height: 14.0 },
  Tabloid: { width: 11.0, height: 17.0 },
  Ledger: { width: 17.0, height: 11.0 }
}

export async function htmlToPdf(options: HtmlToPdfOptions): Promise<string> {
  const {
    source,
    landscape = false,
    pageSize = 'A4',
    marginType = 'default',
    scale,
    autoFit = true
  } = options

  return new Promise((resolve, reject) => {
    let tempHtmlPath: string | null = null

    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    })

    try {
      win.webContents.setAudioMuted(true)
    } catch {}

    const cleanup = () => {
      clearTimeout(timeout)
      if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
        try {
          fs.unlinkSync(tempHtmlPath)
        } catch {}
      }
      if (!win.isDestroyed()) {
        win.destroy()
      }
    }

    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Page load timed out after 45 seconds.'))
    }, 45000)

    win.webContents.on('did-finish-load', async () => {
      try {
        // Wait for web fonts if supported
        await win.webContents
          .executeJavaScript(
            'document.fonts ? document.fonts.ready.then(() => true).catch(() => true) : Promise.resolve(true)'
          )
          .catch(() => true)

        // Wait a brief moment for styles, dynamic scripts, and layout calculations
        await new Promise((r) => setTimeout(r, 600))

        // Inject anti-cropping styles and un-constrain scrollable/fixed containers
        await win.webContents.executeJavaScript(`
          (() => {
            // 1. Force root elements and general layout to allow full expansion
            const style = document.createElement('style');
            style.id = '__pdf_anti_crop_styles__';
            style.textContent = \`
              @media print, screen {
                html, body {
                  height: auto !important;
                  min-height: 100% !important;
                  max-height: none !important;
                  overflow: visible !important;
                  overflow-x: visible !important;
                  overflow-y: visible !important;
                  position: static !important;
                  width: auto !important;
                }
                * {
                  box-sizing: border-box !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                img, svg, canvas, video {
                  max-width: 100% !important;
                  height: auto !important;
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                table, tr, td, th, figure, blockquote {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                table {
                  max-width: 100% !important;
                  width: 100% !important;
                  table-layout: auto !important;
                }
                pre, code {
                  white-space: pre-wrap !important;
                  word-break: break-word !important;
                  overflow-wrap: break-word !important;
                }
                header, nav, [class*="sticky"], [class*="fixed"] {
                  position: static !important;
                }
              }
            \`;
            document.head.appendChild(style);

            // 2. Expand scrollable containers that would otherwise truncate content
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const cs = window.getComputedStyle(el);
              if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || cs.overflowY === 'hidden') {
                if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
                  el.style.setProperty('overflow', 'visible', 'important');
                  el.style.setProperty('max-height', 'none', 'important');
                  el.style.setProperty('height', 'auto', 'important');
                }
              }
              if (cs.overflowX === 'auto' || cs.overflowX === 'scroll' || cs.overflowX === 'hidden') {
                if (el.scrollWidth > el.clientWidth && el.clientWidth > 0) {
                  el.style.setProperty('overflow', 'visible', 'important');
                  el.style.setProperty('max-width', 'none', 'important');
                }
              }
            }
          })()
        `)

        // Calculate responsive scale to prevent right-edge horizontal cropping
        const pageDim = PAGE_DIMENSIONS_INCHES[pageSize] || PAGE_DIMENSIONS_INCHES.A4
        const targetWidthInches = landscape ? pageDim.height : pageDim.width

        let marginAllowanceInches = 0.8 // default ~0.4in per side
        if (marginType === 'none') {
          marginAllowanceInches = 0
        } else if (marginType === 'minimum') {
          marginAllowanceInches = 0.4 // ~0.2in per side
        }

        const printableWidthPx = (targetWidthInches - marginAllowanceInches) * 96

        let printScale = scale || 1.0
        if (autoFit && !scale) {
          const contentWidth: number = await win.webContents.executeJavaScript(`
            Math.max(
              document.documentElement ? document.documentElement.scrollWidth : 0,
              document.body ? document.body.scrollWidth : 0,
              document.documentElement ? document.documentElement.offsetWidth : 0,
              document.body ? document.body.offsetWidth : 0
            )
          `)

          if (contentWidth > printableWidthPx && printableWidthPx > 0) {
            printScale = Math.min(1.0, Math.max(0.25, (printableWidthPx / contentWidth) * 0.96))
          }
        }

        let margins: any = { marginType: 'default' }
        if (marginType === 'none') {
          margins = { marginType: 'none' }
        } else if (marginType === 'minimum') {
          margins = { marginType: 'printableArea' }
        }

        const pdfBuffer = await win.webContents.printToPDF({
          landscape,
          pageSize: pageSize as any,
          printBackground: true,
          scale: printScale,
          margins,
          preferCSSPageSize: false
        })

        const tempDir = os.tmpdir()
        const outputPath = path.join(tempDir, `html-to-pdf-${Date.now()}.pdf`)
        fs.writeFileSync(outputPath, pdfBuffer)

        cleanup()
        resolve(outputPath)
      } catch (err: any) {
        cleanup()
        reject(new Error(`printToPDF failed: ${err.message}`))
      }
    })

    win.webContents.on('did-fail-load', (_event, _code, description, _url, isMainFrame) => {
      // Only fail if main frame failed to load (ignore failing trackers or subresources)
      if (isMainFrame) {
        cleanup()
        reject(new Error(`Page failed to load: ${description}`))
      }
    })

    try {
      if (source.type === 'url' && source.url) {
        win.loadURL(source.url)
      } else if (source.type === 'html' && source.html) {
        let content = source.html
        if (!/<html[\s>]/i.test(content)) {
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 24px;
      color: #1a202c;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`
        }

        tempHtmlPath = path.join(
          os.tmpdir(),
          `html-src-${Date.now()}-${Math.random().toString(36).substring(7)}.html`
        )
        fs.writeFileSync(tempHtmlPath, content, 'utf-8')
        win.loadFile(tempHtmlPath)
      } else {
        cleanup()
        reject(new Error('Invalid source: must provide url or html content.'))
      }
    } catch (e: any) {
      cleanup()
      reject(e)
    }
  })
}
