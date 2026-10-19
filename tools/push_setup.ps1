# THE MORNING QUESTION - one-time Cloudflare setup (launch plan N3, N4).
#
# Creates the EU database that holds the sign-ups, gives it its one table, and
# stores the signing key as a secret of the worker. Safe to run again: an existing
# database is kept, the table is created only if missing, and the secret is simply
# rewritten with the same key.
#
#   powershell -File tools/push_setup.ps1          UAT:        qpio-push-uat-eu + secret on qpio-uat
#   powershell -File tools/push_setup.ps1 -Prod    production: qpio-push-eu + secret on qpio-prod
#                                                  (run at the promotion that ships push)
#   ... -Prod -DatabaseOnly                        the database and table only, ahead of time.
#                                                  Storing a secret republishes the worker, so on
#                                                  production that waits for the accepted release.
#
# WHY THE LAPTOP LOGIN: the CLOUDFLARE_API_TOKEN in the user environment has no D1
# permission, so this uses wrangler's own login. If it has expired, run
# tools/cf_login.ps1 first: a short code the founder approves on any device. (The
# browser-callback login timed out twice on 19 Oct; the code login worked first time.)
#
# The private key is read from ~/.config/qpio/vapid-private.json (this Windows user
# only) and piped straight into wrangler. It is never printed and never in the repo.
# After a first run, put the printed database id into wrangler.jsonc (UAT) or
# wrangler.prod.jsonc (-Prod) as the PUSH_DB binding.

param([switch]$Prod, [switch]$DatabaseOnly)
$ErrorActionPreference = "Stop"
$app = Split-Path -Parent $PSScriptRoot
$db = if ($Prod) { "qpio-push-eu" } else { "qpio-push-uat-eu" }
$cfg = if ($Prod) { "wrangler.prod.jsonc" } else { "wrangler.jsonc" }
$key = Join-Path $env:USERPROFILE ".config\qpio\vapid-private.json"
if (-not (Test-Path $key)) { throw "No signing key at $key - make it first (it must be the same key the app's PUSH_KEY names)." }

Remove-Item Env:\CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
function W { Push-Location $app; try { & npx --no-install wrangler @args } finally { Pop-Location } }

# 1. The database, in the EU. The jurisdiction can only be chosen at creation.
$raw = W d1 list --json | Out-String
if ($LASTEXITCODE -ne 0) { throw "Cloudflare login missing or expired - run tools/cf_login.ps1 first (a short code to approve on any device)." }
$list = $raw | ConvertFrom-Json
$found = $list | Where-Object { $_.name -eq $db }
if ($found) {
  Write-Output "database $db exists: $($found.uuid)"
} else {
  # created from an empty folder so wrangler cannot rewrite our commented config files
  $tmp = Join-Path $env:TEMP "qpio-push-setup"; New-Item -ItemType Directory -Force $tmp | Out-Null
  Push-Location $tmp
  try { & npx --no-install wrangler d1 create $db --jurisdiction eu } finally { Pop-Location }
  $list = (W d1 list --json | Out-String) | ConvertFrom-Json
  $found = $list | Where-Object { $_.name -eq $db }
  if (-not $found) { throw "database $db was not created" }
  Write-Output "database $db created: $($found.uuid)"
}

# 2. Its one table (CREATE ... IF NOT EXISTS, so a rerun changes nothing).
$tmp = Join-Path $env:TEMP "qpio-push-setup"; New-Item -ItemType Directory -Force $tmp | Out-Null
Push-Location $tmp
try { & npx --no-install wrangler d1 execute $db --remote --yes --file (Join-Path $app "worker\push-schema.sql") } finally { Pop-Location }

# 3. The signing key, as a secret of the worker. Never printed.
#    Handed over by cmd's file redirect, byte for byte. NOT a PowerShell pipe: Windows
#    PowerShell 5.1 re-encodes piped text and puts an invisible byte-order mark in front
#    and a line break behind, the server cannot read a key that starts with that mark,
#    and every morning send failed (found 19 Oct 2026 by the end-to-end test).
if ($DatabaseOnly) {
  Write-Output "secret not stored (-DatabaseOnly): run again without it at the promotion"
} else {
  Push-Location $app
  try { & cmd /c "npx --no-install wrangler secret put VAPID_PRIVATE_JWK -c $cfg < `"$key`"" } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "storing the signing key failed" }
}

Write-Output ""
Write-Output "PUSH_DB for $cfg -> database_name $db, database_id $($found.uuid)"
