Add-Type -AssemblyName System.Drawing

function Resize-SquareImage($srcPath, $destPath, $size) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $size, $size)
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
}

function Resize-AspectImage($srcPath, $destPath, $width, $height, $iconSize) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $x = [int](($width - $iconSize) / 2)
    $y = [int](($height - $iconSize) / 2)
    $g.DrawImage($src, $x, $y, $iconSize, $iconSize)
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
}

$buildDir = Split-Path -Parent $PSScriptRoot
$appxDir = Join-Path $buildDir "build\appx"
if (-not (Test-Path $appxDir)) {
    New-Item -ItemType Directory -Path $appxDir -Force | Out-Null
}

$src = Join-Path $buildDir "build\icon.png"

Resize-SquareImage $src (Join-Path $appxDir "StoreLogo.png") 50
Resize-SquareImage $src (Join-Path $appxDir "Square44x44Logo.png") 44
Resize-SquareImage $src (Join-Path $appxDir "Square150x150Logo.png") 150
Resize-AspectImage $src (Join-Path $appxDir "Wide310x150Logo.png") 310 150 130
Resize-SquareImage $src (Join-Path $appxDir "LargeTile.png") 310
Resize-SquareImage $src (Join-Path $appxDir "SmallTile.png") 71
Resize-SquareImage $src (Join-Path $appxDir "BadgeLogo.png") 24
Resize-AspectImage $src (Join-Path $appxDir "SplashScreen.png") 620 300 200

Write-Host "AppX visual assets generated successfully in: $appxDir"
Get-ChildItem $appxDir | Select-Object Name, Length
