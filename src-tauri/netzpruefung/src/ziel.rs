//! Zielprüfung für `http_abruf` und `tls_info` (7.7): Freigabe, Schema, Port, Länge,
//! Adresssperre für private und besondere Bereiche.

use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

use url::{Host, Url};

use crate::{fehler::NetzFehler, freigabe::Freigabe};

/// Größte Länge von Pfad und Abfrage
const MAX_PFAD: usize = 2048;

fn in_netz_v4(ip: Ipv4Addr, netz: [u8; 4], praefix: u32) -> bool {
    let maske = if praefix == 0 { 0 } else { u32::MAX << (32 - praefix) };
    (u32::from(ip) & maske) == (u32::from(Ipv4Addr::from(netz)) & maske)
}

fn in_netz_v6(ip: Ipv6Addr, netz: Ipv6Addr, praefix: u32) -> bool {
    let maske = if praefix == 0 { 0 } else { u128::MAX << (128 - praefix) };
    (u128::from(ip) & maske) == (u128::from(netz) & maske)
}

/// Gesperrte IPv4-Bereiche (7.7)
const GESPERRT_V4: [([u8; 4], u32); 15] = [
    ([0, 0, 0, 0], 8),
    ([10, 0, 0, 0], 8),
    ([100, 64, 0, 0], 10),
    ([127, 0, 0, 0], 8),
    ([169, 254, 0, 0], 16),
    ([172, 16, 0, 0], 12),
    ([192, 0, 0, 0], 24),
    ([192, 0, 2, 0], 24),
    ([192, 88, 99, 0], 24),
    ([192, 168, 0, 0], 16),
    ([198, 18, 0, 0], 15),
    ([198, 51, 100, 0], 24),
    ([203, 0, 113, 0], 24),
    ([224, 0, 0, 0], 4),
    ([240, 0, 0, 0], 4),
];

/// Gesperrte Bereiche innerhalb von 2000::/3: Teredo, Benchmarking, Dokumentation, 6to4
const GESPERRT_V6: [(Ipv6Addr, u32); 4] = [
    (Ipv6Addr::new(0x2001, 0, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2001, 2, 0, 0, 0, 0, 0, 0), 48),
    (Ipv6Addr::new(0x2001, 0xdb8, 0, 0, 0, 0, 0, 0), 32),
    (Ipv6Addr::new(0x2002, 0, 0, 0, 0, 0, 0, 0), 16),
];

/// Öffentliche Adresse? IPv4 außerhalb der gesperrten Bereiche; IPv6 nur aus 2000::/3 ohne
/// die gesperrten Teile. IPv4-gemappte Adressen (::ffff:0:0/96) gelten nach ihrer IPv4-Adresse.
pub fn ist_oeffentlich(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => !GESPERRT_V4.iter().any(|(netz, p)| in_netz_v4(v4, *netz, *p)),
        IpAddr::V6(v6) => {
            if let Some(v4) = v6.to_ipv4_mapped() {
                return ist_oeffentlich(IpAddr::V4(v4));
            }
            in_netz_v6(v6, Ipv6Addr::new(0x2000, 0, 0, 0, 0, 0, 0, 0), 3) && !GESPERRT_V6.iter().any(|(netz, p)| in_netz_v6(v6, *netz, *p))
        }
    }
}

/// Prüft eine URL vor dem Abruf: Schema, Anmeldedaten, Port, Länge, Freigabe.
/// Rückgabe: die URL und ihr Host (klein).
pub(crate) fn pruefe_url(text: &str, freigabe: &Freigabe) -> Result<(Url, String), NetzFehler> {
    let url = Url::parse(text).map_err(|_| NetzFehler::nicht_erlaubt(format!("Keine gültige Adresse: {text}")))?;
    if url.scheme() != "http" && url.scheme() != "https" {
        return Err(NetzFehler::nicht_erlaubt(format!("Nur http und https, nicht {}", url.scheme())));
    }
    if !url.username().is_empty() || url.password().is_some() {
        return Err(NetzFehler::nicht_erlaubt("Adressen mit Benutzer oder Passwort werden nicht abgerufen."));
    }
    // url entfernt den Standardport selbst; jeder andere Port bleibt stehen
    if url.port().is_some() {
        return Err(NetzFehler::nicht_erlaubt(format!("Nur der Standardport, nicht {}", url.port().unwrap_or_default())));
    }
    let pfad = url.path().len() + url.query().map_or(0, |q| q.len() + 1);
    if pfad > MAX_PFAD {
        return Err(NetzFehler::nicht_erlaubt("Pfad und Abfrage sind länger als 2048 Zeichen."));
    }
    let host = match url.host() {
        Some(Host::Domain(d)) => d.to_string(),
        _ => return Err(NetzFehler::nicht_erlaubt("Nur Namen, keine IP-Adressen.")),
    };
    pruefe_host(&host, freigabe)?;
    Ok((url, host))
}

/// Host muss die freigegebene Domain oder eine Subdomain davon sein.
pub(crate) fn pruefe_host(host: &str, freigabe: &Freigabe) -> Result<(), NetzFehler> {
    if !crate::freigabe::name_gueltig(host, true) {
        return Err(NetzFehler::nicht_erlaubt(format!("„{host}“ ist kein gültiger Name.")));
    }
    if !freigabe.erlaubt(host) {
        return Err(NetzFehler::nicht_erlaubt(format!("{host} ist nicht freigegeben (Bestätigung der Zuständigkeit fehlt oder ist älter als 15 Minuten).")));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fehler::FehlerArt;

    #[test]
    fn t_r03_adresssperre() {
        let gesperrt = [
            "10.0.0.1",
            "100.64.0.1",
            "127.0.0.1",
            "169.254.1.1",
            "172.16.0.1",
            "192.0.2.1",
            "192.168.2.105",
            "::1",
            "fe80::1",
            "fd00::1",
            "::ffff:192.168.0.1",
            "64:ff9b::a00:1",
            "2002:c0a8:201::1",
            "2001:db8::1",
            // weitere Ränder der Bereiche
            "0.0.0.0",
            "172.31.255.255",
            "192.0.0.8",
            "192.88.99.1",
            "198.19.255.255",
            "198.51.100.7",
            "203.0.113.9",
            "224.0.0.1",
            "255.255.255.255",
            "2001::1",
            "2001:2::1",
            "ff02::1",
            "::",
        ];
        for a in gesperrt {
            assert!(!ist_oeffentlich(a.parse().unwrap()), "{a} müsste gesperrt sein");
        }
        let oeffentlich = ["8.8.8.8", "2001:4860:4860::8888", "1.1.1.1", "172.32.0.1", "100.128.0.1", "::ffff:8.8.8.8", "2a00:1450:4001::1", "198.20.0.1"];
        for a in oeffentlich {
            assert!(ist_oeffentlich(a.parse().unwrap()), "{a} müsste öffentlich sein");
        }
    }

    fn freigabe(d: &str) -> Freigabe {
        let f = Freigabe::default();
        f.setze(d).unwrap();
        f
    }

    #[test]
    fn t_r01_ohne_freigabe_nicht_erlaubt() {
        let e = pruefe_url("https://firma.de/", &Freigabe::default()).unwrap_err();
        assert_eq!(e.fehler, FehlerArt::NichtErlaubt);
    }

    #[test]
    fn zielpruefung_der_url() {
        let f = freigabe("firma.de");
        assert_eq!(pruefe_url("https://www.firma.de/", &f).unwrap().1, "www.firma.de");
        assert_eq!(pruefe_url("HTTP://FIRMA.DE:80/a?b=c", &f).unwrap().1, "firma.de", "Standardport und Großschreibung sind in Ordnung");
        for u in [
            "https://firma.de:8443/",
            "ftp://firma.de/",
            "https://nutzer:geheim@firma.de/",
            "https://andere.de/",
            "https://firma.de.evil.example/",
            "https://192.168.2.105/",
            "https://[::1]/",
            "kein url",
            &format!("https://firma.de/{}", "a".repeat(2048)),
        ] {
            assert_eq!(pruefe_url(u, &f).unwrap_err().fehler, FehlerArt::NichtErlaubt, "{u}");
        }
        assert!(pruefe_url(&format!("https://firma.de/{}", "a".repeat(2047)), &f).is_ok(), "2048 Zeichen mit dem Schrägstrich sind erlaubt");
    }
}
