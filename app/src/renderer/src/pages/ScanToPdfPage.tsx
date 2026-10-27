import { useState, useRef, useEffect } from 'react'
import { Camera, Download, Trash2, VideoOff, RefreshCw } from 'lucide-react'
import { PrimaryButton } from '../components/PrimaryButton'
import { toast } from 'sonner'
import { PDFDocument } from 'pdf-lib'

export function ScanToPdfPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [captures, setCaptures] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Enumerate all available camera devices
  const getCameraDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput')
      setDevices(videoDevices)
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId)
      }
    } catch (err) {
      console.warn('Failed to enumerate media devices:', err)
    }
  }

  // Stop camera stream & release all media resources / turn off hardware light
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      streamRef.current = null
    }
    setStream(null)
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Start camera stream for selected device
  const startCamera = async (deviceId?: string) => {
    stopCamera()
    const targetId = deviceId || selectedDeviceId
    try {
      const constraints: MediaStreamConstraints = {
        video: targetId
          ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = mediaStream
      setStream(mediaStream)
      // Re-enumerate to get device labels if permission was just granted
      await getCameraDevices()
    } catch (err: any) {
      toast.error(`Could not access camera: ${err.message}`)
    }
  }

  // Whenever stream changes, attach it to the video element and play
  useEffect(() => {
    if (!videoRef.current) return
    if (stream) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.srcObject = null
    }
  }, [stream])

  // Initialize camera & setup unmount cleanup
  useEffect(() => {
    getCameraDevices()
    startCamera()

    return () => {
      // Ensure all camera resources are freed when leaving the page
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  // Switch camera device
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    startCamera(deviceId)
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      setCaptures(prev => [...prev, dataUrl])
      toast.success('Page captured!')
    }
  }

  const removeCapture = (index: number) => {
    setCaptures(prev => prev.filter((_, i) => i !== index))
  }

  const generatePDF = async () => {
    if (captures.length === 0) return
    setIsProcessing(true)
    
    try {
      const pdfDoc = await PDFDocument.create()
      
      for (const captureUrl of captures) {
        // captureUrl is a data URL (data:image/jpeg;base64,...)
        // In some Electron sandboxes, fetch() fails on large data URLs.
        // We can just extract the base64 part and pass it directly to pdf-lib.
        const base64Data = captureUrl.split(',')[1]
        const image = await pdfDoc.embedJpg(base64Data)
        
        const page = pdfDoc.addPage([image.width, image.height])
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        })
      }

      const pdfBytes = await pdfDoc.save()
      
      const defaultName = `Scanned_Document_${new Date().toISOString().split('T')[0]}.pdf`
      const saveRes = await window.api.saveFileFromBuffer(pdfBytes, defaultName)

      if (saveRes.canceled) {
        toast.info('Save canceled.')
      } else if (saveRes.success) {
        toast.success('Scanned PDF saved successfully!')
        setCaptures([])
      } else {
        throw new Error(saveRes.error)
      }
    } catch (err: any) {
      toast.error(`Error saving PDF: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-y-auto scrollbar-thin p-8">
      <div className="max-w-4xl mx-auto w-full space-y-8 pb-12">
        <header className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Scan to PDF</h1>
            <p className="text-muted">Use your camera to scan documents and convert them to PDF.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Camera View */}
          <div className="space-y-4">
            {/* Camera Select & Control Header */}
            <div className="flex items-center justify-between gap-2 bg-secondary p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Camera className="w-4 h-4 text-accent shrink-0" />
                <select
                  value={selectedDeviceId}
                  onChange={e => handleDeviceChange(e.target.value)}
                  className="bg-background text-foreground text-xs rounded border border-border p-1.5 outline-none w-full truncate"
                >
                  {devices.length === 0 ? (
                    <option value="">Default Camera</option>
                  ) : (
                    devices.map((device, i) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${i + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startCamera()}
                  className="p-1.5 text-muted hover:text-foreground rounded hover:bg-background"
                  title="Refresh Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                {stream ? (
                  <button
                    onClick={stopCamera}
                    className="p-1.5 text-danger hover:bg-danger/10 rounded"
                    title="Turn Off Camera"
                  >
                    <VideoOff className="w-4 h-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center border border-border">
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  disablePictureInPicture
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-muted flex flex-col items-center">
                  <Camera className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Camera inactive</p>
                  <PrimaryButton onClick={() => startCamera()} className="mt-4 px-4 py-2 text-xs">
                    Enable Camera
                  </PrimaryButton>
                </div>
              )}
            </div>
            
            <div className="flex justify-center">
              <PrimaryButton 
                onClick={captureFrame} 
                disabled={!stream}
                className="px-8 py-3 w-full md:w-auto text-base"
              >
                <Camera className="w-5 h-5 mr-2" />
                Capture Page
              </PrimaryButton>
            </div>
          </div>

          {/* Captured Pages */}
          <div className="bg-secondary p-6 rounded-2xl border border-border flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground">Scanned Pages ({captures.length})</h3>
              {captures.length > 0 && (
                <PrimaryButton onClick={generatePDF} disabled={isProcessing}>
                  {isProcessing ? 'Saving...' : 'Save as PDF'}
                  <Download className="w-4 h-4 ml-2" />
                </PrimaryButton>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 pr-2 max-h-[500px]">
              {captures.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center text-muted border-2 border-dashed border-border rounded-xl p-8 text-center text-sm">
                  Capture your first page using the camera to see it here.
                </div>
              ) : (
                captures.map((cap, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-border bg-background shadow-sm">
                    <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold z-10 backdrop-blur-sm">
                      Page {i + 1}
                    </div>
                    <img src={cap} alt={`Capture ${i + 1}`} className="w-full h-auto" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => removeCapture(i)} className="p-3 bg-danger text-white rounded-full hover:bg-red-600 transition-transform hover:scale-110 shadow-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}

