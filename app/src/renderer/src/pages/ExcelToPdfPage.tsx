import { SimpleConvertPage } from '../components/SimpleConvertPage'

export function ExcelToPdfPage() {
  return (
    <SimpleConvertPage
      title="Excel to PDF"
      description="Convert an XLSX or XLS spreadsheet into a PDF document."
      acceptTypes=".xlsx,.xls,.csv"
      convertFn={(p) => window.api.excelToPdf(p)}
      outputExtension="pdf"
      processingMessage="Converting spreadsheet to PDF..."
    />
  )
}
