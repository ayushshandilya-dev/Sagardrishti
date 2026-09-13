$ErrorActionPreference = "Stop"
$root = "C:\Users\flora\Pictures\Documents\GitHub\Sagardrishti"
$py = "$root\.venv\Scripts\python.exe"
$log = "$root\uv.out.log"; $err = "$root\uv.err.log"

function Test-Health {
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 4
    return $true
  } catch { return $false }
}

if (-not (Test-Health)) {
  Write-Output "backend not up - starting uvicorn"
  Start-Process -FilePath $py -ArgumentList "-m","uvicorn","api.main:app","--host","::","--port","8000" `
    -RedirectStandardOutput $log -RedirectStandardError $err -WindowStyle Hidden
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-Health) { Write-Output "backend healthy after $($i * 500)ms"; break }
  }
}
else { Write-Output "backend already healthy" }

if (-not (Test-Health)) {
  Write-Output "FAILED to start backend"
  if (Test-Path $err) { Get-Content $err -Tail 15 }
  exit 1
}

Write-Output "=== running full e2e suite ==="
npx playwright test
Write-Output "PLAYWRIGHT EXIT: $LASTEXITCODE"
