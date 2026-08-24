<#
  ROBO4 — build once, flash every module over Wi-Fi. No USB cable.

  Usage:
    .\tools\flash-all.ps1                          # build + flash mod1..mod4
    .\tools\flash-all.ps1 -Hosts mod2,mod3         # only these
    .\tools\flash-all.ps1 -NoBuild                 # reuse the last build
    .\tools\flash-all.ps1 -Bin C:\path\fw.ino.bin  # flash an existing .bin

  Requires arduino-cli (https://arduino.github.io/arduino-cli) for the build step:
    arduino-cli core install esp32:esp32
    arduino-cli lib install SCServo        # or drop the Waveshare SCServo lib in ~/Documents/Arduino/libraries
  curl.exe (built into Windows 10+) does the upload.

  If you'd rather use the Arduino IDE: Sketch -> Export Compiled Binary, then run this
  with -NoBuild -Bin <that .bin>, or just drag the .bin onto http://mod1.local/ -> OTA tab.
#>
param(
  [string[]]$Hosts   = @('mod1','mod2','mod3','mod4'),
  [string]  $Sketch  = "$PSScriptRoot\..\firmware\esp32_multi",
  [string]  $Fqbn    = 'esp32:esp32:esp32c3:PartitionScheme=default,CDCOnBoot=cdc',
  [string]  $Bin     = '',
  [switch]  $NoBuild,
  [int]     $TimeoutSec = 120
)

$ErrorActionPreference = 'Stop'
$Sketch = (Resolve-Path $Sketch).Path

if (-not $NoBuild -and -not $Bin) {
  Write-Host "building $Sketch" -ForegroundColor Cyan
  arduino-cli compile --fqbn $Fqbn --export-binaries $Sketch
  if ($LASTEXITCODE -ne 0) { throw "arduino-cli compile failed" }
}

if (-not $Bin) {
  $found = Get-ChildItem -Path (Join-Path $Sketch 'build') -Recurse -Filter '*.ino.bin' -ErrorAction SilentlyContinue |
           Where-Object { $_.Name -notmatch 'bootloader|partitions|merged' } |
           Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $found) { throw "no .ino.bin found under $Sketch\build — build first, or pass -Bin" }
  $Bin = $found.FullName
}
if (-not (Test-Path $Bin)) { throw "binary not found: $Bin" }

$kb = [int]((Get-Item $Bin).Length / 1KB)
Write-Host "firmware: $Bin ($kb kB)" -ForegroundColor Cyan

$ok = @(); $bad = @()
foreach ($h in $Hosts) {
  $url = "http://$h.local/api/ota"
  Write-Host "`n--> $h" -ForegroundColor Yellow

  # Reachable at all? (also tells us which firmware is currently on it)
  try {
    $health = Invoke-RestMethod -Uri "http://$h.local/api/health" -TimeoutSec 4
    Write-Host "    online, fw $($health.fw) at $($health.ip)"
  } catch {
    Write-Host "    OFFLINE - skipped ($($_.Exception.Message))" -ForegroundColor Red
    $bad += $h; continue
  }

  # curl.exe handles the multipart upload; the board de-torques its servos,
  # releases its magnets, writes the new image and reboots into it.
  & curl.exe --silent --show-error --fail --max-time $TimeoutSec -F "f=@$Bin" $url
  if ($LASTEXITCODE -eq 0) {
    Write-Host "`n    flashed, rebooting" -ForegroundColor Green
    $ok += $h
  } else {
    Write-Host "`n    UPLOAD FAILED (curl exit $LASTEXITCODE)" -ForegroundColor Red
    $bad += $h
  }
}

Write-Host "`n=== flashed: $($ok -join ', ') ===" -ForegroundColor Green
if ($bad.Count) { Write-Host "=== failed/skipped: $($bad -join ', ') ===" -ForegroundColor Red }

if ($ok.Count) {
  Write-Host "waiting 12 s for reboots..."
  Start-Sleep -Seconds 12
  foreach ($h in $ok) {
    try {
      $v = Invoke-RestMethod -Uri "http://$h.local/api/health" -TimeoutSec 5
      Write-Host ("  {0,-6} back up, fw {1}" -f $h, $v.fw) -ForegroundColor Green
    } catch {
      Write-Host ("  {0,-6} not answering yet - give mDNS a few more seconds" -f $h) -ForegroundColor Yellow
    }
  }
}
