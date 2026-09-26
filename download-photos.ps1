param(
  [string]$Source = "r2:wedding-photos/originals",
  [string]$Destination = "",
  [switch]$DryRun,
  [switch]$OpenDestination
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Destination)) {
  $Destination = Join-Path $PSScriptRoot "downloaded-photos"
}

$Destination = [System.IO.Path]::GetFullPath($Destination)
$rclone = Get-Command rclone -ErrorAction SilentlyContinue

if (-not $rclone) {
  throw "rclone was not found on PATH. Install rclone first, then run this script again: https://rclone.org/install/"
}

if (-not (Test-Path -LiteralPath $Destination)) {
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

Write-Host "Copying photos from: $Source"
Write-Host "Saving photos to:   $Destination"
Write-Host "Existing local files are kept; rclone will not delete anything."

$arguments = @(
  "copy",
  $Source,
  $Destination,
  "--progress",
  "--transfers", "8",
  "--checkers", "16",
  "--retries", "5",
  "--low-level-retries", "10"
)

if ($DryRun) {
  $arguments += "--dry-run"
  Write-Host "Dry-run enabled: no files will be downloaded."
}

& $rclone.Source @arguments

if ($LASTEXITCODE -ne 0) {
  throw "rclone failed with exit code $LASTEXITCODE. Check the source name, credentials, and network connection."
}

if ($DryRun) {
  Write-Host "Dry-run complete."
} else {
  Write-Host "Download complete."
}

if ($OpenDestination) {
  Start-Process explorer.exe $Destination
}
