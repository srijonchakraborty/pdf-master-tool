import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

// Helper to check if a command exists in PATH
function isCommandAvailable(command: string): boolean {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`
    execSync(checkCmd, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Helper to check if a file exists
function exists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

export function getGhostscriptPath(): string | null {
  // First, check the bundled Ghostscript binary we injected
  const bundledGsPath = path.join(process.resourcesPath, 'win', 'gs', 'bin', 'gswin64c.exe')
  const localGsPath = path.join(app.getAppPath(), 'resources', 'win', 'gs', 'bin', 'gswin64c.exe')
  const localAppGsPath = path.join(app.getAppPath(), '..', 'resources', 'win', 'gs', 'bin', 'gswin64c.exe')
  const outDirLocalGs = path.join(__dirname, '..', '..', 'resources', 'win', 'gs', 'bin', 'gswin64c.exe')

  if (exists(bundledGsPath)) return bundledGsPath
  if (exists(localGsPath)) return localGsPath
  if (exists(localAppGsPath)) return localAppGsPath
  if (exists(outDirLocalGs)) return outDirLocalGs

  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    const candidateParentDirs = [
      path.join(programFiles, 'gs'),
      path.join(programFilesX86, 'gs'),
      path.join(programFiles, 'Ghostscript'),
      path.join(programFilesX86, 'Ghostscript'),
      'C:\\gs',
      'C:\\Program Files\\gs',
      'C:\\Program Files (x86)\\gs'
    ]

    for (const parentDir of candidateParentDirs) {
      if (exists(parentDir)) {
        try {
          const versions = fs.readdirSync(parentDir)
          for (const ver of versions) {
            const exes = [
              path.join(parentDir, ver, 'bin', 'gswin64c.exe'),
              path.join(parentDir, ver, 'bin', 'gswin32c.exe'),
              path.join(parentDir, 'bin', 'gswin64c.exe'),
              path.join(parentDir, 'gswin64c.exe')
            ]
            for (const exe of exes) {
              if (exists(exe)) return exe
            }
          }
        } catch {}
      }
    }

    if (isCommandAvailable('gswin64c')) return 'gswin64c'
    if (isCommandAvailable('gswin32c')) return 'gswin32c'
    if (isCommandAvailable('gs')) return 'gs'
    return null
  } else {
    if (isCommandAvailable('gs')) return 'gs'
    return null
  }
}

export function getQpdfPath(): string | null {
  // Check qpdf-bin npm package if installed
  try {
    const qpdfBin = require('qpdf-bin')
    if (qpdfBin && exists(qpdfBin.path || qpdfBin)) {
      return qpdfBin.path || qpdfBin
    }
  } catch {}

  // Check bundled resource path
  const bundledPath = path.join(process.resourcesPath, 'win', 'qpdf', 'bin', 'qpdf.exe')
  const localPath = path.join(app.getAppPath(), 'resources', 'win', 'qpdf', 'bin', 'qpdf.exe')
  if (exists(bundledPath)) return bundledPath
  if (exists(localPath)) return localPath

  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    
    const candidatePaths = [
      path.join(programFiles, 'qpdf', 'bin', 'qpdf.exe'),
      path.join(programFilesX86, 'qpdf', 'bin', 'qpdf.exe'),
      'C:\\qpdf\\bin\\qpdf.exe',
      'C:\\Program Files\\qpdf\\bin\\qpdf.exe'
    ]

    for (const cand of candidatePaths) {
      if (exists(cand)) return cand
    }

    if (isCommandAvailable('qpdf')) return 'qpdf'
    return null
  } else {
    if (isCommandAvailable('qpdf')) return 'qpdf'
    return null
  }
}

export function getLibreOfficePath(): string | null {
  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const soffice = path.join(programFiles, 'LibreOffice', 'program', 'soffice.exe')
    if (exists(soffice)) return soffice
    if (isCommandAvailable('soffice')) return 'soffice'
    return null
  } else if (process.platform === 'darwin') {
    const macSoffice = '/Applications/LibreOffice.app/Contents/MacOS/soffice'
    if (exists(macSoffice)) return macSoffice
    if (isCommandAvailable('soffice')) return 'soffice'
    return null
  } else {
    if (isCommandAvailable('libreoffice')) return 'libreoffice'
    if (isCommandAvailable('soffice')) return 'soffice'
    return null
  }
}
