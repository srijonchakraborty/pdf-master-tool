import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function PowerpointToPdfPage() {
  return (
    <SimpleConvertPage
      title="PowerPoint to PDF"
      description="Convert a PPTX or PPT file into a PDF presentation."
      acceptTypes=".pptx,.ppt"
      convertFn={(p) => window.api.powerpointToPdf(p)}
      outputExtension="pdf"
      processingMessage="Converting presentation to PDF..."
    />
  )
}
