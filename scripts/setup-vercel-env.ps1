# Adds Supabase env vars to your linked Vercel project.
# Prerequisites (run once in this folder):
#   npx vercel login
#   npx vercel link

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root ".env.local"

if (-not (Test-Path $envFile)) {
  Write-Error ".env.local not found at $envFile"
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  if ($line -notmatch "=") { return }
  $eq = $line.IndexOf("=")
  $name = $line.Substring(0, $eq).Trim()
  $value = $line.Substring($eq + 1).Trim().Trim('"')
  $vars[$name] = $value
}

$required = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY"
)

foreach ($name in $required) {
  if (-not $vars[$name]) {
    Write-Error "Missing $name in .env.local"
  }
}

$environments = @("production", "preview", "development")

foreach ($name in $required) {
  foreach ($env in $environments) {
    Write-Host "Adding $name to $env..."
    $vars[$name] | npx vercel env add $name $env --force
    if ($LASTEXITCODE -ne 0) {
      Write-Error "Failed to add $name to $env"
    }
  }
}

Write-Host ""
Write-Host "Done. Redeploy from the Vercel dashboard or run: npx vercel --prod"
