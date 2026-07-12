param(
  [Parameter(Mandatory = $true)]
  [string] $Url
)

$ErrorActionPreference = "Stop"

$node = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if (-not (Test-Path -LiteralPath $node)) {
  $node = "node"
}

& $node (Join-Path $PSScriptRoot "scripts\generate-qr.js") $Url
