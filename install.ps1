$ErrorActionPreference = "Stop"

$Repository = "thirdbase1/entry-agents-d"
$ApiRoot = "https://api.github.com/repos/$Repository"
$Headers = @{
	Accept = "application/vnd.github+json"
	"User-Agent" = "Entry-Agents-Installer"
}

function Stop-Install {
	param([string]$Message)
	throw "Entry Agents installer: $Message"
}

if ([System.Environment]::OSVersion.Platform -ne [System.PlatformID]::Win32NT) {
	Stop-Install "install.ps1 must be run on Windows."
}

$Architecture = $env:PROCESSOR_ARCHITEW6432
if (-not $Architecture) {
	$Architecture = $env:PROCESSOR_ARCHITECTURE
}
if ($Architecture -ne "AMD64") {
	Stop-Install "The current Windows release supports x64 only."
}

Write-Host "Fetching latest Entry Agents Desktop release..." -ForegroundColor Cyan

try {
	if ($env:ENTRY_AGENTS_VERSION) {
		$Version = $env:ENTRY_AGENTS_VERSION.TrimStart("v")
		$Release = Invoke-RestMethod -Uri "$ApiRoot/releases/tags/v$Version" -Headers $Headers -UseBasicParsing
	}
	else {
		$Releases = Invoke-RestMethod -Uri "$ApiRoot/releases?per_page=10" -Headers $Headers -UseBasicParsing
		$Release = $Releases[0]
	}
}
catch {
	Stop-Install "Could not contact GitHub releases API: $_"
}

if (-not $Release) {
	Stop-Install "No release found on $Repository."
}

$Tag = $Release.tag_name
Write-Host "Discovered release $Tag" -ForegroundColor Green

# Find the setup installer asset (.exe or .msi)
$Asset = $Release.assets | Where-Object { $_.name -like "*setup.exe" -or $_.name -like "*.msi" -or $_.name -like "*x64*.exe" } | Select-Object -First 1

if (-not $Asset) {
	Write-Host ""
	Write-Host "Release $Tag currently has source distribution archives." -ForegroundColor Yellow
	Write-Host "To download the release or clone the source repository:" -ForegroundColor Yellow
	Write-Host "  git clone https://github.com/$Repository.git" -ForegroundColor Cyan
	Write-Host "  cd entry-agents-d && npm install && npm run dev" -ForegroundColor Cyan
	exit 0
}

$DownloadUrl = $Asset.browser_download_url
$TargetFile = Join-Path $env:TEMP $Asset.name

Write-Host "Downloading $($Asset.name)..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TargetFile -UseBasicParsing

Write-Host "Launching installer..." -ForegroundColor Green
Start-Process -FilePath $TargetFile
