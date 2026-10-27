import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { marked } from 'marked'
import hljs from 'highlight.js'

export interface MdToPdfOptions {
  source: {
    type: 'file' | 'markdown'
    filePath?: string
    markdown?: string
  }
  theme?: 'github' | 'modern' | 'academic' | 'minimal'
  pageSize?: string
  landscape?: boolean
  marginType?: 'default' | 'none' | 'minimum'
  scale?: number
  autoFit?: boolean
  title?: string
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

const HIGHLIGHT_JS_CSS = `
.hljs { color: #24292e; background: #f6f8fa; }
.hljs-doctag, .hljs-keyword, .hljs-meta .hljs-keyword, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-variable.language_ { color: #d73a49; }
.hljs-title, .hljs-title.class_, .hljs-title.class_.inherited__, .hljs-title.function_ { color: #6f42c1; }
.hljs-attr, .hljs-attribute, .hljs-literal, .hljs-meta, .hljs-number, .hljs-operator, .hljs-variable, .hljs-selector-attr, .hljs-selector-class, .hljs-selector-id { color: #005cc5; }
.hljs-string, .hljs-regexp, .hljs-meta .hljs-string { color: #032f62; }
.hljs-built_in, .hljs-symbol { color: #e36209; }
.hljs-comment, .hljs-code, .hljs-formula { color: #6a737d; font-style: italic; }
.hljs-name, .hljs-quote, .hljs-selector-tag, .hljs-selector-pseudo { color: #22863a; }
.hljs-subst { color: #24292e; }
.hljs-section { color: #005cc5; font-weight: bold; }
.hljs-bullet { color: #735c0f; }
.hljs-emphasis { font-style: italic; }
.hljs-strong { font-weight: bold; }
.hljs-addition { color: #22863a; background-color: #f0fff4; }
.hljs-deletion { color: #b31d28; background-color: #ffeef0; }
`

function getThemeStyles(theme: string): string {
  switch (theme) {
    case 'modern':
      return `
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif;
          font-size: 15px;
          line-height: 1.7;
          color: #334155;
          background: #ffffff;
        }
        .markdown-body h1 {
          color: #1e1b4b;
          font-size: 2.2em;
          font-weight: 700;
          margin-top: 28px;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }
        .markdown-body h2 {
          color: #312e81;
          font-size: 1.6em;
          font-weight: 600;
          border-bottom: 2px solid #e0e7ff;
          padding-bottom: 8px;
          margin-top: 24px;
          margin-bottom: 14px;
        }
        .markdown-body h3 {
          color: #3730a3;
          font-size: 1.3em;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .markdown-body blockquote {
          background: #f8fafc;
          border-left: 4px solid #6366f1;
          border-radius: 0 8px 8px 0;
          padding: 12px 18px;
          color: #475569;
          margin-bottom: 18px;
        }
        .markdown-body table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        .markdown-body table th {
          background-color: #f1f5f9;
          color: #1e293b;
          font-weight: 600;
          padding: 10px 14px;
          border-bottom: 1px solid #e2e8f0;
        }
        .markdown-body table td {
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
        }
        .markdown-body table tr:last-child td {
          border-bottom: none;
        }
        .markdown-body pre {
          background: #0f172a;
          color: #f8fafc;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 18px;
        }
        .markdown-body pre .hljs {
          background: transparent;
          color: #f8fafc;
        }
        .markdown-body code {
          background: #f1f5f9;
          color: #4f46e5;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 0.9em;
        }
        .markdown-body pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
      `
    case 'academic':
      return `
        body {
          font-family: "Georgia", "Times New Roman", Times, serif;
          font-size: 14.5px;
          line-height: 1.8;
          color: #111827;
          background: #ffffff;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
          font-family: "Georgia", "Times New Roman", Times, serif;
          color: #000;
          text-align: center;
          margin-top: 24px;
          margin-bottom: 14px;
        }
        .markdown-body h1 { font-size: 2.1em; font-weight: bold; }
        .markdown-body h2 { font-size: 1.6em; border-bottom: 1px solid #999; padding-bottom: 6px; }
        .markdown-body p {
          text-align: justify;
          margin-bottom: 14px;
        }
        .markdown-body blockquote {
          font-style: italic;
          margin: 18px 30px;
          padding-left: 15px;
          border-left: 2px solid #444;
          color: #333;
        }
        .markdown-body table {
          border-top: 2px solid #000;
          border-bottom: 2px solid #000;
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
        }
        .markdown-body table th {
          border-bottom: 1px solid #000;
          padding: 8px 12px;
          text-align: left;
          font-weight: bold;
        }
        .markdown-body table td {
          padding: 8px 12px;
          border-bottom: 1px dotted #ccc;
        }
        .markdown-body pre {
          background: #f9f9f9;
          border: 1px solid #ccc;
          padding: 12px;
          font-size: 12px;
          margin-bottom: 16px;
        }
        .markdown-body code {
          font-family: "Courier New", Courier, monospace;
          background: #f4f4f4;
          padding: 2px 4px;
        }
        .markdown-body pre code {
          background: transparent;
          padding: 0;
        }
      `
    case 'minimal':
      return `
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 15px;
          line-height: 1.65;
          color: #27272a;
          background: #ffffff;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
          font-weight: 600;
          color: #09090b;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        .markdown-body h1 { font-size: 1.85em; }
        .markdown-body h2 { font-size: 1.4em; }
        .markdown-body blockquote {
          border-left: 3px solid #e4e4e7;
          padding-left: 14px;
          color: #71717a;
          margin-bottom: 16px;
        }
        .markdown-body table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 18px;
        }
        .markdown-body table th, .markdown-body table td {
          padding: 8px 12px;
          border: 1px solid #e4e4e7;
        }
        .markdown-body pre {
          background: #fafafa;
          border: 1px solid #e4e4e7;
          border-radius: 6px;
          padding: 14px;
          margin-bottom: 16px;
        }
        .markdown-body code {
          background: #f4f4f5;
          padding: 2px 5px;
          border-radius: 4px;
          font-family: ui-monospace, Menlo, Consolas, monospace;
          font-size: 0.9em;
        }
        .markdown-body pre code {
          background: transparent;
          padding: 0;
        }
      `
    case 'github':
    default:
      return `
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
          font-size: 15px;
          line-height: 1.6;
          color: #1f2328;
          background-color: #ffffff;
        }
        .markdown-body h1 {
          font-size: 2em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #d1d9e0;
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .markdown-body h2 {
          font-size: 1.5em;
          padding-bottom: 0.3em;
          border-bottom: 1px solid #d1d9e0;
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .markdown-body h3 {
          font-size: 1.25em;
          margin-top: 24px;
          margin-bottom: 16px;
          font-weight: 600;
        }
        .markdown-body h4 { font-size: 1em; font-weight: 600; margin-top: 20px; margin-bottom: 12px; }
        .markdown-body p, .markdown-body ul, .markdown-body ol { margin-bottom: 16px; }
        .markdown-body blockquote {
          padding: 0 1em;
          color: #656d76;
          border-left: 0.25em solid #d0d7de;
          margin: 0 0 16px 0;
        }
        .markdown-body table {
          border-spacing: 0;
          border-collapse: collapse;
          margin-bottom: 16px;
          width: 100%;
          display: table;
        }
        .markdown-body table th, .markdown-body table td {
          padding: 6px 13px;
          border: 1px solid #d0d7de;
        }
        .markdown-body table tr:nth-child(2n) {
          background-color: #f6f8fa;
        }
        .markdown-body code {
          padding: 0.2em 0.4em;
          margin: 0;
          font-size: 85%;
          background-color: rgba(175, 184, 193, 0.2);
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
        }
        .markdown-body pre {
          padding: 16px;
          overflow: auto;
          font-size: 85%;
          line-height: 1.45;
          background-color: #f6f8fa;
          border-radius: 6px;
          border: 1px solid #d0d7de;
          margin-bottom: 16px;
        }
        .markdown-body pre code {
          padding: 0;
          background-color: transparent;
          border-radius: 0;
        }
        .markdown-body hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: #d0d7de;
          border: 0;
        }
      `
  }
}

export async function mdToPdf(options: MdToPdfOptions): Promise<string> {
  const {
    source,
    theme = 'github',
    pageSize = 'A4',
    landscape = false,
    marginType = 'default',
    scale,
    autoFit = true,
    title
  } = options

  // 1. Retrieve Markdown Content
  let rawMarkdown = ''
  let docTitle = title || 'Document'

  if (source.type === 'file' && source.filePath) {
    if (!fs.existsSync(source.filePath)) {
      throw new Error(`Markdown file not found: ${source.filePath}`)
    }
    rawMarkdown = fs.readFileSync(source.filePath, 'utf-8')
    if (!title) {
      docTitle = path.basename(source.filePath, path.extname(source.filePath))
    }
  } else if (source.type === 'markdown' && source.markdown) {
    rawMarkdown = source.markdown
  } else {
    throw new Error('Invalid source: must provide markdown text or file path.')
  }

  // 2. Parse Markdown to HTML with Marked & Highlight.js
  const renderer = new marked.Renderer()
  renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
    const validLang = lang && hljs.getLanguage(lang) ? lang : undefined
    const code = validLang
      ? hljs.highlight(text, { language: validLang, ignoreIllegals: true }).value
      : hljs.highlightAuto(text).value
    return `<pre><code class="hljs ${validLang ? `language-${validLang}` : ''}">${code}</code></pre>`
  }

  const parsedBody = await marked.parse(rawMarkdown, {
    gfm: true,
    breaks: true,
    renderer
  })

  // 3. Assemble Full Styled HTML Document
  const themeCss = getThemeStyles(theme)
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      width: 100%;
    }
    .markdown-body {
      padding: 24px 32px;
      max-width: 900px;
      margin: 0 auto;
      word-wrap: break-word;
    }
    ${HIGHLIGHT_JS_CSS}
    ${themeCss}

    @media print {
      body {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      .markdown-body {
        max-width: 100% !important;
        width: 100% !important;
        padding: 16px 20px;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      table, figure, pre, blockquote, img {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      img {
        max-width: 100% !important;
        height: auto !important;
      }
      pre, code {
        white-space: pre-wrap !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
      }
    }
  </style>
</head>
<body>
  <div class="markdown-body">
    ${parsedBody}
  </div>
</body>
</html>`

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
      reject(new Error('Markdown rendering timed out after 30 seconds.'))
    }, 30000)

    win.webContents.on('did-finish-load', async () => {
      try {
        await win.webContents
          .executeJavaScript(
            'document.fonts ? document.fonts.ready.then(() => true).catch(() => true) : Promise.resolve(true)'
          )
          .catch(() => true)

        await new Promise((r) => setTimeout(r, 400))

        // Calculate auto-fit printable dimensions
        const pageDim = PAGE_DIMENSIONS_INCHES[pageSize] || PAGE_DIMENSIONS_INCHES.A4
        const targetWidthInches = landscape ? pageDim.height : pageDim.width

        let marginAllowanceInches = 0.8
        if (marginType === 'none') {
          marginAllowanceInches = 0
        } else if (marginType === 'minimum') {
          marginAllowanceInches = 0.4
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
            printScale = Math.min(1.0, Math.max(0.3, (printableWidthPx / contentWidth) * 0.96))
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
        const outputPath = path.join(tempDir, `md-to-pdf-${Date.now()}.pdf`)
        fs.writeFileSync(outputPath, pdfBuffer)

        cleanup()
        resolve(outputPath)
      } catch (err: any) {
        cleanup()
        reject(new Error(`Markdown to PDF conversion failed: ${err.message}`))
      }
    })

    win.webContents.on('did-fail-load', (_event, _code, description, _url, isMainFrame) => {
      if (isMainFrame) {
        cleanup()
        reject(new Error(`Failed to render markdown: ${description}`))
      }
    })

    try {
      tempHtmlPath = path.join(
        os.tmpdir(),
        `md-src-${Date.now()}-${Math.random().toString(36).substring(7)}.html`
      )
      fs.writeFileSync(tempHtmlPath, fullHtml, 'utf-8')
      win.loadFile(tempHtmlPath)
    } catch (e: any) {
      cleanup()
      reject(e)
    }
  })
}
