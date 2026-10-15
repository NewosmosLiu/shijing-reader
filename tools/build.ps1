param([string]$JavaHome = $env:JAVA_HOME, [string]$Sdk = $env:ANDROID_SDK_ROOT)
if (!$JavaHome) { throw 'Pass -JavaHome or set JAVA_HOME to JDK 17.' }
if (!$Sdk) { $Sdk=$env:ANDROID_HOME }
if (!$Sdk) { throw 'Pass -Sdk or set ANDROID_SDK_ROOT.' }
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath("$PSScriptRoot\..")
$bt = (Get-ChildItem -LiteralPath "$Sdk\build-tools" -Directory | Select-Object -First 1).FullName
$platform = (Get-ChildItem -LiteralPath "$Sdk\platforms" -Directory | Select-Object -First 1).FullName
$build = "$root\build"
New-Item -ItemType Directory -Force "$build\classes","$build\dex","$root\dist" | Out-Null
function Run([string]$exe, [string[]]$arguments) { & $exe @arguments; if ($LASTEXITCODE -ne 0) { throw "$exe failed: $LASTEXITCODE" } }
Set-Location -LiteralPath $root
$platformRelative = (Resolve-Path -LiteralPath "$platform\android.jar" -Relative)
Run "$bt\aapt2.exe" @('compile','--dir','app/src/main/res','-o','build/resources.zip')
$manifest = [IO.File]::ReadAllText("$root\app\src\main\AndroidManifest.xml").Replace('<manifest ', '<manifest package="cn.shijing.reader.opensource" ')
[IO.File]::WriteAllText("$build\AndroidManifest.xml", $manifest, [Text.UTF8Encoding]::new($false))
Run "$bt\aapt2.exe" @('link','--manifest','build/AndroidManifest.xml','-A','app/src/main/assets','-I',$platformRelative,'-o','build/unsigned.apk','build/resources.zip')
Run "$JavaHome\bin\javac.exe" @('-encoding','UTF-8','-source','8','-target','8','-classpath',"$platform\android.jar",'-d',"$build\classes", "$root\app\src\main\java\cn\shijing\reader\MainActivity.java")
$classFiles = @(Get-ChildItem -LiteralPath "$build\classes" -Recurse -Filter '*.class' | ForEach-Object { $_.FullName })
Run "$JavaHome\bin\java.exe" (@('-cp',"$bt\lib\d8.jar",'com.android.tools.r8.D8','--lib',"$platform\android.jar",'--min-api','23','--output',"$build\dex") + $classFiles)
Push-Location "$build\dex"
try { Run "$bt\aapt.exe" @('add','../unsigned.apk','classes.dex') } finally { Pop-Location }
Run "$bt\zipalign.exe" @('-f','4','build/unsigned.apk','build/aligned.apk')
New-Item -ItemType Directory -Force "$root\.local" | Out-Null
$key = "$root\.local\reader-debug.jks"
if (!(Test-Path -LiteralPath $key)) { Run "$JavaHome\bin\keytool.exe" @('-genkeypair','-keystore',$key,'-storepass','android','-keypass','android','-alias','reader','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Shijing Reader Open Source Debug') }
Run "$JavaHome\bin\java.exe" @('-jar',"$bt\lib\apksigner.jar",'sign','--ks',$key,'--ks-key-alias','reader','--ks-pass','pass:android','--key-pass','pass:android','--out',"$root\dist\shijing-reader.apk", "$build\aligned.apk")
Run "$JavaHome\bin\java.exe" @('-jar',"$bt\lib\apksigner.jar",'verify','--verbose',"$root\dist\shijing-reader.apk")
Get-FileHash -Algorithm SHA256 -LiteralPath "$root\dist\shijing-reader.apk"
