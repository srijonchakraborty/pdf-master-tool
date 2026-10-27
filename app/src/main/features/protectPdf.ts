import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { getQpdfPath, getGhostscriptPath } from '../binaries'

export interface ProtectPdfOptions {
  filePath: string
  userPassword: string
  ownerPassword?: string
  permissions?: {
    printing?: boolean
    copying?: boolean
    modifying?: boolean
  }
}

export async function protectPdf(options: ProtectPdfOptions): Promise<string> {
  const { filePath, userPassword, ownerPassword, permissions = {} } = options
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-protected-${Date.now()}.pdf`)
  const ownerPw = ownerPassword || userPassword + '_owner'

  const qpdfPath = getQpdfPath()
  if (qpdfPath) {
    const permArgs: string[] = []
    if (permissions.printing === false) permArgs.push('--print=none')
    if (permissions.copying === false) permArgs.push('--extract=n')
    if (permissions.modifying === false) permArgs.push('--modify=none')

    return new Promise((resolve, reject) => {
      const args = [
        '--encrypt', userPassword, ownerPw, '256',
        ...permArgs,
        '--', filePath, outputPath
      ]
      execFile(qpdfPath, args, { timeout: 60000 }, (err, _stdout, stderr) => {
        if (err) return reject(new Error(`qpdf error: ${err.message}\n${stderr}`))
        resolve(outputPath)
      })
    })
  }

  // Fallback to Ghostscript
  const gsPath = getGhostscriptPath()
  if (!gsPath) throw new Error('Neither qpdf nor Ghostscript could be found to encrypt the PDF.')

  return new Promise((resolve, reject) => {
    const args = [
      '-q', '-dNOPAUSE', '-dBATCH',
      '-sDEVICE=pdfwrite',
      `-sUserPassword=${userPassword}`,
      `-sOwnerPassword=${ownerPw}`,
      `-sOutputFile=${outputPath}`,
      filePath
    ]
    execFile(gsPath, args, { timeout: 60000 }, (err, _stdout, stderr) => {
      if (err) return reject(new Error(`Ghostscript protection error: ${err.message}\n${stderr}`))
      resolve(outputPath)
    })
  })
}
