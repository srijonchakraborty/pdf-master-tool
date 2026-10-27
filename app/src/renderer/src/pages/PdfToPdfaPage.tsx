import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function PdfToPdfaPage() {
  return (
    <SimpleConvertPage
      title="PDF to PDF/A"
      description="Convert a standard PDF into a PDF/A compliant document for long-term archiving."
      acceptTypes=".pdf"
      convertFn={(p) => window.api.pdfToPdfa(p)}
      outputExtension="pdf"
      outputName="pdfa_compliant"
      processingMessage="Converting to PDF/A compliant document..."
    />
  )
}
