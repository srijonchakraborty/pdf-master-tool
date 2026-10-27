import { AlertTriangle, Terminal } from 'lucide-react'

interface InstallBannerProps {
  binaryName: string
  windowsCmd: string
  macCmd: string
  linuxCmd: string
}

export function InstallBanner({ binaryName, windowsCmd, macCmd, linuxCmd }: InstallBannerProps) {
  return (
    <div className="bg-danger/10 border border-danger/20 rounded-xl p-6 text-foreground flex flex-col gap-4">
      <div className="flex items-center gap-3 text-danger">
        <AlertTriangle className="w-6 h-6" />
        <h3 className="font-semibold text-lg">{binaryName} is required for this feature</h3>
      </div>
      
      <p className="text-muted text-sm max-w-3xl">
        This tool relies on the external <span className="font-mono text-foreground bg-elevated px-1 py-0.5 rounded">{binaryName}</span> library, which is not currently installed or available on your system's PATH. 
        Please install it using your system's package manager and then restart this application.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
        <div className="bg-elevated p-4 rounded-lg border border-border">
          <h4 className="text-xs font-semibold uppercase text-muted mb-2">Windows (winget)</h4>
          <div className="flex items-center gap-2 bg-background p-2 rounded text-sm font-mono border border-border">
            <Terminal className="w-4 h-4 text-muted shrink-0" />
            <span className="truncate">{windowsCmd}</span>
          </div>
        </div>

        <div className="bg-elevated p-4 rounded-lg border border-border">
          <h4 className="text-xs font-semibold uppercase text-muted mb-2">macOS (Homebrew)</h4>
          <div className="flex items-center gap-2 bg-background p-2 rounded text-sm font-mono border border-border">
            <Terminal className="w-4 h-4 text-muted shrink-0" />
            <span className="truncate">{macCmd}</span>
          </div>
        </div>

        <div className="bg-elevated p-4 rounded-lg border border-border">
          <h4 className="text-xs font-semibold uppercase text-muted mb-2">Linux (APT)</h4>
          <div className="flex items-center gap-2 bg-background p-2 rounded text-sm font-mono border border-border">
            <Terminal className="w-4 h-4 text-muted shrink-0" />
            <span className="truncate">{linuxCmd}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
