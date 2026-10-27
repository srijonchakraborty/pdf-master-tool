import { useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { MergeOrganizePdfPage } from './pages/MergeOrganizePdfPage'
import { MergePdfPage } from './pages/MergePdfPage'
import { SplitPdfPage } from './pages/SplitPdfPage'
import { CompressPdfPage } from './pages/CompressPdfPage'
import { RotatePdfPage } from './pages/RotatePdfPage'
import { WatermarkPdfPage } from './pages/WatermarkPdfPage'
import { AddPageNumbersPage } from './pages/AddPageNumbersPage'
import { OrganizePdfPage } from './pages/OrganizePdfPage'
import { JpgToPdfPage } from './pages/JpgToPdfPage'
import { PdfToJpgPage } from './pages/PdfToJpgPage'
import { UnlockPdfPage } from './pages/UnlockPdfPage'
import { ProtectPdfPage } from './pages/ProtectPdfPage'
import { RepairPdfPage } from './pages/RepairPdfPage'
import { PdfToPdfaPage } from './pages/PdfToPdfaPage'
import { PdfToWordPage } from './pages/PdfToWordPage'
import { PdfToPowerpointPage } from './pages/PdfToPowerpointPage'
import { PdfToExcelPage } from './pages/PdfToExcelPage'
import { WordToPdfPage } from './pages/WordToPdfPage'
import { PowerpointToPdfPage } from './pages/PowerpointToPdfPage'
import { ExcelToPdfPage } from './pages/ExcelToPdfPage'
import { HtmlToPdfPage } from './pages/HtmlToPdfPage'
import { MdToPdfPage } from './pages/MdToPdfPage'
import { CropPdfPage } from './pages/CropPdfPage'
import { SignPdfPage } from './pages/SignPdfPage'
import { RedactPdfPage } from './pages/RedactPdfPage'
import { PdfFormsPage } from './pages/PdfFormsPage'
import { OcrPdfPage } from './pages/OcrPdfPage'
import { ComparePdfPage } from './pages/ComparePdfPage'
import { TranslatePdfPage } from './pages/TranslatePdfPage'
import { EditPdfPage } from './pages/EditPdfPage'
import { ScanToPdfPage } from './pages/ScanToPdfPage'
import { OptimizePdfForWebPage } from './pages/OptimizePdfForWebPage'
import { ExtractAssetsPage } from './pages/ExtractAssetsPage'
import { EpubToPdfPage } from './pages/EpubToPdfPage'
import { SpellcheckPdfPage } from './pages/SpellcheckPdfPage'
import { PdfToTextPage } from './pages/PdfToTextPage'
import { PdfReaderPage } from './pages/PdfReaderPage'
import { TopNavbar } from './components/TopNavbar'
import { ComingSoonPage } from './components/ComingSoonPage'
import { useAppStore } from './store/appStore'
import { ToastProvider } from './components/ToastProvider'

function App() {
  const { currentToolId, theme } = useAppStore()

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
  }, [theme])

  const renderContent = () => {
    if (currentToolId === null) return <Dashboard />

    switch (currentToolId) {
      // Unified Merge & Organize
      case 'merge-organize-pdf':
      case 'merge-pdf':
      case 'organize-pdf':      return <MergeOrganizePdfPage />
      case 'split-pdf':         return <SplitPdfPage />
      case 'rotate-pdf':        return <RotatePdfPage />
      case 'watermark-pdf':     return <WatermarkPdfPage />
      case 'add-page-numbers':  return <AddPageNumbersPage />
      case 'jpg-to-pdf':        return <JpgToPdfPage />
      case 'pdf-to-jpg':        return <PdfToJpgPage />
      case 'html-to-pdf':       return <HtmlToPdfPage />
      case 'md-to-pdf':         return <MdToPdfPage />
      case 'crop-pdf':          return <CropPdfPage />

      // Phase 3 — binary-based
      case 'unlock-pdf':        return <UnlockPdfPage />
      case 'protect-pdf':       return <ProtectPdfPage />
      case 'pdf-to-pdfa':       return <PdfToPdfaPage />
      case 'pdf-to-word':       return <PdfToWordPage />
      case 'pdf-to-powerpoint': return <PdfToPowerpointPage />
      case 'pdf-to-excel':      return <PdfToExcelPage />
      case 'word-to-pdf':       return <WordToPdfPage />
      case 'powerpoint-to-pdf': return <PowerpointToPdfPage />
      case 'excel-to-pdf':      return <ExcelToPdfPage />

      // Phase 4 — Advanced
      case 'sign-pdf':          return <SignPdfPage />
      case 'redact-pdf':        return <RedactPdfPage />
      case 'pdf-forms':         return <PdfFormsPage />
      case 'ocr-pdf':           return <OcrPdfPage />

      // Phase 4 — Final features
      case 'edit-pdf':          return <EditPdfPage />
      case 'scan-to-pdf':       return <ScanToPdfPage />
      
      // Optimize & Recover
      case 'compress-pdf':      return <CompressPdfPage />
      case 'repair-pdf':        return <RepairPdfPage />
      case 'compare-pdf':       return <ComparePdfPage />
      case 'translate-pdf':     return <TranslatePdfPage />

      // New features
      case 'optimize-pdf-for-web': return <OptimizePdfForWebPage />
      case 'extract-assets':       return <ExtractAssetsPage />
      case 'epub-to-pdf':          return <EpubToPdfPage />
      case 'spellcheck-pdf':       return <SpellcheckPdfPage />
      case 'pdf-to-text':          return <PdfToTextPage />

      // PDF Reader & Viewer (Adobe Style)
      case 'pdf-reader':           return <PdfReaderPage />

      default:
        return (
          <div className="flex-1 p-8 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-4">Tool Not Found</h2>
            <p className="text-muted mb-8">The tool '{currentToolId}' could not be found.</p>
            <button
              className="px-6 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              onClick={() => useAppStore.getState().setCurrentToolId(null)}
            >
              Back to Dashboard
            </button>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground selection:bg-accent/30 font-sans">
      <TopNavbar />
      <div className="flex-1 flex overflow-hidden">
        {currentToolId !== 'pdf-reader' && <Sidebar />}
        <main className="flex-1 flex flex-col relative bg-background overflow-hidden">
          {renderContent()}
        </main>
      </div>
      <ToastProvider />
    </div>
  )
}

export default App
