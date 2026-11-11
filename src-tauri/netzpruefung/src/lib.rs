//! Netzzugriffe der Außenprüfung im Windows-Programm (Spezifikation 7.6, 7.7), ohne Tauri.
//!
//! - `Freigabe`: Die Oberfläche gibt nach der Bestätigung der Zuständigkeit genau eine
//!   registrierbare Domain für 15 Minuten frei; HTTP und TLS gehen nur an diese Domain und
//!   ihre Subdomains.
//! - Zielprüfung: nur `http`/`https`, Standardport, keine Anmeldedaten, und **alle**
//!   Adressen des Namens müssen öffentlich sein; verbunden wird nur zu diesen Adressen.
//! - `doh_abfrage`: DNS über HTTPS bei Cloudflare oder Google mit festen Adressen.
//! - `http_abruf`: GET ohne Weiterleitung, ohne Cookies und Proxy, mit Größen- und
//!   Zeitgrenzen und Filter für die Kopfzeilen.
//! - `tls_info`: TLS-Handshake mit aufzeichnender Zertifikatsprüfung gegen die
//!   Mozilla-Wurzeln (webpki-roots).
//!
//! Für Tests nehmen die internen Funktionen eine `Umgebung` mit ausgeschalteter
//! Adresssperre, eigenem Wurzelspeicher und fester Namensauflösung. Die öffentlichen
//! Funktionen nutzen immer `Umgebung::standard()`.

mod doh;
mod fehler;
mod freigabe;
mod http;
mod tls;
mod umgebung;
mod ziel;

#[cfg(test)]
mod testserver;

pub use doh::doh_abfrage;
pub use fehler::{FehlerArt, NetzFehler};
pub use freigabe::{pruefe_freigabe_domain, Freigabe, FREIGABE_DAUER};
pub use http::{http_abruf, HttpAntwort, KOPFZEILEN, MAX_TEXT};
pub use tls::{tls_info, PruefFehler, TlsInfo, Zertifikat};
pub use ziel::ist_oeffentlich;

/// User-Agent aller Abrufe (7.7)
pub const USER_AGENT: &str = "Sicherheitscheck/0.1 (passive Pruefung)";

/// Kryptoanbieter ring für rustls und reqwest; einmal beim Programmstart aufrufen.
pub fn kryptoanbieter_einrichten() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}
