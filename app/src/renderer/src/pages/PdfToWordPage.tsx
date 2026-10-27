import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function PdfToWordPage() {
  return (
    <SimpleConvertPage
      title="PDF to Word"
      description="Convert a PDF document into an editable DOCX Word file."
      acceptTypes=".pdf"
      convertFn={(p) => window.api.pdfToWord(p)}
      outputExtension="docx"
      processingMessage="Converting PDF to Word document..."
    />
  )
}
