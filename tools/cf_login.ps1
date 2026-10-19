# Log this laptop's wrangler in with the device-code flow: it prints a short code
# and a dash.cloudflare.com address that can be approved from any device (a phone
# included), and waits far longer than the browser-callback flow. Used by
# tools/push_setup.ps1 (D1 needs the login; the environment token has no D1 permission).
#
#   powershell -File tools/cf_login.ps1
Remove-Item Env:\CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
Set-Location (Split-Path -Parent $PSScriptRoot)
npx --no-install wrangler login --device
