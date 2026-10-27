import { Toaster } from 'sonner'
import { useAppStore } from '../store/appStore'

export function ToastProvider() {
  const { theme } = useAppStore()

  return (
    <Toaster 
      theme={theme}
      position="bottom-right"
      toastOptions={{
        className: 'border-border bg-secondary text-foreground font-sans',
        descriptionClassName: 'text-muted',
        actionButtonStyle: {
          background: 'var(--accent)',
          color: 'white',
        }
      }}
    />
  )
}
