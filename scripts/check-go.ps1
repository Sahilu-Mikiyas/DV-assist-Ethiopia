$ErrorActionPreference = "Stop"

$apiDirectory = Join-Path $PSScriptRoot "..\services\api"
Push-Location $apiDirectory
try {
    $goFiles = Get-ChildItem -Path . -Recurse -Filter "*.go" -File
    if ($goFiles.Count -gt 0) {
        $unformatted = & gofmt -l ($goFiles | ForEach-Object { $_.FullName })
        if ($LASTEXITCODE -ne 0) {
            throw "gofmt failed with exit code $LASTEXITCODE"
        }
        if ($unformatted) {
            Write-Error ("These Go files need gofmt:`n" + ($unformatted -join "`n"))
            exit 1
        }
    }

    & go vet ./...
    if ($LASTEXITCODE -ne 0) {
        throw "go vet failed with exit code $LASTEXITCODE"
    }

    & go build ./...
    if ($LASTEXITCODE -ne 0) {
        throw "go build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}
