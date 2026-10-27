import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFile } from 'child_process'
import { getQpdfPath, getGhostscriptPath } from '../binaries'

export async function unlockPdf(filePath: string, password: string): Promise<string> {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

  const tempDir = os.tmpdir()
  const baseName = path.basename(filePath, '.pdf')
  const outputPath = path.join(tempDir, `${baseName}-unlocked-${Date.now()}.pdf`)

  const qpdfPath = getQpdfPath()
  if (qpdfPath) {
    return new Promise((resolve, reject) => {
      const args = ['--decrypt', `--password=${password}`, filePath, outputPath]
      execFile(qpdfPath, args, { timeout: 60000 }, (err, _stdout, stderr) => {
        if (err) {
          if (stderr.includes('invalid password') || stderr.includes('incorrect password') || err.message.includes('password')) {
            return reject(new Error('WRONG_PASSWORD'))
          }
          return reject(new Error(`qpdf error: ${err.message}\n${stderr}`))
        }
        resolve(outputPath)
      })
    })
  }

  // Fallback to Ghostscript
  const gsPath = getGhostscriptPath()
  if (!gsPath) throw new Error('Neither qpdf nor Ghostscript could be found to decrypt the PDF.')

  return new Promise((resolve, reject) => {
    const args = [
      '-q', '-dNOPAUSE', '-dBATCH',
      '-sDEVICE=pdfwrite',
      `-sUserPassword=${password}`,
      `-sOutputFile=${outputPath}`,
      filePath
    ]
    execFile(gsPath, args, { timeout: 60000 }, (err, _stdout, stderr) => {
      if (err) {
        if (stderr.includes('password') || err.message.includes('password')) {
          return reject(new Error('WRONG_PASSWORD'))
        }
        return reject(new Error(`Ghostscript decryption error: ${err.message}\n${stderr}`))
      }
      resolve(outputPath)
    })
  })
}
