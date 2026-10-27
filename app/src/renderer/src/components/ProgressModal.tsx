import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface ProgressModalProps {
  isOpen: boolean
  title: string
  status: string
  progress?: number // 0-100, if undefined, shows indeterminate
  onCancel?: () => void
}

export function ProgressModal({ isOpen, title, status, progress, onCancel }: ProgressModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-secondary border border-border p-6 rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                {progress === undefined && <Loader2 className="w-5 h-5 animate-spin text-accent" />}
                <h3 className="text-foreground font-semibold text-lg">{title}</h3>
              </div>
              
              <p className="text-muted text-sm">{status}</p>
              
              {progress !== undefined && (
                <div className="w-full bg-elevated rounded-full h-2 overflow-hidden">
                  <motion.div 
                    className="bg-accent h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                  />
                </div>
              )}

              {onCancel && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={onCancel}
                    className="text-sm font-medium text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded hover:bg-elevated"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
