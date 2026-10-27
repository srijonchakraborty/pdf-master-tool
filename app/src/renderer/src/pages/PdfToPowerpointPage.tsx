import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function PdfToPowerpointPage() {
  return (
    <SimpleConvertPage
      title="PDF to PowerPoint"
      description="Convert a PDF document into an editable PPTX PowerPoint presentation."
      acceptTypes=".pdf"
      convertFn={(p) => window.api.pdfToPowerpoint(p)}
      outputExtension="pptx"
      processingMessage="Converting PDF to PowerPoint presentation..."
    />
  )
}
