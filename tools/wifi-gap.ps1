<#
  ROBO4 — measure how long a module is unreachable. Pings it every 100 ms and, at the end,
  prints each outage and the worst one. Run it while you cause trouble (restart
  robo4-net, switch the laptop's internet from router to phone, power-cycle the router).

    .\tools\wifi-gap.ps1 -Target mod1.local -Seconds 60
    .\tools\wifi-gap.ps1 -Target 192.168.137.107

  The module reports its own view as well: GET /api/wifi -> lastGapMs / maxGapMs.
#>
param(
  [string]$Target  = 'mod1.local',
  [int]   $Seconds = 60,
  [int]   $EveryMs = 100,
  [int]   $TimeoutMs = 1000
)

# Resolve once: a name lookup inside the loop would measure DNS, not the link.
$ip = [Net.Dns]::GetHostAddresses($Target) | Where-Object AddressFamily -eq 'InterNetwork' | Select-Object -First 1
if (-not $ip) { throw "cannot resolve $Target" }
Write-Host "pinging $Target ($ip) every $EveryMs ms for $Seconds s"

# Pings are fired without waiting, each with $TimeoutMs to answer: a module in modem sleep
# answers late (0.2-0.4 s), and a late answer is not an outage. An outage is a run of
# pings that got NO answer; its gap = send time of the last answered ping before it ->
# send time of the first answered ping after it.
$sw = [Diagnostics.Stopwatch]::StartNew()
$sent = New-Object Collections.ArrayList
while ($sw.Elapsed.TotalSeconds -lt $Seconds) {
  $t = $sw.ElapsedMilliseconds
  $p = New-Object Net.NetworkInformation.Ping
  [void]$sent.Add([pscustomobject]@{ T = $t; Task = $p.SendPingAsync($ip, $TimeoutMs) })
  $rest = $EveryMs - ($sw.ElapsedMilliseconds - $t)
  if ($rest -gt 0) { Start-Sleep -Milliseconds $rest }
}
try { [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]@($sent | ForEach-Object Task)) } catch {}

$lastOk = $null; $inGap = $false; $worst = 0; $outages = 0; $okCount = 0
foreach ($s in $sent) {
  $ok = $s.Task.Status -eq 'RanToCompletion' -and $s.Task.Result.Status -eq 'Success'
  if ($ok) {
    $okCount++
    if ($inGap -and $lastOk -ne $null) {
      $gap = $s.T - $lastOk
      $outages++; if ($gap -gt $worst) { $worst = $gap }
      Write-Host ("[{0,7:N1}s] outage {1} ms" -f ($lastOk / 1000), $gap) -ForegroundColor $(if ($gap -le 2000) { 'Green' } else { 'Red' })
    }
    $inGap = $false; $lastOk = $s.T
  } else { $inGap = $true }
}
if ($inGap) { Write-Host ("still down at the end (since {0:N1}s)" -f ($lastOk / 1000)) -ForegroundColor Red }
Write-Host ("replies {0}/{1}, outages {2}, worst gap {3} ms" -f $okCount, $sent.Count, $outages, $worst)
