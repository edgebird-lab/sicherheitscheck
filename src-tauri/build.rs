fn main() {
    // Eigene Befehle nur über Rechte freigeben (capabilities/default.json), nicht pauschal.
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
        "start_datei",
        "oeffnen",
        "speichern_unter",
        "als_pdf",
        "freigabe_setzen",
        "doh_abfrage",
        "http_abruf",
        "tls_info",
    ])))
    .expect("Fehler beim Vorbereiten des Tauri-Builds");
}
