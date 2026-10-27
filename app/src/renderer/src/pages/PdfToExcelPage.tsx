import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function PdfToExcelPage() {
  return (
    <SimpleConvertPage
      title="PDF to Excel"
      description="Convert a PDF document into an XLSX Excel spreadsheet."
      acceptTypes=".pdf"
      convertFn={(p) => window.api.pdfToExcel(p)}
      outputExtension="xlsx"
      processingMessage="Converting PDF to Excel spreadsheet..."
    />
  )
}
