param(
    [string]$SourceFile = "Main.java",
    [string]$MainClass = "Main",
    [switch]$NoCompile
)

$javaPath = "C:\Program Files\Java\jdk-21\bin\java.exe"
$javacPath = Join-Path (Split-Path $javaPath -Parent) "javac.exe"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir
try {
    Write-Host "Using JDK bin directory: $(Split-Path $javaPath -Parent)"

    # Build classpath from any local jars in the backend folder (e.g. jakarta.mail-*.jar)
    $jars = Get-ChildItem -Path $scriptDir -Filter '*.jar' -ErrorAction SilentlyContinue
    if ($jars) {
        $jarNames = $jars | ForEach-Object { $_.Name }
        $cp = ".;" + ($jarNames -join ';')
    }
    else {
        $cp = "."
    }

    if (-not $NoCompile) {
        if (-not (Test-Path $javacPath)) {
            Write-Error "javac not found at $javacPath. Ensure JDK is installed at that location."
            exit 1
        }

        Write-Host "Compiling $SourceFile with $javacPath using classpath: $cp"
        & "$javacPath" -cp $cp $SourceFile
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Compilation failed with exit code $LASTEXITCODE"
            exit $LASTEXITCODE
        }
    }

    if (-not (Test-Path $javaPath)) {
        Write-Error "java not found at $javaPath. Ensure JDK is installed at that location."
        exit 1
    }

    Write-Host "Running $MainClass with $javaPath using classpath: $cp"
    & "$javaPath" -cp $cp $MainClass
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
