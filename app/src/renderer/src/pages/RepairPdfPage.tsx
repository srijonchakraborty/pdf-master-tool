import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function RepairPdfPage() {
  return (
    <SimpleConvertPage
      title="Repair PDF"
      description="Fix a corrupted or damaged PDF file and restore it to a readable state."
      acceptTypes=".pdf"
      convertFn={(p) => window.api.repairPdf(p)}
      outputExtension="pdf"
      outputName="repaired"
      processingMessage="Attempting to repair the PDF..."
      tip="This tool cleans up corrupted object streams and bad xref tables to make the PDF readable again."
    />
  )
}
