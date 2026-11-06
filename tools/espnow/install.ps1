# install.ps1 - one-time setup so "power the modules, plug in the ESP32-CAM" is all it takes.
# REUSE-CHECKED: hosts|Startup|CreateShortcut -> nothing in tools/ or studio/tools does this; robo4-net.ps1 runs the
# Wi-Fi network, studio/tools/robo4Net.cjs starts helpers with the Studio (a second bridge copy there just waits).
#
#   powershell -ExecutionPolicy Bypass -File D:\robo4-restructure\tools\espnow\install.ps1            (set up)
#   powershell -ExecutionPolicy Bypass -File D:\robo4-restructure\tools\espnow\install.ps1 -Remove    (undo)
#
# 1. Windows hosts file: mod1.local .. mod9.local -> 127.0.4.1 .. 127.0.4.9 (needs admin: Windows asks once).
#    Every program that says http://mod1.local then reaches the ESP-NOW bridge at once (no 2-18 s name lookups),
#    and the bridge uses the radio when it hears the module, else the module's Wi-Fi.
# 2. Startup folder: the bridge (gos robot bridge, no window) starts at login, waits for the dongle, survives unplugging.
#    Log: %USERPROFILE%\.gos\espnow_bridge.log
param([switch]$Remove, [switch]$HostsOnly)
$ErrorActionPreference = 'Stop'
$hosts = "$env:SystemRoot\System32\drivers\etc\hosts"
$begin = '# >>> TETROBOT ESP-NOW bridge (tools/espnow/install.ps1)'
$end   = '# <<< TETROBOT ESP-NOW bridge'

function Test-Admin { ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }

if ($HostsOnly) {
  # the elevated half: only touches our own block in the hosts file
  $text = [IO.File]::ReadAllText($hosts)
  $pattern = "(?s)\r?\n?" + [regex]::Escape($begin) + ".*?" + [regex]::Escape($end) + "\r?\n?"
  $text = [regex]::Replace($text, $pattern, "`r`n")
  if (-not $Remove) {
    $lines = @($begin) + (1..9 | ForEach-Object { "127.0.4.$_`tmod$_.local" }) + @($end)
    $text = $text.TrimEnd() + "`r`n`r`n" + ($lines -join "`r`n") + "`r`n"
  }
  [IO.File]::WriteAllText($hosts, $text)
  ipconfig /flushdns | Out-Null
  exit 0
}

# 1. hosts file (elevated)
Write-Host ($(if ($Remove) { 'Removing' } else { 'Adding' }) + ' mod1.local .. mod9.local in the hosts file (Windows will ask for admin)...')
$elevArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`"", '-HostsOnly')
if ($Remove) { $elevArgs += '-Remove' }
if (Test-Admin) { & powershell.exe @elevArgs } else { Start-Process powershell.exe -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList $elevArgs }
$ok = (Select-String -Path $hosts -Pattern ([regex]::Escape($begin)) -Quiet)
if ($Remove) { Write-Host $(if ($ok) { '  !! hosts entries still there (admin refused?)' } else { '  hosts entries removed' }) }
else { Write-Host $(if ($ok) { '  mod1.local now means the bridge (127.0.4.1)' } else { '  !! hosts not changed (admin refused?) - run again and press Yes' }) }

# 2. Startup launcher (no admin)
$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'TETROBOT ESP-NOW bridge.lnk'
$bridges = { Get-CimInstance Win32_Process -Filter "Name='pyw.exe' or Name='pythonw.exe' or Name='py.exe' or Name='python.exe'" | Where-Object { $_.CommandLine -match 'gos robot bridge' } }
if ($Remove) {
  if (Test-Path $lnk) { Remove-Item $lnk -Force; Write-Host '  Startup launcher removed' }
  & $bridges | Where-Object { $_.Name -match 'pyw|pythonw' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  exit 0
}
$repoGos = (Resolve-Path (Join-Path $PSScriptRoot '..\..\gos\python')).Path
$log = Join-Path $env:USERPROFILE '.gos\espnow_bridge.log'
New-Item -ItemType Directory -Force (Split-Path $log) | Out-Null
# cmd /c sets PYTHONPATH to this checkout (so it runs this repo's gos) and appends to the log; pyw has no window.
$cmd = "set PYTHONPATH=$repoGos&& pyw -3.12 -m gos robot bridge >> `"$log`" 2>&1"
$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($lnk)
$s.TargetPath = "$env:SystemRoot\System32\cmd.exe"
$s.Arguments = "/c $cmd"
$s.WindowStyle = 7          # minimised; pyw itself has no window
$s.Description = 'TETROBOT: ESP-NOW bridge (mod1.local over the USB dongle, Wi-Fi as fallback)'
$s.Save()
Write-Host "  Startup launcher: $lnk"

# start it now too (unless one runs already)
if (-not (& $bridges)) { Start-Process -FilePath $lnk -WindowStyle Minimized; Write-Host '  bridge started' }
else { Write-Host '  a bridge already runs (the Studio''s or an earlier one)' }
Write-Host ''
Write-Host "Done. Power the modules, plug in the ESP32-CAM, open http://mod1.local . Log: $log"
