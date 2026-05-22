# VR Georgia — ლოკალური ქსელიდან გახსნა (სხვა კომპიუტერებიდანაც)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

function Get-LanIp {
  $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Sort-Object -Property @{ Expression = { if ($_.IPAddress -like '192.168.*') { 0 } elseif ($_.IPAddress -like '10.*' -and $_.IPAddress -ne '10.0.2.15') { 1 } else { 2 } } } |
    Select-Object -First 1 -ExpandProperty IPAddress

  if (-not $ip) {
    $ip = (Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null } |
      Select-Object -First 1).IPv4Address.IPAddress
  }
  if (-not $ip) { $ip = '127.0.0.1' }
  return $ip
}

$lanIp = Get-LanIp
Write-Host "LAN IP: $lanIp" -ForegroundColor Cyan

# Backend .env
$backendEnv = Join-Path $root "backend\.env"
if (-not (Test-Path $backendEnv)) {
  Copy-Item (Join-Path $root "backend\.env.example") $backendEnv
  Write-Host "Created backend/.env"
}

# Frontend .env.local — API იმავე მანქანის IP-ზე (არა localhost)
$frontendEnv = Join-Path $root "frontend\.env.local"
@"
NEXT_PUBLIC_API_BASE=http://${lanIp}:5000
"@ | Set-Content -Path $frontendEnv -Encoding utf8
Write-Host "frontend/.env.local -> NEXT_PUBLIC_API_BASE=http://${lanIp}:5000"

# Windows Firewall (შეიძლება ადმინისტრატორი დასჭირდეს)
foreach ($port in @(3000, 5000)) {
  $ruleName = "VR Georgia port $port"
  $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if (-not $existing) {
    try {
      New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
      Write-Host "Firewall: allowed TCP $port"
    } catch {
      Write-Host "Firewall: could not add rule for port $port (run as Administrator if other PCs cannot connect)" -ForegroundColor Yellow
    }
  }
}

Write-Host ""
Write-Host "Open on THIS PC:     http://localhost:3000" -ForegroundColor Green
Write-Host "Open on OTHER PCs:   http://${lanIp}:3000" -ForegroundColor Green
Write-Host "API:                 http://${lanIp}:5000/api/health" -ForegroundColor Green
Write-Host ""
Write-Host "Starting backend and frontend (Ctrl+C to stop)..." -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock {
  Set-Location $using:root\backend
  npm run dev
}

Set-Location (Join-Path $root "frontend")
npm run dev:lan
