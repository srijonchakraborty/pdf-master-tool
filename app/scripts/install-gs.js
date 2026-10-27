const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sevenBin = require('7zip-bin');

const GS_URL = 'https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10031/gs10031w64.exe';
const GS_INSTALLER = path.join(__dirname, '..', 'gs_installer.exe');
const EXTRACT_DIR = path.join(__dirname, '..', 'gs_temp');
const TARGET_DIR = path.join(__dirname, '..', 'resources', 'win', 'gs', 'bin');

console.log('Downloading Ghostscript installer...');
const file = fs.createWriteStream(GS_INSTALLER);

https.get(GS_URL, (response) => {
  if (response.statusCode === 302 || response.statusCode === 301) {
    // Follow redirect
    https.get(response.headers.location, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          setTimeout(extract, 500); // Wait a bit for file to be released
        });
      });
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        setTimeout(extract, 500);
      });
    });
  }
}).on('error', (err) => {
  fs.unlink(GS_INSTALLER, () => {});
  console.error('Download error:', err.message);
});

function extract() {
  console.log('Extracting installer using 7za...');
  try {
    if (fs.existsSync(EXTRACT_DIR)) {
      fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    
    // Using 7za to extract NSIS installer
    execSync(`"${sevenBin.path7za}" x "${GS_INSTALLER}" -o"${EXTRACT_DIR}" -y`, { stdio: 'inherit' });
    
    console.log('Copying binaries to resources...');
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
    }
    
    const binDir = path.join(EXTRACT_DIR, '$PLUGINSDIR'); 
    // Wait! In NSIS installers, the actual files are usually in $_OUTDIR or directly in the extracted root.
    // Let me first extract it and see where it goes.
    console.log('Done extracting. Let me check the structure.');
    
  } catch (err) {
    console.error('Extraction error:', err.message);
  }
}
