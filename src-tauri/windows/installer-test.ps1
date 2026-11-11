# Prüft den Installer auf einem frischen Windows (in der CI): still installieren, Programm,
# Verknüpfungen und Dateizuordnung prüfen, still deinstallieren. Nicht auf Robins Rechner
# ausführen: Er hat den Sicherheitscheck installiert, die Deinstallation träfe sein Programm.
$ErrorActionPreference = 'Stop'

$ziel = if ($env:CARGO_TARGET_DIR) { $env:CARGO_TARGET_DIR } else { 'src-tauri/target' }
$setup = Get-ChildItem (Join-Path $ziel 'release/bundle/nsis/*-setup.exe') | Select-Object -First 1
if (-not $setup) { throw 'Kein Installer gefunden.' }
Write-Host "Installiere $($setup.Name) ($([math]::Round($setup.Length / 1MB, 1)) MB) still ..."
Start-Process $setup.FullName -ArgumentList '/S' -Wait

$ordner = Join-Path $env:LOCALAPPDATA 'Sicherheitscheck'
$exe = Join-Path $ordner 'sicherheitscheck.exe'
if (-not (Test-Path $exe)) { throw "Programm nicht installiert: $exe" }

# Pro Benutzer, ohne Admin: Eintrag unter HKCU für „Apps und Features“
$deinstallation = Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' | Where-Object { (Get-ItemProperty $_.PSPath).DisplayName -eq 'Sicherheitscheck' }
if (-not $deinstallation) { throw 'Kein Deinstallationseintrag unter HKCU' }

# Verknüpfungen im Startmenü und auf dem Desktop (der stille Installer legt beide an)
$startmenue = Join-Path ([Environment]::GetFolderPath('Programs')) 'Sicherheitscheck.lnk'
if (-not (Test-Path $startmenue)) { throw "Startmenü-Eintrag fehlt: $startmenue" }
$desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Sicherheitscheck.lnk'
if (-not (Test-Path $desktop)) { throw "Desktop-Verknüpfung fehlt: $desktop" }

# .sicherheitscheck gehört dem Sicherheitscheck (pro Benutzer)
$endung = (Get-ItemProperty 'HKCU:\Software\Classes\.sicherheitscheck').'(default)'
if ($endung -ne 'Sicherheitscheck.Sicherung') { throw ".sicherheitscheck zeigt auf '$endung' statt auf Sicherheitscheck.Sicherung" }
$befehl = (Get-ItemProperty 'HKCU:\Software\Classes\Sicherheitscheck.Sicherung\shell\open\command').'(default)'
if ($befehl -notlike '*sicherheitscheck.exe*%1*') { throw "Öffnen-Befehl für .sicherheitscheck unerwartet: $befehl" }

Write-Host 'Installation in Ordnung, deinstalliere still ...'
Start-Process (Join-Path $ordner 'uninstall.exe') -ArgumentList '/S' -Wait
# Der Deinstaller startet sich aus einer Kopie neu; kurz warten, bis er fertig ist
for ($i = 0; $i -lt 30 -and (Test-Path $exe); $i++) { Start-Sleep -Seconds 1 }

if (Test-Path $exe) { throw 'Programm nach der Deinstallation noch vorhanden' }
if (Test-Path $startmenue) { throw 'Startmenü-Eintrag nach der Deinstallation noch vorhanden' }
if (Test-Path 'HKCU:\Software\Classes\Sicherheitscheck.Sicherung') { throw 'Dateizuordnung nach der Deinstallation noch vorhanden' }
Write-Host 'Installer-Test bestanden.'
