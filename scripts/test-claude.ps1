param(
    [string]$Prompt = "請回覆：Claude API 連線成功",
    [int]$MaxTokens = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Resolve project root from this script path
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFilePath = Join-Path $ProjectRoot ".env"

if (Test-Path $EnvFilePath) {
    Get-Content $EnvFilePath | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) { return }
        if ($line.StartsWith("#")) { return }

        $pair = $line -split "=", 2
        if ($pair.Length -ne 2) { return }

        $key = $pair[0].Trim()
        $value = $pair[1].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$ApiKey = $env:ANTHROPIC_API_KEY
if ([string]::IsNullOrWhiteSpace($ApiKey)) {
    throw "Missing ANTHROPIC_API_KEY. Please create .env from .env.example and fill your key."
}

$Model = $env:ANTHROPIC_MODEL
if ([string]::IsNullOrWhiteSpace($Model)) {
    $Model = "claude-3-7-sonnet-latest"
}

$Body = @{
    model = $Model
    max_tokens = $MaxTokens
    messages = @(
        @{
            role = "user"
            content = $Prompt
        }
    )
} | ConvertTo-Json -Depth 10

$Headers = @{
    "x-api-key" = $ApiKey
    "anthropic-version" = "2023-06-01"
    "content-type" = "application/json"
}

$Response = Invoke-RestMethod `
    -Method Post `
    -Uri "https://api.anthropic.com/v1/messages" `
    -Headers $Headers `
    -Body $Body

$TextOutput = @()
foreach ($block in $Response.content) {
    if ($block.type -eq "text" -and -not [string]::IsNullOrWhiteSpace($block.text)) {
        $TextOutput += $block.text
    }
}

if ($TextOutput.Count -eq 0) {
    Write-Host "Claude responded, but no text block was returned."
} else {
    Write-Host "=== Claude Response ==="
    Write-Host ($TextOutput -join "`n")
}
