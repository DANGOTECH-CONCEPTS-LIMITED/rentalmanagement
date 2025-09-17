param(
  [string]$Uri         = "http://localhost:5030/ussd",   # or https://api.dangotechconcepts.com/ussd
  [string]$ServiceCode = "*384*45653#",
  [string]$Phone       = "+256779226226",
  [string]$SessionId   = ("ps-" + (Get-Random)),
  [string]$LogCsvPath  = "",              # e.g., "D:\DangotechUssd\ussd-runlog.csv"
  [string[]]$Inputs    = @()              # provide to run scripted flow, else interactive
)

function Write-Log {
  param([string]$Prefix,[string]$Text,[string]$Screen)
  if ([string]::IsNullOrWhiteSpace($LogCsvPath)) { return }
  if (-not (Test-Path $LogCsvPath)) {
    "timestamp,sessionId,prefix,text,screen" | Out-File -FilePath $LogCsvPath -Encoding UTF8 -Force
  }
  $ts = (Get-Date).ToString("s")
  $line = '"' + ($ts -replace '"','""') + '","' +
                 ($SessionId -replace '"','""') + '","' +
                 ($Prefix -replace '"','""') + '","' +
                 ($Text -replace '"','""') + '","' +
                 (($Screen -replace "`r?`n",' ') -replace '"','""') + '"'
  Add-Content -Path $LogCsvPath -Value $line
}

function Invoke-UssdRequest {
  param([string]$Text)
  $resp = Invoke-RestMethod -Uri $Uri -Method POST -ContentType 'application/x-www-form-urlencoded' -Body @{
    sessionId   = $SessionId
    serviceCode = $ServiceCode
    phoneNumber = $Phone
    text        = $Text
  }
  return [string]$resp
}

function Strip-Prefix {
  param([string]$Body)
  # Remove UTF-8 BOM + leading spaces
  $b = ($Body -replace '^\uFEFF','').TrimStart()
  # Parse prefix (multiline-safe)
  if ($b -match '^(?s)(CON|END)\s+(.*)$') {
    return [pscustomobject]@{ Prefix = $matches[1]; Screen = $matches[2] }
  } else {
    return [pscustomobject]@{ Prefix = 'UNKNOWN'; Screen = $b }
  }
}

function Show-And-Log {
  param([string]$Prefix,[string]$Text,[string]$Screen,[int]$Step)
  if ($Step -ge 0) { Write-Host "`n[STEP $Step][$Prefix]"; } else { Write-Host "`n[$Prefix]" }
  Write-Host $Screen
  Write-Log -Prefix $Prefix -Text $Text -Screen $Screen
}

function Start-UssdInteractive {
  Write-Host "=== USSD Interactive Test ==="
  Write-Host "URI        : $Uri"
  Write-Host "SessionId  : $SessionId"
  Write-Host "Phone      : $Phone"
  Write-Host "ServiceCode: $ServiceCode"
  if (-not [string]::IsNullOrWhiteSpace($LogCsvPath)) { Write-Host "Logging to : $LogCsvPath" }
  Write-Host "--------------------------------`n"

  $text = ""   # first dial has empty text
  while ($true) {
    $raw = Invoke-UssdRequest -Text $text
    $res = Strip-Prefix $raw
    Show-And-Log -Prefix $res.Prefix -Text $text -Screen $res.Screen -Step -1

    if ($res.Prefix -ne 'CON') {
      Write-Host "Session ended (prefix: $($res.Prefix))."
      break
    }

    $next = Read-Host "Enter your reply (or press Enter to quit)"
    if ([string]::IsNullOrWhiteSpace($next)) { Write-Host "Stopping."; break }

    if ([string]::IsNullOrWhiteSpace($text)) { $text = $next } else { $text = "$text*$next" }
  }
}

function Test-UssdScripted {
  param([string[]]$Inputs)
  Write-Host "=== USSD Scripted Test ==="
  Write-Host "Steps: $($Inputs -join ', ')"
  if (-not [string]::IsNullOrWhiteSpace($LogCsvPath)) { Write-Host "Logging to : $LogCsvPath" }
  Write-Host "--------------------------------`n"

  $text = ""
  $raw = Invoke-UssdRequest -Text $text
  $res = Strip-Prefix $raw
  Show-And-Log -Prefix $res.Prefix -Text $text -Screen $res.Screen -Step 0
  if ($res.Prefix -ne 'CON') { Write-Host "Aborted on first screen."; return }

  for ($i=0; $i -lt $Inputs.Count; $i++) {
    $inp = $Inputs[$i]
    if ([string]::IsNullOrWhiteSpace($text)) { $text = $inp } else { $text = "$text*$inp" }

    $raw = Invoke-UssdRequest -Text $text
    $res = Strip-Prefix $raw
    Show-And-Log -Prefix $res.Prefix -Text $text -Screen $res.Screen -Step ($i+1)
    if ($res.Prefix -ne 'CON') { break }
  }
}

# ---- Entrypoint: scripted if -Inputs provided, else interactive ----
if ($Inputs.Count -gt 0) {
  Test-UssdScripted -Inputs $Inputs
} else {
  Start-UssdInteractive
}
