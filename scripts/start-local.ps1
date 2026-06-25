$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$nodeInstall = 'C:\Program Files\nodejs'
$env:npm_config_prefix = $nodeInstall
$env:npm_config_cache = Join-Path $repoRoot '.npm-cache'
$env:TEMP = Join-Path $repoRoot '.tmp'
$env:TMP = Join-Path $repoRoot '.tmp'

New-Item -ItemType Directory -Path $env:npm_config_cache -Force | Out-Null
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null

function Get-ListeningPortPids {
  param([int[]]$Ports)

  $netstatOutput = netstat -ano
  foreach ($port in $Ports) {
    $pattern = "^\s*TCP\s+\S+:$port\s+\S+\s+LISTENING\s+(\d+)\s*$"
    foreach ($line in $netstatOutput) {
      if ($line -match $pattern) {
        [int]$matches[1]
      }
    }
  }
}

$ports = @(3001, 3002)
$blockingPids = @(Get-ListeningPortPids -Ports $ports | Sort-Object -Unique)
foreach ($blockingPid in $blockingPids) {
  $process = Get-Process -Id $blockingPid -ErrorAction SilentlyContinue
  if (-not $process) {
    continue
  }

  if ($process.ProcessName -in @('node', 'npm', 'npx')) {
    Write-Host "Stopping stale local server process: PID $blockingPid ($($process.ProcessName))"
    Stop-Process -Id $blockingPid -Force
  } else {
    throw "Port 3001 or 3002 is already used by PID $blockingPid ($($process.ProcessName)). Close it first, then run this script again."
  }
}

Write-Host "Project: $repoRoot"
Write-Host "Frontend UI:    http://localhost:3001"
Write-Host "Backend status: http://localhost:3002"
Write-Host "Health check:   http://localhost:3002/api/health"
Write-Host ""
Write-Host "Starting local development servers. Keep this window open."
Write-Host "Press Ctrl+C to stop."
Write-Host ""

npm run dev
