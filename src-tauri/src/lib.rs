//! Windows-Programm des Sicherheitschecks.
//!
//! Die Oberfläche bekommt keine allgemeinen Dateirechte. Sie ruft nur die Befehle
//! dieses Moduls auf. Gelesen wird nur, was der Benutzer selbst gewählt hat (Dialog,
//! Doppelklick oder „Öffnen mit“, ins Fenster gezogen), geschrieben nur an den Ort,
//! den er im Speichern-Dialog angibt. Die Daten selbst liegen in der IndexedDB der
//! WebView2 (Spezifikation 7.4); Dateien entstehen nur bei Export und PDF.

use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, WindowEvent};
use tauri_plugin_dialog::DialogExt;

/// Größte Datei, die gelesen wird (wie im Browser, Spezifikation 6.11).
const MAX_GROESSE: u64 = 50 * 1024 * 1024;
/// Endung der Sicherungsdateien
const ENDUNG: &str = "sicherheitscheck";

/// Eine gelesene Datei für den Import.
#[derive(Serialize, Clone, Debug)]
struct Datei {
    name: String,
    inhalt: String,
}

fn dateiname(p: &Path) -> String {
    p.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default()
}

fn lies(pfad: &Path) -> Result<Datei, String> {
    let groesse = std::fs::metadata(pfad).map_err(|e| format!("Datei nicht lesbar: {e}"))?.len();
    if groesse > MAX_GROESSE {
        return Err("Die Datei ist größer als 50 MB.".into());
    }
    let bytes = std::fs::read(pfad).map_err(|e| format!("Datei nicht lesbar: {e}"))?;
    let inhalt = String::from_utf8(bytes).map_err(|_| "Die Datei ist keine Textdatei (UTF-8).".to_string())?;
    Ok(Datei { name: dateiname(pfad), inhalt })
}

/// Schreibt über eine Hilfsdatei und Umbenennen, damit ein Absturz keine halbe Datei hinterlässt.
fn schreibe(p: &Path, inhalt: &[u8]) -> Result<(), String> {
    let mut tmp = p.as_os_str().to_owned();
    tmp.push(".speichern.tmp");
    let tmp = PathBuf::from(tmp);
    std::fs::write(&tmp, inhalt).map_err(|e| format!("Speichern fehlgeschlagen: {e}"))?;
    std::fs::rename(&tmp, p).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        format!("Speichern fehlgeschlagen: {e}")
    })
}

/// Hängt die Endung an, wenn der Benutzer keine getippt hat (Doppelklick und Filter brauchen sie).
fn mit_endung(mut p: PathBuf, endung: &str) -> PathBuf {
    if p.extension().is_none() {
        p.set_extension(endung);
    }
    p
}

fn ist_sicherung(p: &Path) -> bool {
    p.extension().is_some_and(|e| e.eq_ignore_ascii_case(ENDUNG))
}

/// Nur im Debug-Build: beantwortet Dateidialoge aus einer Umgebungsvariable, damit der
/// Desktop-Test die echten Abläufe ohne Klicks prüfen kann. Im Release fehlt das.
#[cfg(debug_assertions)]
fn testantwort(variable: &str) -> Option<Option<PathBuf>> {
    std::env::var_os(variable).map(|v| if v.is_empty() { None } else { Some(PathBuf::from(v)) })
}
#[cfg(not(debug_assertions))]
fn testantwort(_variable: &str) -> Option<Option<PathBuf>> {
    None
}

/// Erste Sicherungsdatei aus der Befehlszeile (Doppelklick im Explorer, „Öffnen mit“).
fn datei_aus_argumenten(args: &[String], cwd: &Path) -> Option<PathBuf> {
    args.iter()
        .skip(1)
        .filter(|a| !a.starts_with('-'))
        .map(|a| cwd.join(a))
        .find(|p| p.is_file() && ist_sicherung(p))
}

#[tauri::command]
fn start_datei() -> Result<Option<Datei>, String> {
    let args: Vec<String> = std::env::args().collect();
    let cwd = std::env::current_dir().unwrap_or_default();
    datei_aus_argumenten(&args, &cwd).map(|p| lies(&p)).transpose()
}

#[tauri::command]
async fn oeffnen(app: AppHandle) -> Result<Option<Datei>, String> {
    let wahl = testantwort("SICHERHEITSCHECK_TEST_OEFFNEN").unwrap_or_else(|| {
        app.dialog()
            .file()
            .set_title("Sicherung importieren")
            .add_filter("Sicherheitscheck-Sicherung", &[ENDUNG, "json"])
            .blocking_pick_file()
            .and_then(|w| w.into_path().ok())
    });
    wahl.map(|p| lies(&p)).transpose()
}

/// Speichert eine Exportdatei an den Ort, den der Benutzer im Dialog wählt. Rückgabe: Dateiname.
#[tauri::command]
async fn speichern_unter(app: AppHandle, vorschlag: String, inhalt: String) -> Result<Option<String>, String> {
    let wahl = testantwort("SICHERHEITSCHECK_TEST_SPEICHERN").unwrap_or_else(|| {
        app.dialog()
            .file()
            .set_title("Sicherung exportieren")
            .set_file_name(&vorschlag)
            .add_filter("Sicherheitscheck-Sicherung", &[ENDUNG])
            .blocking_save_file()
            .and_then(|w| w.into_path().ok())
    });
    let Some(p) = wahl else { return Ok(None) };
    let p = mit_endung(p, ENDUNG);
    schreibe(&p, inhalt.as_bytes())?;
    Ok(Some(dateiname(&p)))
}

/// PDF direkt aus der WebView2 (ohne Druckdialog) auf A4. Die Ränder, die Kopfzeile und die
/// Seitenzahlen kommen aus der Druck-CSS der Seite (@page).
#[cfg(windows)]
fn drucke_pdf(fenster: &tauri::WebviewWindow, ziel: PathBuf) -> Result<(), String> {
    let (tx, rx) = std::sync::mpsc::channel::<Result<(), String>>();
    // Erst in eine Hilfsdatei, dann umbenennen: Ein abgebrochener Druck hinterlässt keine halbe PDF.
    let mut tmp = ziel.as_os_str().to_owned();
    tmp.push(".speichern.tmp");
    let tmp = PathBuf::from(tmp);
    let tmp_text = tmp.to_string_lossy().into_owned();
    fenster
        .with_webview(move |wv| unsafe {
            use webview2_com::{
                Microsoft::Web::WebView2::Win32::{ICoreWebView2_7, ICoreWebView2Environment6},
                PrintToPdfCompletedHandler,
            };
            use windows::core::{Interface, HSTRING};
            let tx2 = tx.clone();
            let start = (|| -> windows::core::Result<()> {
                let core7: ICoreWebView2_7 = wv.controller().CoreWebView2()?.cast()?;
                let umgebung: ICoreWebView2Environment6 = wv.environment().cast()?;
                let einstellungen = umgebung.CreatePrintSettings()?;
                // Maße in Zoll: A4 = 210 × 297 mm
                einstellungen.SetPageWidth(8.27)?;
                einstellungen.SetPageHeight(11.69)?;
                einstellungen.SetShouldPrintBackgrounds(true)?;
                let fertig = PrintToPdfCompletedHandler::create(Box::new(move |hr, ok| {
                    let _ = tx2.send(if hr.is_ok() && ok { Ok(()) } else { Err(format!("PDF fehlgeschlagen: {hr:?}")) });
                    Ok(())
                }));
                core7.PrintToPdf(&HSTRING::from(tmp_text.as_str()), &einstellungen, &fertig)
            })();
            if let Err(e) = start {
                let _ = tx.send(Err(e.to_string()));
            }
        })
        .map_err(|e| e.to_string())?;
    let ergebnis = rx.recv_timeout(std::time::Duration::from_secs(60)).map_err(|e| e.to_string()).and_then(|r| r);
    match ergebnis {
        Ok(()) => std::fs::rename(&tmp, &ziel).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            format!("PDF fehlgeschlagen: {e}")
        }),
        Err(e) => {
            let _ = std::fs::remove_file(&tmp);
            Err(e)
        }
    }
}

/// Bericht als PDF an den Ort, den der Benutzer wählt. Rückgabe: Dateiname, `None` bei Abbruch.
#[tauri::command]
async fn als_pdf(app: AppHandle, fenster: tauri::WebviewWindow, vorschlag: String) -> Result<Option<String>, String> {
    #[cfg(windows)]
    {
        let wahl = testantwort("SICHERHEITSCHECK_TEST_PDF").unwrap_or_else(|| {
            app.dialog()
                .file()
                .set_title("Bericht als PDF speichern")
                .set_file_name(&vorschlag)
                .add_filter("PDF", &["pdf"])
                .blocking_save_file()
                .and_then(|w| w.into_path().ok())
        });
        let Some(p) = wahl else { return Ok(None) };
        let p = mit_endung(p, "pdf");
        let name = dateiname(&p);
        tauri::async_runtime::spawn_blocking(move || drucke_pdf(&fenster, p)).await.map_err(|e| e.to_string())??;
        Ok(Some(name))
    }
    #[cfg(not(windows))]
    {
        let _ = (app, fenster, vorschlag);
        Err("PDF ohne Druckdialog gibt es nur unter Windows.".into())
    }
}

/// Bringt das Hauptfenster nach vorn, z. B. wenn ein zweiter Start eine Datei übergibt.
fn zeige_hauptfenster(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

/// Gewählte Datei an die Oberfläche geben; die fragt vor dem Import nach (6.11).
fn melde_datei(app: &AppHandle, p: &Path) {
    match lies(p) {
        Ok(d) => {
            let _ = app.emit("datei-oeffnen", d);
        }
        Err(e) => eprintln!("{e}"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Zuerst: Ein zweiter Start (Doppelklick auf eine weitere Datei) landet im laufenden Programm.
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            if let Some(p) = datei_aus_argumenten(&args, Path::new(&cwd)) {
                melde_datei(app, &p);
            }
            zeige_hauptfenster(app);
        }))
        .plugin(tauri_plugin_dialog::init())
        .on_window_event(|fenster, ereignis| {
            // Sicherung ins Fenster gezogen: Das ist eine Auswahl des Benutzers.
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, .. }) = ereignis {
                if let Some(p) = paths.iter().find(|p| p.is_file() && ist_sicherung(p)) {
                    melde_datei(fenster.app_handle(), p);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![start_datei, oeffnen, speichern_unter, als_pdf])
        .run(tauri::generate_context!())
        .expect("Der Sicherheitscheck konnte nicht starten");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn testordner(name: &str) -> PathBuf {
        let ordner = std::env::temp_dir().join(format!("sicherheitscheck-test-{name}-{}", std::process::id()));
        std::fs::create_dir_all(&ordner).unwrap();
        ordner
    }

    #[test]
    fn findet_die_sicherung_in_den_argumenten() {
        let ordner = testordner("argumente");
        let datei = ordner.join("kunde.sicherheitscheck");
        std::fs::write(&datei, "{}").unwrap();
        std::fs::write(ordner.join("notiz.txt"), "x").unwrap();
        let args = |rest: &[&str]| std::iter::once("sicherheitscheck.exe").chain(rest.iter().copied()).map(String::from).collect::<Vec<_>>();
        assert_eq!(datei_aus_argumenten(&args(&["--flag", "kunde.sicherheitscheck"]), &ordner), Some(datei.clone()));
        assert_eq!(datei_aus_argumenten(&args(&[]), &ordner), None);
        assert_eq!(datei_aus_argumenten(&args(&["gibt-es-nicht.sicherheitscheck"]), &ordner), None);
        // andere Dateiarten öffnet das Programm nicht
        assert_eq!(datei_aus_argumenten(&args(&["notiz.txt"]), &ordner), None);
        std::fs::remove_dir_all(&ordner).unwrap();
    }

    #[test]
    fn schreibt_atomar_und_liest_wieder() {
        let ordner = testordner("schreiben");
        let datei = ordner.join("sicherung.sicherheitscheck");
        schreibe(&datei, b"{\"a\":1}").unwrap();
        schreibe(&datei, b"{\"a\":2}").unwrap();
        let gelesen = lies(&datei).unwrap();
        assert_eq!(gelesen.inhalt, "{\"a\":2}");
        assert_eq!(gelesen.name, "sicherung.sicherheitscheck");
        assert!(!ordner.join("sicherung.sicherheitscheck.speichern.tmp").exists());
        std::fs::remove_dir_all(&ordner).unwrap();
    }

    #[test]
    fn lehnt_binaerdateien_ab() {
        let ordner = testordner("binaer");
        let datei = ordner.join("bild.sicherheitscheck");
        std::fs::write(&datei, [0xff, 0xfe, 0x00, 0xd8]).unwrap();
        assert!(lies(&datei).is_err());
        std::fs::remove_dir_all(&ordner).unwrap();
    }

    #[test]
    fn ergaenzt_fehlende_endung() {
        assert_eq!(mit_endung(PathBuf::from("C:/x/kunde"), ENDUNG), PathBuf::from("C:/x/kunde.sicherheitscheck"));
        assert_eq!(mit_endung(PathBuf::from("C:/x/bericht.pdf"), "pdf"), PathBuf::from("C:/x/bericht.pdf"));
        assert!(ist_sicherung(Path::new("a.SicherheitsCheck")));
        assert!(!ist_sicherung(Path::new("a.json")));
    }
}
