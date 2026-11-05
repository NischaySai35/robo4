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
  [int]   $ParentPid = 0,       # stop when this process is gone (the Studio, if it was killed)
  # hotspot = Windows Mobile Hotspot with this name and password (default). Measured 5 Nov 2026: Wi-Fi Direct (the old
  # way) dropped the ESP32 every 120.6 s on one fixed clock (gone 0.6-2.8 s each time) while a phone stayed; on the
  # Mobile Hotspot the module stayed 4 minutes without a single drop. It takes over the laptop's Mobile hotspot setting
  # (name and password) and stays up after this stops. It needs an internet connection to share: without one it falls
  # back to direct.
  # direct  = Wi-Fi Direct group owner.
  [ValidateSet('direct', 'hotspot')] [string]$Mode = 'hotspot'
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Core') { throw 'run with Windows PowerShell 5.1 (powershell.exe), not pwsh' }
$null = [Windows.Devices.WiFiDirect.WiFiDirectAdvertisementPublisher, Windows.Devices.WiFiDirect, ContentType = WindowsRuntime]
$null = [Windows.Security.Credentials.PasswordCredential, Windows.Security.Credentials, ContentType = WindowsRuntime]

function Log($m) { Write-Host ("[{0:HH:mm:ss.fff}] {1}" -f (Get-Date), $m) }

# The heartbeat must never wait behind the laptop's other work: 5 Nov 2026, while the sim ran, it paused 2 s twice and
# the module left the network. High priority costs nothing (it sleeps 200 ms between 16-byte packets).
try { [Diagnostics.Process]::GetCurrentProcess().PriorityClass = 'High' } catch {}

# One network, one owner: two publishers with the same SSID abort each other.
$mutex = New-Object Threading.Mutex($false, 'Local\ROBO4-NET')
$owned = $false
try { $owned = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned = $true }   # previous owner was killed
if (-not $owned) { Log 'ROBO4-NET is already running in another process - leaving it to that one'; exit 3 }

if ($Mode -eq 'hotspot') {
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $null = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager, Windows.Networking.NetworkOperators, ContentType = WindowsRuntime]
  $null = [Windows.Networking.Connectivity.NetworkInformation, Windows.Networking.Connectivity, ContentType = WindowsRuntime]
  $asTaskOp = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
                $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
  function Wait-Op($op, [Type]$t) { $k = $asTaskOp.MakeGenericMethod($t).Invoke($null, @($op)); [void]$k.Wait(-1); $k.Result }
  $asTaskAct = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
                 $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' } | Select-Object -First 1
  function Wait-Act($op) { [void]$asTaskAct.Invoke($null, @($op)).Wait(-1) }
}

# The network object: Status says 'Started' while it is up, Stop() takes it down.
function New-Publisher {
  if ($Mode -eq 'hotspot') {
    $prof = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
    if (-not $prof) { throw 'Mobile Hotspot needs an internet connection to share' }
    $m = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($prof)
    $c = $m.GetCurrentAccessPointConfiguration()
    $on = [string]$m.TetheringOperationalState -eq 'On'
    if (-not ($on -and $c.Ssid -eq $Ssid)) {   # already up as ROBO4-NET (left by the Studio before): use it as it is
      $c.Ssid = $Ssid; $c.Passphrase = $Pass; $c.Band = 'TwoPointFourGigahertz'   # the ESP32-C3 cannot see 5 GHz
      Wait-Act ($m.ConfigureAccessPointAsync($c))
      $r = Wait-Op ($m.StartTetheringAsync()) ([Windows.Networking.NetworkOperators.NetworkOperatorTetheringOperationResult])
      if ($r.Status -ne 'Success') { throw "Mobile Hotspot did not start: $($r.Status) $($r.AdditionalErrorMessage)" }
    } else { Log 'Mobile Hotspot ROBO4-NET is already up - using it (no restart, the modules stay connected)' }
    $o = [pscustomobject]@{ M = $m }
    $o | Add-Member ScriptProperty Status { if ([string]$this.M.TetheringOperationalState -eq 'On') { 'Started' } else { [string]$this.M.TetheringOperationalState } }
    # Stop() leaves the hotspot up on purpose: when the Studio restarts (npm run dev), the next copy adopts it and the
    # modules never notice (5 Nov 2026: stopping it cost each restart a 5 s gap, the module fell back to the house Wi-Fi).
    # It stays up after the Studio closes too, while modules are on it; switch it off in Windows' Mobile hotspot settings.
    $o | Add-Member ScriptMethod Stop { }
    return $o
  }
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
  $seen = @{}   # every address that was ever a real device here: a sleeping module's entry can fall back to
                # 'Incomplete' between replies, and it still needs its unicast heartbeat (that also refreshes the entry)
  while (-not $shared.Stop) {
    # The group-owner side of Wi-Fi Direct shows up as its own adapter with a 192.168.137.x address.
    $a = Get-NetIPAddress -AddressFamily IPv4 -EA SilentlyContinue | Where-Object IPAddress -like '192.168.137.*' | Select-Object -First 1
    if ($a) {
      $shared.Bcast = [Net.IPAddress]::Parse(($a.IPAddress -replace '\.\d+$', '.255'))
      # Devices that joined: the adapter's neighbour table, minus broadcast/multicast and lookups that never got an
      # answer. Those are 'Incomplete' with MAC 00-00-...: an address sweep (gos robot list) left 252 of them, and the
      # heartbeat went to all of them 5 times a second, ~1,250 packets/s, each one making Windows ask over the air who
      # has that address (6 Nov 2026). Only real devices now; the broadcast heartbeat still reaches everyone.
      Get-NetNeighbor -AddressFamily IPv4 -InterfaceIndex $a.InterfaceIndex -EA SilentlyContinue |
        # (Windows' Wi-Fi Direct pins each device that joins as 'Permanent'; broadcast and multicast are Permanent too)
        Where-Object { $_.State -in 'Permanent', 'Reachable', 'Stale', 'Delay', 'Probe' -and $_.IPAddress -notmatch '\.255$' -and
                       $_.LinkLayerAddress -notmatch '^(FF-|01-00-5E|00-00-00-00-00-00)' } |
        ForEach-Object { $seen[$_.IPAddress] = $true }
      $shared.Members = @($seen.Keys | Sort-Object { [version]$_ } | ForEach-Object { [Net.IPAddress]::Parse($_) })
    } else { $shared.Bcast = $null; $shared.Members = @(); $seen = @{} }
    Start-Sleep -Milliseconds 1000
  }
}).AddArgument($shared)
$watchRun = $watch.BeginInvoke()

$pub = $null; $hsFails = 0; $lastStatus = ''; $bcast = $null; $members = @()
$udp = New-Object Net.Sockets.UdpClient
$udp.EnableBroadcast = $true
$seq = [uint32]0
$sw = [Diagnostics.Stopwatch]::StartNew()
$nextCheck = 0
$nextBeat = 0

Log "ROBO4-NET ($Mode): '$Ssid' heartbeat every $HbMs ms on udp/$Port"
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
        try { $pub = New-Publisher } catch {
          Log "start failed: $($_.Exception.Message)"; $pub = $null
          if ($Mode -eq 'hotspot' -and ++$hsFails -ge 3) { Log 'Mobile Hotspot will not start - using Wi-Fi Direct instead'; $Mode = 'direct' }
        }
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
