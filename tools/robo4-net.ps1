<#
  ROBO4 — the laptop IS the base station. Starts a private Wi-Fi network for the modules
  (no router, no phone hotspot, no internet needed) and sends the heartbeat the modules
  use to notice a dead link within ~0.7 s instead of the radio's ~6 s beacon timeout.

  The laptop's normal Wi-Fi stays connected to the router / phone for internet at the
  same time (Wi-Fi Direct concurrency). The modules' network follows that connection's
  channel, so keep the internet side on 2.4 GHz — the ESP32-C3 cannot see 5 GHz.

  Nobody needs to start it by hand: `npm run dev` and the Studio app both start it hidden
  (studio/tools/robo4Net.cjs) and stop it when they close. Only one copy runs at a time —
  a second one exits with code 3 and its launcher waits for the first to go away.

  Usage (Windows PowerShell 5.1 — the WinRT Wi-Fi Direct API is not reachable from pwsh 7):
    powershell -ExecutionPolicy Bypass -File .\tools\robo4-net.ps1             # run until Ctrl+C
    powershell -ExecutionPolicy Bypass -File .\tools\robo4-net.ps1 -Seconds 90 # timed run

  Heartbeat: UDP to <subnet>.255:4210 AND to each module on the network (a sleeping ESP32
  gets broadcasts only at DTIM beacons, unicast within its ~0.3 s listen interval),
  16 bytes, every 200 ms:
    "R4HB" | uint32 seq | uint32 laptop ms | uint32 period ms   (little-endian)
#>
param(
  [string]$Ssid     = 'ROBO4-NET',
  [string]$Pass     = 'robo4net2026',
  [int]   $Seconds  = 0,        # 0 = forever
  [int]   $HbMs     = 200,
  [int]   $Port     = 4210,
  [int]   $ParentPid = 0        # stop when this process is gone (the Studio, if it was killed)
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Core') { throw 'run with Windows PowerShell 5.1 (powershell.exe), not pwsh' }
$null = [Windows.Devices.WiFiDirect.WiFiDirectAdvertisementPublisher, Windows.Devices.WiFiDirect, ContentType = WindowsRuntime]
$null = [Windows.Security.Credentials.PasswordCredential, Windows.Security.Credentials, ContentType = WindowsRuntime]

function Log($m) { Write-Host ("[{0:HH:mm:ss.fff}] {1}" -f (Get-Date), $m) }

# One network, one owner: two publishers with the same SSID abort each other.
$mutex = New-Object Threading.Mutex($false, 'Local\ROBO4-NET')
$owned = $false
try { $owned = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }   # previous owner was killed
if (-not $owned) { Log 'ROBO4-NET is already running in another process - leaving it to that one'; exit 3 }

function New-Publisher {
  $p = New-Object Windows.Devices.WiFiDirect.WiFiDirectAdvertisementPublisher
  $p.Advertisement.IsAutonomousGroupOwnerEnabled = $true
  $ls = $p.Advertisement.LegacySettings          # legacy = plain WPA2 AP any device can join
  $ls.IsEnabled = $true
  $ls.Ssid = $Ssid
  $c = New-Object Windows.Security.Credentials.PasswordCredential
  $c.Password = $Pass
  $ls.Passphrase = $c
  $p.Start()
  $p
}

# Who is on the network, looked up on a background thread: Get-NetIPAddress + Get-NetNeighbor
# take ~0.6 s, and running them in the heartbeat loop stalled the heartbeat to ~0.9 s apart.
$shared = [hashtable]::Synchronized(@{ Bcast = $null; Members = @(); Stop = $false })
$watch = [PowerShell]::Create().AddScript({
  param($shared)
  while (-not $shared.Stop) {
    # The group-owner side of Wi-Fi Direct shows up as its own adapter with a 192.168.137.x address.
    $a = Get-NetIPAddress -AddressFamily IPv4 -EA SilentlyContinue | Where-Object IPAddress -like '192.168.137.*' | Select-Object -First 1
    if ($a) {
      $shared.Bcast = [Net.IPAddress]::Parse(($a.IPAddress -replace '\.\d+$', '.255'))
      # Devices that joined: the adapter's neighbour table, minus broadcast/multicast.
      $shared.Members = @(Get-NetNeighbor -AddressFamily IPv4 -InterfaceIndex $a.InterfaceIndex -EA SilentlyContinue |
        Where-Object { $_.State -ne 'Unreachable' -and $_.IPAddress -notmatch '\.255$' -and $_.LinkLayerAddress -notmatch '^(FF-|01-00-5E)' } |
        ForEach-Object { [Net.IPAddress]::Parse($_.IPAddress) })
    } else { $shared.Bcast = $null; $shared.Members = @() }
    Start-Sleep -Milliseconds 1000
  }
}).AddArgument($shared)
$watchRun = $watch.BeginInvoke()

$pub = $null; $lastStatus = ''; $bcast = $null; $members = @()
$udp = New-Object Net.Sockets.UdpClient
$udp.EnableBroadcast = $true
$seq = [uint32]0
$sw = [Diagnostics.Stopwatch]::StartNew()
$nextCheck = 0
$nextBeat = 0

Log "ROBO4-NET: '$Ssid' heartbeat every $HbMs ms on udp/$Port"
try {
  while ($Seconds -le 0 -or $sw.Elapsed.TotalSeconds -lt $Seconds) {
    $now = [int64]$sw.ElapsedMilliseconds
    if ($now -ge $nextCheck) {
      $nextCheck = $now + 1000
      $st = if ($pub) { [string]$pub.Status } else { 'none' }
      if ($st -ne $lastStatus) { Log "network status: $st"; $lastStatus = $st }
      if ($st -ne 'Started') {
        # Windows aborts the network when Wi-Fi is toggled or the internet side changes band.
        try { if ($pub) { $pub.Stop() } } catch {}
        try { $pub = New-Publisher } catch { Log "start failed: $($_.Exception.Message)"; $pub = $null }
      }
      $b = $shared.Bcast
      if ("$b" -ne "$bcast") { $bcast = $b; Log "modules subnet broadcast: $bcast" }
      $m = @($shared.Members)
      if (($m -join ',') -ne ($members -join ',')) { $members = $m; Log "on the network: $(if ($m) { $m -join ', ' } else { 'nobody' })" }
      if ($ParentPid -gt 0) {
        $alive = $true
        try { $alive = -not ([Diagnostics.Process]::GetProcessById($ParentPid)).HasExited } catch { $alive = $false }
        if (-not $alive) { Log "the Studio (pid $ParentPid) is gone - stopping"; break }
      }
    }
    if ($bcast) {
      $pkt = New-Object byte[] 16
      [Text.Encoding]::ASCII.GetBytes('R4HB').CopyTo($pkt, 0)
      [BitConverter]::GetBytes($seq).CopyTo($pkt, 4)
      [BitConverter]::GetBytes([uint32]($now -band 0xFFFFFFFF)).CopyTo($pkt, 8)
      [BitConverter]::GetBytes([uint32]$HbMs).CopyTo($pkt, 12)
      foreach ($dst in @($bcast) + $members) {
        try { [void]$udp.Send($pkt, 16, (New-Object Net.IPEndPoint($dst, $Port))) } catch {}
      }
      $seq++
    }
    # Fixed schedule, not "sleep after": a slow pass must not stretch the period.
    $nextBeat += $HbMs
    $rest = $nextBeat - $sw.ElapsedMilliseconds
    if ($rest -lt 0) { $nextBeat = $sw.ElapsedMilliseconds } else { Start-Sleep -Milliseconds $rest }
  }
} finally {
  $shared.Stop = $true
  try { if ($pub) { $pub.Stop() } } catch {}
  $udp.Close()
  $mutex.ReleaseMutex()
  Log 'ROBO4-NET stopped'
}
