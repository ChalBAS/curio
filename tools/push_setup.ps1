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
#
# WHY THE LAPTOP LOGIN: the CLOUDFLARE_API_TOKEN in the user environment has no D1
# permission, so this uses wrangler's own login. If it has expired, wrangler opens a
# dash.cloudflare.com page in the browser; the founder clicks Allow, once.
#
# The private key is read from ~/.config/qpio/vapid-private.json (this Windows user
# only) and piped straight into wrangler. It is never printed and never in the repo.
# After a first run, put the printed database id into wrangler.jsonc (UAT) or
# wrangler.prod.jsonc (-Prod) as the PUSH_DB binding.

param([switch]$Prod)
$ErrorActionPreference = "Stop"
$app = Split-Path -Parent $PSScriptRoot
$db = if ($Prod) { "qpio-push-eu" } else { "qpio-push-uat-eu" }
$cfg = if ($Prod) { "wrangler.prod.jsonc" } else { "wrangler.jsonc" }
$key = Join-Path $env:USERPROFILE ".config\qpio\vapid-private.json"
if (-not (Test-Path $key)) { throw "No signing key at $key - make it first (it must be the same key the app's PUSH_KEY names)." }

Remove-Item Env:\CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
function W { Push-Location $app; try { & npx --no-install wrangler @args } finally { Pop-Location } }

# 1. The database, in the EU. The jurisdiction can only be chosen at creation.
$list = (W d1 list --json | Out-String) | ConvertFrom-Json
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

# 3. The signing key, as a secret of the worker. Piped, never printed.
Push-Location $app
try { Get-Content $key -Raw | & npx --no-install wrangler secret put VAPID_PRIVATE_JWK -c $cfg } finally { Pop-Location }

Write-Output ""
Write-Output "PUSH_DB for $cfg -> database_name $db, database_id $($found.uuid)"
