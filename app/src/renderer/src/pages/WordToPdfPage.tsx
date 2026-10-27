import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function WordToPdfPage() {
  return (
    <SimpleConvertPage
      title="Word to PDF"
      description="Convert a DOCX or DOC file into a PDF document."
      acceptTypes=".docx,.doc,.odt"
      convertFn={(p) => window.api.wordToPdf(p)}
      outputExtension="pdf"
      processingMessage="Converting document to PDF..."
    />
  )
}
