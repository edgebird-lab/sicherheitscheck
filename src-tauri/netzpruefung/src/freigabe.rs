//! Freigabe einer Domain für die Außenprüfung (7.7, `freigabe_setzen`).

use std::{
    net::IpAddr,
    sync::Mutex,
    time::{Duration, Instant},
};

use crate::fehler::NetzFehler;

/// Eine Freigabe gilt 15 Minuten; eine neue ersetzt die alte.
pub const FREIGABE_DAUER: Duration = Duration::from_secs(15 * 60);

fn label_gueltig(label: &str, unterstrich: bool) -> bool {
    !label.is_empty() && label.len() <= 63 && label.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || (unterstrich && b == b'_'))
}

/// Syntax eines Namens: höchstens 253 Zeichen, mindestens ein Punkt, Labels 1–63 Zeichen
/// aus `a-z0-9-` (bei DNS-Abfragen auch `_`), keine IP-Adresse.
pub(crate) fn name_gueltig(name: &str, unterstrich: bool) -> bool {
    name.len() <= 253 && name.contains('.') && name.parse::<IpAddr>().is_err() && name.split('.').all(|l| label_gueltig(l, unterstrich))
}

/// Prüft eine Domain für die Freigabe: Syntax und registrierbare Domain nach der Public
/// Suffix List (`de`, `co.uk` und `www.firma.de` werden abgelehnt). Die vollständige
/// Prüfung nach 6.3 macht vorher die Oberfläche; das hier ist die zweite Sperre.
pub fn pruefe_freigabe_domain(domain: &str) -> Result<String, NetzFehler> {
    if !name_gueltig(domain, false) {
        return Err(NetzFehler::nicht_erlaubt(format!("„{domain}“ ist keine gültige Domain.")));
    }
    if psl::domain_str(domain) != Some(domain) {
        return Err(NetzFehler::nicht_erlaubt(format!("„{domain}“ ist keine registrierbare Domain.")));
    }
    Ok(domain.to_string())
}

/// Passt der Host zur freigegebenen Domain D: D selbst oder eine Subdomain von D.
pub(crate) fn host_passt(host: &str, domain: &str) -> bool {
    host == domain || host.strip_suffix(domain).is_some_and(|rest| rest.ends_with('.') && rest.len() > 1)
}

/// Die aktuelle Freigabe des Programms (höchstens eine).
#[derive(Default)]
pub struct Freigabe(Mutex<Option<(String, Instant)>>);

impl Freigabe {
    pub fn setze(&self, domain: &str) -> Result<(), NetzFehler> {
        let d = pruefe_freigabe_domain(domain)?;
        *self.0.lock().unwrap_or_else(|e| e.into_inner()) = Some((d, Instant::now() + FREIGABE_DAUER));
        Ok(())
    }

    /// Ist dieser Host jetzt freigegeben?
    pub fn erlaubt(&self, host: &str) -> bool {
        match &*self.0.lock().unwrap_or_else(|e| e.into_inner()) {
            Some((d, bis)) => Instant::now() < *bis && host_passt(host, d),
            None => false,
        }
    }

    #[cfg(test)]
    pub(crate) fn mit_ablauf(domain: &str, bis: Instant) -> Self {
        Self(Mutex::new(Some((domain.to_string(), bis))))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fehler::FehlerArt;

    #[test]
    fn t_r13_nur_registrierbare_domains() {
        for d in ["de", "co.uk", "www.firma.de"] {
            assert_eq!(pruefe_freigabe_domain(d).unwrap_err().fehler, FehlerArt::NichtErlaubt, "{d}");
        }
        assert_eq!(pruefe_freigabe_domain("firma.co.uk").unwrap(), "firma.co.uk");
        assert_eq!(pruefe_freigabe_domain("firma.de").unwrap(), "firma.de");
        // reservierte Namen für Tests gelten nach der Standardregel „*“ als registrierbar
        assert_eq!(pruefe_freigabe_domain("firma.test").unwrap(), "firma.test");
    }

    #[test]
    fn syntax_der_freigabe() {
        for d in ["Firma.de", "firma..de", "-", "192.168.2.105", "::1", "fir_ma.de", "firma.de.", &format!("{}.de", "a".repeat(64)), "ümlaut.de"] {
            assert!(pruefe_freigabe_domain(d).is_err(), "{d}");
        }
        assert!(name_gueltig("_dmarc.firma.de", true));
        assert!(!name_gueltig("_dmarc.firma.de", false));
        assert!(!name_gueltig(&format!("{}.de", "a.".repeat(130)), false));
    }

    #[test]
    fn t_r02_domain_und_subdomains() {
        let f = Freigabe::default();
        assert!(!f.erlaubt("firma.de"), "ohne Freigabe nichts");
        f.setze("firma.de").unwrap();
        assert!(f.erlaubt("firma.de"));
        assert!(f.erlaubt("www.firma.de"));
        assert!(f.erlaubt("mta-sts.firma.de"));
        assert!(!f.erlaubt("andere.de"));
        assert!(!f.erlaubt("firma.de.evil.example"));
        assert!(!f.erlaubt("evilfirma.de"));
        assert!(!f.erlaubt(".firma.de"));
        // eine neue Freigabe ersetzt die alte
        f.setze("andere.de").unwrap();
        assert!(!f.erlaubt("www.firma.de"));
        assert!(f.erlaubt("andere.de"));
        // eine abgelehnte Freigabe lässt die alte stehen
        assert!(f.setze("de").is_err());
        assert!(f.erlaubt("andere.de"));
    }

    #[test]
    fn freigabe_laeuft_ab() {
        let f = Freigabe::mit_ablauf("firma.de", Instant::now() - Duration::from_secs(1));
        assert!(!f.erlaubt("firma.de"));
    }
}
