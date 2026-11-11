//! Fehler, wie die Oberfläche sie als `NetzFehler` kennt (src/modell/typen.ts).

use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum FehlerArt {
    NichtErlaubt,
    Zeitueberschreitung,
    Verbindung,
    Tls,
    TlsVersion,
    Antwort,
}

/// Wird als `{ "fehler": "nicht_erlaubt", "text": "…" }` an die Oberfläche gegeben.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct NetzFehler {
    pub fehler: FehlerArt,
    pub text: String,
    /// HTTP-Status des DoH-Anbieters bei `antwort`; 5xx erlaubt einen Wiederholversuch (6.4)
    #[serde(rename = "httpStatus", skip_serializing_if = "Option::is_none")]
    pub http_status: Option<u16>,
}

impl NetzFehler {
    pub fn neu(fehler: FehlerArt, text: impl Into<String>) -> Self {
        Self { fehler, text: text.into(), http_status: None }
    }

    pub fn nicht_erlaubt(text: impl Into<String>) -> Self {
        Self::neu(FehlerArt::NichtErlaubt, text)
    }
}

impl std::fmt::Display for NetzFehler {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}: {}", self.fehler, self.text)
    }
}

impl std::error::Error for NetzFehler {}

/// Sucht einen `rustls::Error` in der Fehlerkette. `io::Error` reicht seinen inneren Fehler
/// über `source()` nicht weiter, deshalb wird dort zusätzlich `get_ref()` durchsucht.
pub(crate) fn finde_rustls<'a>(fehler: &'a (dyn std::error::Error + 'static)) -> Option<&'a rustls::Error> {
    let mut aktuell: Option<&(dyn std::error::Error + 'static)> = Some(fehler);
    while let Some(f) = aktuell {
        if let Some(r) = f.downcast_ref::<rustls::Error>() {
            return Some(r);
        }
        if let Some(io) = f.downcast_ref::<std::io::Error>() {
            if let Some(innen) = io.get_ref() {
                if let Some(r) = finde_rustls(innen) {
                    return Some(r);
                }
            }
        }
        aktuell = f.source();
    }
    None
}

/// TLS 1.2 und 1.3 sind nicht möglich: Alert „protocol_version“ oder unverträgliche Gegenstelle (7.7)
pub(crate) fn ist_tls_version(r: &rustls::Error) -> bool {
    matches!(r, rustls::Error::AlertReceived(rustls::AlertDescription::ProtocolVersion) | rustls::Error::PeerIncompatible(_))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn findet_rustls_fehler_auch_in_io_fehlern() {
        let innen = rustls::Error::AlertReceived(rustls::AlertDescription::ProtocolVersion);
        let io = std::io::Error::new(std::io::ErrorKind::InvalidData, innen);
        let gefunden = finde_rustls(&io).expect("rustls::Error in io::Error");
        assert!(ist_tls_version(gefunden));
        let anderer = std::io::Error::other("kein TLS");
        assert!(finde_rustls(&anderer).is_none());
    }

    #[test]
    fn serialisiert_wie_die_oberflaeche_es_erwartet() {
        let f = NetzFehler::nicht_erlaubt("nein");
        assert_eq!(serde_json::to_string(&f).unwrap(), r#"{"fehler":"nicht_erlaubt","text":"nein"}"#);
        let g = NetzFehler { http_status: Some(503), ..NetzFehler::neu(FehlerArt::Antwort, "HTTP 503") };
        assert_eq!(serde_json::to_string(&g).unwrap(), r#"{"fehler":"antwort","text":"HTTP 503","httpStatus":503}"#);
        let h = NetzFehler::neu(FehlerArt::TlsVersion, "x");
        assert!(serde_json::to_string(&h).unwrap().contains(r#""tls_version""#));
    }
}
