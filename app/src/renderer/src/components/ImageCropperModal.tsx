import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../utils/cropImage'
import { PrimaryButton } from './PrimaryButton'
import { X } from 'lucide-react'
import { toast } from 'sonner'

interface ImageCropperModalProps {
  imageSrc: string
  onClose: () => void
  onSave: (croppedDataUrl: string) => void
}

export function ImageCropperModal({ imageSrc, onClose, onSave }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, 0)
      onSave(croppedImage)
    } catch (e) {
      console.error(e)
      toast.error('Failed to crop image')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4 sm:p-8">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
          <h2 className="text-xl font-semibold text-foreground">Crop & Zoom</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-muted hover:text-foreground transition-colors rounded hover:bg-elevated"
            disabled={isProcessing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-neutral-900 w-full h-full min-h-[300px]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={undefined} /* Free crop aspect ratio */
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            classes={{ containerClassName: 'h-full w-full' }}
          />
        </div>

        {/* Controls & Actions */}
        <div className="p-4 border-t border-border bg-secondary/50 space-y-4">
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <span className="text-sm font-medium text-foreground">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
            <button 
              onClick={onClose} 
              className="px-4 py-2 rounded font-medium text-sm border border-border hover:bg-elevated transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <PrimaryButton 
              onClick={handleSave} 
              className="px-6"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}
