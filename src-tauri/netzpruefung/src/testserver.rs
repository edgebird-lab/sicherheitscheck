//! Testserver auf 127.0.0.1 für die Netztests (T-R04 bis T-R14). Kein Test fragt fremde
//! Rechner ab; Zertifikate entstehen zur Laufzeit mit rcgen und einer eigenen Test-CA.

use std::{
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};

use rcgen::{BasicConstraints, CertificateParams, CertifiedIssuer, DnType, IsCa, KeyPair};
use rustls::{
    pki_types::{CertificateDer, PrivateKeyDer, PrivatePkcs8KeyDer},
    RootCertStore, ServerConfig, ServerConnection, SupportedProtocolVersion,
};
use time::OffsetDateTime;

/// Liest die Anfrage bis zur Leerzeile (Kopf) oder bis die Gegenseite schließt.
fn lies_kopf(s: &mut TcpStream) -> String {
    let _ = s.set_read_timeout(Some(Duration::from_secs(5)));
    let mut daten = Vec::new();
    let mut puffer = [0u8; 1024];
    while !daten.windows(4).any(|w| w == b"\r\n\r\n") {
        match s.read(&mut puffer) {
            Ok(0) | Err(_) => break,
            Ok(n) => daten.extend_from_slice(&puffer[..n]),
        }
    }
    String::from_utf8_lossy(&daten).into_owned()
}

type Anfragen = Arc<Mutex<Vec<String>>>;

/// HTTP-Server: beantwortet je Verbindung eine Anfrage mit der nächsten Antwort aus der Liste.
/// Rückgabe: Adresse, Zahl der angenommenen Verbindungen, empfangene Anfragen.
pub(crate) fn http_server_mit_anfragen(antworten: Vec<Vec<u8>>) -> (SocketAddr, Arc<AtomicUsize>, Anfragen) {
    let lauscher = TcpListener::bind("127.0.0.1:0").unwrap();
    let adresse = lauscher.local_addr().unwrap();
    let zaehler = Arc::new(AtomicUsize::new(0));
    let anfragen: Anfragen = Arc::default();
    let (z, a) = (zaehler.clone(), anfragen.clone());
    thread::spawn(move || {
        for antwort in antworten {
            let Ok((mut s, _)) = lauscher.accept() else { return };
            z.fetch_add(1, Ordering::SeqCst);
            a.lock().unwrap().push(lies_kopf(&mut s));
            let _ = s.write_all(&antwort);
            let _ = s.flush();
            let _ = s.shutdown(std::net::Shutdown::Write);
            // Rest lesen, damit das Schließen keine Verbindung zurücksetzt
            let _ = s.set_read_timeout(Some(Duration::from_millis(200)));
            let _ = s.read(&mut [0u8; 64]);
        }
    });
    (adresse, zaehler, anfragen)
}

pub(crate) fn http_server(antworten: Vec<Vec<u8>>) -> (SocketAddr, Arc<AtomicUsize>) {
    let (a, z, _) = http_server_mit_anfragen(antworten);
    (a, z)
}

/// Schickt sofort Klartext statt eines TLS-Handshakes.
pub(crate) fn klartext_server() -> SocketAddr {
    let lauscher = TcpListener::bind("127.0.0.1:0").unwrap();
    let adresse = lauscher.local_addr().unwrap();
    thread::spawn(move || {
        if let Ok((mut s, _)) = lauscher.accept() {
            let _ = s.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n");
            let _ = s.flush();
            thread::sleep(Duration::from_millis(500));
        }
    });
    adresse
}

/// Nimmt die Verbindung an und antwortet nie (Zeitüberschreitung).
pub(crate) fn stummer_server() -> SocketAddr {
    let lauscher = TcpListener::bind("127.0.0.1:0").unwrap();
    let adresse = lauscher.local_addr().unwrap();
    thread::spawn(move || {
        if let Ok((s, _)) = lauscher.accept() {
            thread::sleep(Duration::from_secs(6));
            drop(s);
        }
    });
    adresse
}

/// Test-CA mit Wurzelspeicher für den Client
pub(crate) struct TestCa {
    issuer: CertifiedIssuer<'static, KeyPair>,
}

pub(crate) struct Blatt {
    pub kette: Vec<CertificateDer<'static>>,
    pub schluessel: PrivateKeyDer<'static>,
}

impl TestCa {
    /// `name` unterscheidet mehrere Test-CAs; gleiche Namen hält webpki für dieselbe Stelle.
    pub fn neu(name: &str) -> Self {
        let mut p = CertificateParams::new(Vec::<String>::new()).unwrap();
        p.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        p.distinguished_name.push(DnType::CommonName, name);
        p.distinguished_name.push(DnType::OrganizationName, "Test");
        let jetzt = OffsetDateTime::now_utc();
        p.not_before = jetzt - time::Duration::days(365);
        p.not_after = jetzt + time::Duration::days(3650);
        Self { issuer: CertifiedIssuer::self_signed(p, KeyPair::generate().unwrap()).unwrap() }
    }

    pub fn wurzeln(&self) -> RootCertStore {
        let mut w = RootCertStore::empty();
        w.add(self.issuer.der().clone()).unwrap();
        w
    }

    /// Blattzertifikat für `namen`, gültig von `ab` bis `bis` (Tage relativ zu jetzt)
    pub fn blatt(&self, namen: &[&str], ab_tage: i64, bis_tage: i64) -> Blatt {
        let mut p = CertificateParams::new(namen.iter().map(|n| n.to_string()).collect::<Vec<_>>()).unwrap();
        p.distinguished_name.push(DnType::CommonName, namen.first().copied().unwrap_or("ohne-name"));
        let jetzt = OffsetDateTime::now_utc();
        p.not_before = jetzt + time::Duration::days(ab_tage);
        p.not_after = jetzt + time::Duration::days(bis_tage);
        let schluessel = KeyPair::generate().unwrap();
        let zert = p.signed_by(&schluessel, &*self.issuer).unwrap();
        Blatt {
            kette: vec![zert.der().clone(), self.issuer.der().clone()],
            schluessel: PrivateKeyDer::Pkcs8(PrivatePkcs8KeyDer::from(schluessel.serialize_der())),
        }
    }
}

/// TLS-Server für genau einen Handshake mit den angegebenen Versionen
pub(crate) fn tls_server(blatt: Blatt, versionen: &[&'static SupportedProtocolVersion]) -> SocketAddr {
    let config = ServerConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
        .with_protocol_versions(versionen)
        .unwrap()
        .with_no_client_auth()
        .with_single_cert(blatt.kette, blatt.schluessel)
        .unwrap();
    let config = Arc::new(config);
    let lauscher = TcpListener::bind("127.0.0.1:0").unwrap();
    let adresse = lauscher.local_addr().unwrap();
    thread::spawn(move || {
        let Ok((mut s, _)) = lauscher.accept() else { return };
        let _ = s.set_read_timeout(Some(Duration::from_secs(5)));
        let mut verbindung = ServerConnection::new(config).unwrap();
        while verbindung.is_handshaking() {
            if verbindung.complete_io(&mut s).is_err() {
                return;
            }
        }
        // auf close_notify des Clients warten
        let _ = verbindung.complete_io(&mut s);
    });
    adresse
}
