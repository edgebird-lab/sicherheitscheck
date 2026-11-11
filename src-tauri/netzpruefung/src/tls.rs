//! `tls_info` (7.7): TLS-Handshake mit Port 443 einer geprüften Adresse. Ein eigener Prüfer
//! ruft die Prüfung von webpki (Mozilla-Wurzeln) auf, merkt sich das Ergebnis und lässt den
//! Handshake trotzdem weiterlaufen, damit auch abgelaufene oder fremde Zertifikate gelesen
//! werden. Danach nur `close_notify`, keine Anwendungsdaten.

use std::{
    io::Write,
    net::{SocketAddr, TcpStream},
    sync::{Arc, Mutex},
};

use rustls::{
    client::{
        danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier},
        WebPkiServerVerifier,
    },
    pki_types::{CertificateDer, ServerName, UnixTime},
    CertificateError, ClientConfig, ClientConnection, DigitallySignedStruct, SignatureScheme,
};
use serde::Serialize;
use x509_parser::{extensions::GeneralName, prelude::FromDer, public_key::PublicKey};

use crate::{
    fehler::{finde_rustls, ist_tls_version, FehlerArt, NetzFehler},
    freigabe::Freigabe,
    umgebung::{kryptoanbieter, Umgebung},
    ziel::pruefe_host,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Zertifikat {
    pub inhaber: String,
    pub aussteller: String,
    pub sans: Vec<String>,
    pub gueltig_ab: String,
    pub gueltig_bis: String,
    pub schluessel: String,
    pub signatur: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct PruefFehler {
    /// abgelaufen, noch_nicht_gueltig, unbekannte_stelle, name, signatur, sonstiges
    pub code: &'static str,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TlsInfo {
    pub host: String,
    /// „TLS 1.3“ oder „TLS 1.2“
    pub version: String,
    /// IANA-Name, z. B. TLS_AES_128_GCM_SHA256
    pub suite: String,
    /// Kette und Zeit gültig gegen die Wurzeln; ein falscher Name zählt hier nicht
    pub vertrauenswuerdig: bool,
    pub name_passt: bool,
    pub pruef_fehler: Option<PruefFehler>,
    pub zertifikat: Zertifikat,
    pub kettenlaenge: usize,
}

/// Prüft wie webpki, merkt sich das Ergebnis und lässt den Handshake immer weiterlaufen.
/// Signaturen im Handshake prüft er unverändert.
#[derive(Debug)]
struct Aufzeichner {
    innen: Arc<WebPkiServerVerifier>,
    ergebnis: Mutex<Option<Result<(), rustls::Error>>>,
}

impl ServerCertVerifier for Aufzeichner {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        intermediates: &[CertificateDer<'_>],
        server_name: &ServerName<'_>,
        ocsp_response: &[u8],
        now: UnixTime,
    ) -> Result<ServerCertVerified, rustls::Error> {
        let r = self.innen.verify_server_cert(end_entity, intermediates, server_name, ocsp_response, now).map(|_| ());
        *self.ergebnis.lock().unwrap_or_else(|e| e.into_inner()) = Some(r);
        Ok(ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(&self, message: &[u8], cert: &CertificateDer<'_>, dss: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, rustls::Error> {
        self.innen.verify_tls12_signature(message, cert, dss)
    }

    fn verify_tls13_signature(&self, message: &[u8], cert: &CertificateDer<'_>, dss: &DigitallySignedStruct) -> Result<HandshakeSignatureValid, rustls::Error> {
        self.innen.verify_tls13_signature(message, cert, dss)
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        self.innen.supported_verify_schemes()
    }
}

/// Fehler der Zertifikatsprüfung → Code (7.7)
#[allow(deprecated)] // ältere Varianten ohne Kontext gibt es in rustls 0.23 noch
fn pruef_fehler(e: &rustls::Error) -> PruefFehler {
    use CertificateError as C;
    let code = match e {
        rustls::Error::InvalidCertificate(c) => match c {
            C::Expired | C::ExpiredContext { .. } => "abgelaufen",
            C::NotValidYet | C::NotValidYetContext { .. } => "noch_nicht_gueltig",
            C::UnknownIssuer => "unbekannte_stelle",
            C::NotValidForName | C::NotValidForNameContext { .. } => "name",
            C::BadSignature | C::UnsupportedSignatureAlgorithm | C::UnsupportedSignatureAlgorithmContext { .. } | C::UnsupportedSignatureAlgorithmForPublicKeyContext { .. } => "signatur",
            _ => "sonstiges",
        },
        _ => "sonstiges",
    };
    PruefFehler { code, text: e.to_string() }
}

/// SAN-Namen gegen den Host; `*.rest` passt auf genau ein zusätzliches linkes Label (7.7).
pub(crate) fn name_passt(sans: &[String], host: &str) -> bool {
    sans.iter().any(|san| {
        if san == host {
            return true;
        }
        match san.strip_prefix("*.") {
            Some(rest) => host.strip_suffix(rest).and_then(|links| links.strip_suffix('.')).is_some_and(|label| !label.is_empty() && !label.contains('.')),
            None => false,
        }
    })
}

/// Sekunden seit 1970 → „2026-11-21T00:00:00Z“
pub(crate) fn iso_zeit(sekunden: i64) -> String {
    let tage = sekunden.div_euclid(86_400);
    let rest = sekunden.rem_euclid(86_400);
    // Kalenderdatum aus Tagen seit 1970 (Algorithmus nach H. Hinnant)
    let z = tage + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let tag = doy - (153 * mp + 2) / 5 + 1;
    let monat = if mp < 10 { mp + 3 } else { mp - 9 };
    let jahr = yoe + era * 400 + i64::from(monat <= 2);
    format!("{jahr:04}-{monat:02}-{tag:02}T{:02}:{:02}:{:02}Z", rest / 3600, rest % 3600 / 60, rest % 60)
}

fn oid_name(oid: &str) -> String {
    match oid {
        "1.2.840.113549.1.1.5" => "sha1WithRSAEncryption",
        "1.2.840.113549.1.1.10" => "rsassaPss",
        "1.2.840.113549.1.1.11" => "sha256WithRSAEncryption",
        "1.2.840.113549.1.1.12" => "sha384WithRSAEncryption",
        "1.2.840.113549.1.1.13" => "sha512WithRSAEncryption",
        "1.2.840.10045.4.3.2" => "ecdsa-with-SHA256",
        "1.2.840.10045.4.3.3" => "ecdsa-with-SHA384",
        "1.2.840.10045.4.3.4" => "ecdsa-with-SHA512",
        "1.3.101.112" => "Ed25519",
        "1.3.101.113" => "Ed448",
        anders => return anders.to_string(),
    }
    .to_string()
}

fn kurve(oid: &str) -> &'static str {
    match oid {
        "1.2.840.10045.3.1.7" => "EC P-256",
        "1.3.132.0.34" => "EC P-384",
        "1.3.132.0.35" => "EC P-521",
        _ => "EC",
    }
}

/// Felder des Blattzertifikats mit x509-parser
pub(crate) fn lies_zertifikat(der: &[u8]) -> Result<Zertifikat, NetzFehler> {
    let (_, z) = x509_parser::certificate::X509Certificate::from_der(der).map_err(|e| NetzFehler::neu(FehlerArt::Tls, format!("Zertifikat nicht lesbar: {e}")))?;
    let mut sans: Vec<String> = Vec::new();
    if let Ok(Some(ext)) = z.subject_alternative_name() {
        for n in &ext.value.general_names {
            if let GeneralName::DNSName(d) = n {
                sans.push(d.to_ascii_lowercase());
            }
        }
    }
    let spki = z.public_key();
    let algorithmus = spki.algorithm.algorithm.to_id_string();
    let schluessel = if algorithmus == "1.3.101.112" {
        "Ed25519".to_string()
    } else {
        match spki.parsed() {
            Ok(PublicKey::RSA(rsa)) => format!("RSA {}", rsa.key_size()),
            Ok(PublicKey::EC(_)) => {
                let parameter = spki.algorithm.parameters.as_ref().and_then(|p| p.as_oid().ok()).map(|o| o.to_id_string()).unwrap_or_default();
                kurve(&parameter).to_string()
            }
            _ => oid_name(&algorithmus),
        }
    };
    Ok(Zertifikat {
        inhaber: z.subject().to_string(),
        aussteller: z.issuer().to_string(),
        sans,
        gueltig_ab: iso_zeit(z.validity().not_before.timestamp()),
        gueltig_bis: iso_zeit(z.validity().not_after.timestamp()),
        schluessel,
        signatur: oid_name(&z.signature_algorithm.algorithm.to_id_string()),
    })
}

fn io_fehler(e: &std::io::Error) -> NetzFehler {
    if let Some(r) = finde_rustls(e) {
        if ist_tls_version(r) {
            return NetzFehler::neu(FehlerArt::TlsVersion, format!("Weder TLS 1.3 noch TLS 1.2 möglich ({r})"));
        }
        return NetzFehler::neu(FehlerArt::Tls, format!("TLS-Fehler: {r}"));
    }
    match e.kind() {
        std::io::ErrorKind::TimedOut | std::io::ErrorKind::WouldBlock => NetzFehler::neu(FehlerArt::Zeitueberschreitung, "Zeitüberschreitung"),
        _ => NetzFehler::neu(FehlerArt::Verbindung, format!("Verbindung abgebrochen: {e}")),
    }
}

fn verbinde(adressen: &[SocketAddr], u: &Umgebung) -> Result<TcpStream, NetzFehler> {
    let mut letzter = NetzFehler::neu(FehlerArt::Verbindung, "Keine Verbindung");
    for a in adressen {
        match TcpStream::connect_timeout(a, u.verbindung) {
            Ok(s) => return Ok(s),
            Err(e) if e.kind() == std::io::ErrorKind::TimedOut => letzter = NetzFehler::neu(FehlerArt::Zeitueberschreitung, "Zeitüberschreitung beim Verbinden"),
            Err(e) => letzter = NetzFehler::neu(FehlerArt::Verbindung, format!("Keine Verbindung ({e})")),
        }
    }
    Err(letzter)
}

/// Öffentlicher Befehl (blockierend; im Programm in `spawn_blocking`).
pub fn tls_info(host: &str, freigabe: &Freigabe) -> Result<TlsInfo, NetzFehler> {
    tls_info_mit(host, freigabe, &Umgebung::standard())
}

pub(crate) fn tls_info_mit(host: &str, freigabe: &Freigabe, u: &Umgebung) -> Result<TlsInfo, NetzFehler> {
    pruefe_host(host, freigabe)?;
    let adressen = u.loese_auf(host, 443)?;
    let mut tcp = verbinde(&adressen, u)?;
    let _ = tcp.set_read_timeout(Some(u.gesamt));
    let _ = tcp.set_write_timeout(Some(u.gesamt));

    let anbieter = kryptoanbieter();
    let innen = WebPkiServerVerifier::builder_with_provider(u.wurzeln.clone(), anbieter.clone())
        .build()
        .map_err(|e| NetzFehler::neu(FehlerArt::Tls, format!("Zertifikatsprüfung: {e}")))?;
    let aufzeichner = Arc::new(Aufzeichner { innen, ergebnis: Mutex::new(None) });
    let config = ClientConfig::builder_with_provider(anbieter)
        .with_protocol_versions(&[&rustls::version::TLS13, &rustls::version::TLS12])
        .map_err(|e| NetzFehler::neu(FehlerArt::Tls, format!("TLS-Einstellungen: {e}")))?
        .dangerous()
        .with_custom_certificate_verifier(aufzeichner.clone())
        .with_no_client_auth();
    let name = ServerName::try_from(host.to_string()).map_err(|_| NetzFehler::nicht_erlaubt(format!("„{host}“ ist kein gültiger Name.")))?;
    let mut verbindung = ClientConnection::new(Arc::new(config), name).map_err(|e| NetzFehler::neu(FehlerArt::Tls, format!("TLS: {e}")))?;
    while verbindung.is_handshaking() {
        verbindung.complete_io(&mut tcp).map_err(|e| io_fehler(&e))?;
    }

    let version = match verbindung.protocol_version() {
        Some(rustls::ProtocolVersion::TLSv1_3) => "TLS 1.3",
        Some(rustls::ProtocolVersion::TLSv1_2) => "TLS 1.2",
        _ => return Err(NetzFehler::neu(FehlerArt::TlsVersion, "Weder TLS 1.3 noch TLS 1.2 ausgehandelt")),
    };
    let suite = verbindung.negotiated_cipher_suite().map(|s| format!("{:?}", s.suite()).replacen("TLS13_", "TLS_", 1)).unwrap_or_default();
    let kette: Vec<CertificateDer<'static>> = verbindung.peer_certificates().map(|k| k.iter().map(|c| c.clone().into_owned()).collect()).unwrap_or_default();
    // Ende ohne Anwendungsdaten
    verbindung.send_close_notify();
    let _ = verbindung.write_tls(&mut tcp);
    let _ = tcp.flush();

    let blatt = kette.first().ok_or_else(|| NetzFehler::neu(FehlerArt::Tls, "Kein Zertifikat erhalten"))?;
    let zertifikat = lies_zertifikat(blatt)?;
    let ergebnis = aufzeichner.ergebnis.lock().unwrap_or_else(|e| e.into_inner()).clone();
    let fehler = match ergebnis {
        Some(Ok(())) => None,
        Some(Err(e)) => Some(pruef_fehler(&e)),
        None => Some(PruefFehler { code: "sonstiges", text: "Zertifikat wurde nicht geprüft".into() }),
    };
    // rustls prüft Kette und Zeit vor dem Namen: Ist der Name der einzige Fehler, stimmen Kette und Zeit
    let vertrauenswuerdig = fehler.as_ref().is_none_or(|f| f.code == "name");
    Ok(TlsInfo {
        host: host.to_string(),
        version: version.to_string(),
        suite,
        vertrauenswuerdig,
        name_passt: name_passt(&zertifikat.sans, host),
        pruef_fehler: fehler,
        zertifikat,
        kettenlaenge: kette.len(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testserver::{tls_server, TestCa};

    fn freigabe() -> Freigabe {
        let f = Freigabe::default();
        f.setze("firma.test").unwrap();
        f
    }

    fn pruefe(adresse: SocketAddr, ca: &TestCa, host: &str) -> Result<TlsInfo, NetzFehler> {
        tls_info_mit(host, &freigabe(), &Umgebung::test(vec![adresse], Some(ca.wurzeln())))
    }

    const BEIDE: &[&rustls::SupportedProtocolVersion] = &[&rustls::version::TLS13, &rustls::version::TLS12];

    #[test]
    fn t_r09_vertrauenswuerdig_mit_tls_1_3() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["firma.test", "www.firma.test"], -1, 90), BEIDE);
        let i = pruefe(a, &ca, "firma.test").unwrap();
        assert!(i.vertrauenswuerdig, "{:?}", i.pruef_fehler);
        assert!(i.name_passt);
        assert_eq!(i.pruef_fehler, None);
        assert_eq!(i.version, "TLS 1.3");
        assert!(i.suite.starts_with("TLS_") && !i.suite.starts_with("TLS13_"), "{}", i.suite);
        assert_eq!(i.kettenlaenge, 2);
        assert_eq!(i.zertifikat.sans, ["firma.test", "www.firma.test"]);
        assert_eq!(i.zertifikat.schluessel, "EC P-256");
        assert_eq!(i.zertifikat.signatur, "ecdsa-with-SHA256");
        assert!(i.zertifikat.aussteller.contains("Sicherheitscheck Test-CA"), "{}", i.zertifikat.aussteller);
        assert!(i.zertifikat.inhaber.contains("firma.test"));
    }

    #[test]
    fn t_r10_abgelaufen_handshake_trotzdem_fertig() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["firma.test"], -30, -1), BEIDE);
        let i = pruefe(a, &ca, "firma.test").unwrap();
        assert!(!i.vertrauenswuerdig);
        assert_eq!(i.pruef_fehler.as_ref().map(|f| f.code), Some("abgelaufen"));
        // gueltigBis ist gestern (auf die Sekunde wie im Zertifikat)
        let gestern = time::OffsetDateTime::now_utc() - time::Duration::days(1);
        assert_eq!(&i.zertifikat.gueltig_bis[..10], &iso_zeit(gestern.unix_timestamp())[..10]);
        assert!(i.name_passt);
    }

    #[test]
    fn t_r11_fremder_name_aber_vertrauenswuerdig() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["andere.test"], -1, 90), BEIDE);
        let i = pruefe(a, &ca, "firma.test").unwrap();
        assert!(!i.name_passt);
        assert!(i.vertrauenswuerdig);
        assert_eq!(i.pruef_fehler.as_ref().map(|f| f.code), Some("name"));
    }

    #[test]
    fn t_r12_nur_tls_1_2() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["firma.test"], -1, 90), &[&rustls::version::TLS12]);
        let i = pruefe(a, &ca, "firma.test").unwrap();
        assert_eq!(i.version, "TLS 1.2");
        assert!(i.suite.starts_with("TLS_ECDHE_"), "{}", i.suite);
        assert!(i.vertrauenswuerdig);
    }

    #[test]
    fn t_r14_abgelaufen_und_fremder_name() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["andere.test"], -30, -1), BEIDE);
        let i = pruefe(a, &ca, "firma.test").unwrap();
        assert!(!i.vertrauenswuerdig);
        assert_eq!(i.pruef_fehler.as_ref().map(|f| f.code), Some("abgelaufen"));
        assert!(!i.name_passt);
    }

    #[test]
    fn unbekannte_stelle_und_noch_nicht_gueltig() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let fremd = TestCa::neu("Fremde Test-CA");
        let a = tls_server(fremd.blatt(&["firma.test"], -1, 90), BEIDE);
        let i = pruefe(a, &ca, "firma.test").unwrap();
        assert_eq!((i.vertrauenswuerdig, i.pruef_fehler.map(|f| f.code)), (false, Some("unbekannte_stelle")));
        let b = tls_server(ca.blatt(&["firma.test"], 2, 90), BEIDE);
        let i = pruefe(b, &ca, "firma.test").unwrap();
        assert_eq!((i.vertrauenswuerdig, i.pruef_fehler.map(|f| f.code)), (false, Some("noch_nicht_gueltig")));
    }

    #[test]
    fn mozilla_wurzeln_kennen_die_test_ca_nicht() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["firma.test"], -1, 90), BEIDE);
        let i = tls_info_mit("firma.test", &freigabe(), &Umgebung::test(vec![a], None)).unwrap();
        assert_eq!(i.pruef_fehler.map(|f| f.code), Some("unbekannte_stelle"));
    }

    #[test]
    fn ohne_freigabe_oder_mit_privater_adresse_kein_handshake() {
        let ca = TestCa::neu("Sicherheitscheck Test-CA");
        let a = tls_server(ca.blatt(&["firma.test"], -1, 90), BEIDE);
        let e = tls_info_mit("firma.test", &Freigabe::default(), &Umgebung::test(vec![a], Some(ca.wurzeln()))).unwrap_err();
        assert_eq!(e.fehler, FehlerArt::NichtErlaubt);
        let mut u = Umgebung::test(vec![a], Some(ca.wurzeln()));
        u.adresssperre = true;
        let e = tls_info_mit("firma.test", &freigabe(), &u).unwrap_err();
        assert_eq!(e.fehler, FehlerArt::NichtErlaubt);
    }

    #[test]
    fn kein_tls_server() {
        // Klartext statt TLS auf dem Port: der Handshake scheitert mit einem TLS-Fehler
        let a = crate::testserver::klartext_server();
        let e = tls_info_mit("firma.test", &freigabe(), &Umgebung::test(vec![a], None)).unwrap_err();
        assert_eq!(e.fehler, FehlerArt::Tls, "{e}");
    }

    #[test]
    fn namen_mit_platzhalter() {
        let sans = vec!["*.firma.test".to_string(), "firma.test".to_string()];
        assert!(name_passt(&sans, "www.firma.test"));
        assert!(name_passt(&sans, "firma.test"));
        assert!(!name_passt(&sans, "a.b.firma.test"));
        assert!(!name_passt(&["*.firma.test".to_string()], "firma.test"));
        assert!(!name_passt(&[], "firma.test"));
    }

    #[test]
    fn iso_zeit_rechnet_richtig() {
        assert_eq!(iso_zeit(0), "1970-01-01T00:00:00Z");
        assert_eq!(iso_zeit(1_794_441_600), "2026-11-12T00:00:00Z");
        assert_eq!(iso_zeit(951_782_400), "2000-02-29T00:00:00Z");
        assert_eq!(iso_zeit(1_795_564_799), "2026-11-24T23:59:59Z");
    }
}
