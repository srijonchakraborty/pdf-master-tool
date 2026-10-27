param(
    [string]$AppxPath = "",
    [string]$Publisher = "CN=PDFMasterToolkit"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $PSScriptRoot
if (-not $AppxPath) {
    $AppxPath = Join-Path $scriptDir "dist\pdf-toolkit-1.0.0.appx"
}

if (-not (Test-Path $AppxPath)) {
    Write-Error "AppX file not found at: $AppxPath. Please run npm run build:store first."
    exit 1
}

Write-Host "Checking for Code Signing Certificate for $Publisher..."
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -eq $Publisher } | Select-Object -First 1

if (-not $cert) {
    Write-Host "Creating self-signed code signing certificate for $Publisher..."
    $cert = New-SelfSignedCertificate -Type Custom `
        -Subject $Publisher `
        -KeyUsage DigitalSignature `
        -FriendlyName "PDF Master Toolkit Local Test" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
}

Write-Host "Ensuring certificate is trusted in CurrentUser\TrustedPeople for local installation..."
$trusted = Get-ChildItem Cert:\CurrentUser\TrustedPeople | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if (-not $trusted) {
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPeople", "CurrentUser")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
}

$signtoolItem = Get-ChildItem -Path "$env:LOCALAPPDATA\electron-builder\Cache" -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match "x64" } |
    Select-Object -First 1

if (-not $signtoolItem) {
    Write-Error "Could not find signtool.exe in electron-builder cache."
    exit 1
}

$signtool = $signtoolItem.FullName
Write-Host "Signing $AppxPath using $signtool..."
& $signtool sign /fd SHA256 /sha1 $cert.Thumbprint (Resolve-Path $AppxPath).Path

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host " Successfully signed AppX for local testing!" -ForegroundColor Green
    Write-Host " File: $AppxPath" -ForegroundColor Green
    Write-Host " You can now double-click this .appx file to install it directly!" -ForegroundColor Green
    Write-Host " (Note: For Microsoft Store submission, upload the unsigned or signed .appx directly to Microsoft Partner Center - Microsoft signs it upon release.)" -ForegroundColor Yellow
    Write-Host "=================================================================" -ForegroundColor Green
} else {
    Write-Error "Signing failed with exit code $LASTEXITCODE"
}
