//! `http_abruf` (7.7): GET ohne Weiterleitung, ohne Körper in der Anfrage, ohne Cookies und
//! ohne Proxy. Verbindung 5 s, gesamt 10 s, Zertifikate gegen die Mozilla-Wurzeln. Zurück
//! gehen nur ausgewählte Kopfzeilen; Cookie-Werte werden entfernt; den Körper liest der Abruf
//! nur unter `/.well-known/` und höchstens 64 KiB.

use serde::Serialize;

use crate::{
    fehler::{finde_rustls, FehlerArt, NetzFehler},
    freigabe::Freigabe,
    umgebung::Umgebung,
    ziel::pruefe_url,
    USER_AGENT,
};

/// Größter gelesener Körper in Byte
pub const MAX_TEXT: usize = 65_536;
/// Längster zurückgegebener Wert einer Kopfzeile (Zeichen); längere werden gekürzt
const MAX_KOPFWERT: usize = 8192;
/// Höchstens so viele Kopfzeilen gehen zurück
const MAX_KOPFZEILEN: usize = 64;

/// Nur diese Kopfzeilen gehen an die Oberfläche (7.7).
pub const KOPFZEILEN: [&str; 12] = [
    "location",
    "content-type",
    "strict-transport-security",
    "content-security-policy",
    "content-security-policy-report-only",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "x-xss-protection",
    "server",
    "x-powered-by",
    "set-cookie",
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct HttpAntwort {
    pub url: String,
    pub status: u16,
    /// Namen klein, Reihenfolge und Mehrfachnennungen wie geliefert
    pub kopfzeilen: Vec<(String, String)>,
    pub text: Option<String>,
    pub gekuerzt: bool,
}

/// `sid=geheim; Secure; HttpOnly` → `sid=…; Secure; HttpOnly`
pub(crate) fn ohne_cookie_wert(wert: &str) -> String {
    let (paar, rest) = match wert.find(';') {
        Some(i) => (&wert[..i], &wert[i..]),
        None => (wert, ""),
    };
    let name = paar.split('=').next().unwrap_or("").trim();
    format!("{name}=…{rest}")
}

fn kuerze(text: String) -> String {
    if text.chars().count() <= MAX_KOPFWERT {
        return text;
    }
    let mut k: String = text.chars().take(MAX_KOPFWERT - 1).collect();
    k.push('…');
    k
}

/// Kopfzeilen nach der Liste filtern; Cookie-Werte entfernen
pub(crate) fn filtere_kopfzeilen<'a>(alle: impl Iterator<Item = (&'a str, &'a [u8])>) -> Vec<(String, String)> {
    alle.filter_map(|(name, wert)| {
        let name = name.to_ascii_lowercase();
        if !KOPFZEILEN.contains(&name.as_str()) {
            return None;
        }
        let wert = String::from_utf8_lossy(wert).into_owned();
        let wert = if name == "set-cookie" { ohne_cookie_wert(&wert) } else { wert };
        Some((name, kuerze(wert)))
    })
    .take(MAX_KOPFZEILEN)
    .collect()
}

pub(crate) fn fehler_aus_reqwest(e: &reqwest::Error) -> NetzFehler {
    if e.is_timeout() {
        return NetzFehler::neu(FehlerArt::Zeitueberschreitung, "Zeitüberschreitung");
    }
    if let Some(r) = finde_rustls(e) {
        return NetzFehler::neu(FehlerArt::Tls, format!("TLS-Fehler: {r}"));
    }
    if e.is_connect() {
        let grund = std::error::Error::source(e).map(|s| s.to_string()).unwrap_or_default();
        return NetzFehler::neu(FehlerArt::Verbindung, format!("Keine Verbindung{}", if grund.is_empty() { String::new() } else { format!(" ({grund})") }));
    }
    NetzFehler::neu(FehlerArt::Antwort, format!("Ungültige Antwort: {e}"))
}

/// Öffentlicher Befehl: immer mit Adresssperre und Mozilla-Wurzeln.
pub async fn http_abruf(url: &str, freigabe: &Freigabe) -> Result<HttpAntwort, NetzFehler> {
    http_abruf_mit(url, freigabe, &Umgebung::standard()).await
}

pub(crate) async fn http_abruf_mit(text: &str, freigabe: &Freigabe, u: &Umgebung) -> Result<HttpAntwort, NetzFehler> {
    let (url, host) = pruefe_url(text, freigabe)?;
    let port = url.port_or_known_default().unwrap_or(80);
    let adressen = u.loese_auf_async(&host, port).await?;
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(u.verbindung)
        .timeout(u.gesamt)
        .user_agent(USER_AGENT)
        .tls_backend_preconfigured(u.client_config()?)
        // nur zu den geprüften Adressen verbinden, kein zweites Auflösen
        .resolve_to_addrs(&host, &adressen)
        .build()
        .map_err(|e| NetzFehler::neu(FehlerArt::Verbindung, format!("HTTP-Client: {e}")))?;
    let mut antwort = client.get(url.clone()).send().await.map_err(|e| fehler_aus_reqwest(&e))?;
    let status = antwort.status().as_u16();
    let kopfzeilen = filtere_kopfzeilen(antwort.headers().iter().map(|(n, w)| (n.as_str(), w.as_bytes())));
    let (text, gekuerzt) = if url.path().starts_with("/.well-known/") {
        let mut bytes: Vec<u8> = Vec::new();
        let mut gekuerzt = false;
        while let Some(stueck) = antwort.chunk().await.map_err(|e| fehler_aus_reqwest(&e))? {
            let rest = MAX_TEXT - bytes.len();
            if stueck.len() > rest {
                bytes.extend_from_slice(&stueck[..rest]);
                gekuerzt = true;
                break;
            }
            bytes.extend_from_slice(&stueck);
        }
        (Some(String::from_utf8_lossy(&bytes).into_owned()), gekuerzt)
    } else {
        (None, false)
    };
    Ok(HttpAntwort { url: url.to_string(), status, kopfzeilen, text, gekuerzt })
}

#[cfg(test)]
mod tests {
    use std::{net::SocketAddr, time::Duration};

    use super::*;
    use crate::testserver::{http_server, stummer_server};

    fn freigabe() -> Freigabe {
        let f = Freigabe::default();
        f.setze("firma.test").unwrap();
        f
    }

    fn umgebung(adresse: SocketAddr) -> Umgebung {
        Umgebung::test(vec![adresse], None)
    }

    #[test]
    fn entfernt_cookie_werte() {
        assert_eq!(ohne_cookie_wert("sid=geheim; Secure"), "sid=…; Secure");
        assert_eq!(ohne_cookie_wert("sid=geheim"), "sid=…");
        assert_eq!(ohne_cookie_wert("a=b=c; HttpOnly; Path=/"), "a=…; HttpOnly; Path=/");
        assert_eq!(ohne_cookie_wert(" leer ; Secure"), "leer=…; Secure");
    }

    #[tokio::test]
    async fn t_r01_ohne_freigabe_kein_abruf() {
        let (adresse, zaehler) = http_server(vec![b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n".to_vec()]);
        let e = http_abruf_mit("http://firma.test/", &Freigabe::default(), &umgebung(adresse)).await.unwrap_err();
        assert_eq!(e.fehler, FehlerArt::NichtErlaubt);
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(zaehler.load(std::sync::atomic::Ordering::SeqCst), 0, "kein Netzverkehr");
    }

    #[tokio::test]
    async fn adresssperre_greift_vor_der_verbindung() {
        let (adresse, zaehler) = http_server(vec![b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n".to_vec()]);
        let mut u = umgebung(adresse);
        u.adresssperre = true;
        let e = http_abruf_mit("http://firma.test/", &freigabe(), &u).await.unwrap_err();
        assert_eq!(e.fehler, FehlerArt::NichtErlaubt);
        assert!(e.text.contains("127.0.0.1"), "{}", e.text);
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(zaehler.load(std::sync::atomic::Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn t_r04_weiterleitung_wird_nicht_verfolgt() {
        let (adresse, zaehler) = http_server(vec![
            b"HTTP/1.1 301 Moved Permanently\r\nLocation: https://firma.test/\r\nContent-Length: 0\r\n\r\n".to_vec(),
            b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n".to_vec(),
        ]);
        let r = http_abruf_mit("http://firma.test/", &freigabe(), &umgebung(adresse)).await.unwrap();
        assert_eq!(r.status, 301);
        assert_eq!(r.kopfzeilen, vec![("location".to_string(), "https://firma.test/".to_string())]);
        assert_eq!(r.url, "http://firma.test/");
        assert_eq!(r.text, None);
        tokio::time::sleep(Duration::from_millis(100)).await;
        assert_eq!(zaehler.load(std::sync::atomic::Ordering::SeqCst), 1, "kein zweiter Abruf");
    }

    #[tokio::test]
    async fn t_r05_koerper_nur_unter_well_known_und_hoechstens_64_kib() {
        let mut gross = b"HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 100000\r\n\r\n".to_vec();
        gross.extend(std::iter::repeat_n(b'x', 100_000));
        let (adresse, _) = http_server(vec![gross.clone(), gross]);
        let r = http_abruf_mit("http://firma.test/.well-known/x.txt", &freigabe(), &umgebung(adresse)).await.unwrap();
        assert_eq!(r.text.as_deref().map(str::len), Some(65_536));
        assert!(r.gekuerzt);
        let r = http_abruf_mit("http://firma.test/", &freigabe(), &umgebung(adresse)).await.unwrap();
        assert_eq!(r.text, None);
        assert!(!r.gekuerzt);
        assert_eq!(r.status, 200);
    }

    #[tokio::test]
    async fn t_r06_zeitueberschreitung() {
        let adresse = stummer_server();
        let mut u = umgebung(adresse);
        u.gesamt = Duration::from_secs(1);
        let beginn = std::time::Instant::now();
        let e = http_abruf_mit("http://firma.test/", &freigabe(), &u).await.unwrap_err();
        assert_eq!(e.fehler, FehlerArt::Zeitueberschreitung, "{e}");
        assert!(beginn.elapsed() < Duration::from_secs(4));
    }

    #[tokio::test]
    async fn t_r07_kopfzeilenfilter() {
        let (adresse, _) = http_server(vec![
            b"HTTP/1.1 200 OK\r\nX-Geheim: 1\r\nSet-Cookie: sid=geheim; Secure\r\nSet-Cookie: zweit=wert\r\nServer: nginx\r\nStrict-Transport-Security: max-age=63072000\r\nContent-Length: 0\r\n\r\n".to_vec(),
        ]);
        let r = http_abruf_mit("http://firma.test/", &freigabe(), &umgebung(adresse)).await.unwrap();
        assert!(!r.kopfzeilen.iter().any(|(n, _)| n == "x-geheim"));
        let cookies: Vec<&str> = r.kopfzeilen.iter().filter(|(n, _)| n == "set-cookie").map(|(_, w)| w.as_str()).collect();
        assert_eq!(cookies, ["sid=…; Secure", "zweit=…"]);
        assert!(r.kopfzeilen.contains(&("server".into(), "nginx".into())));
        assert!(r.kopfzeilen.contains(&("strict-transport-security".into(), "max-age=63072000".into())));
        assert!(!format!("{r:?}").contains("geheim"));
    }

    #[tokio::test]
    async fn keine_verbindung() {
        // ein Port, auf dem niemand lauscht
        let frei = std::net::TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap();
        // Windows wiederholt den Verbindungsversuch zu einem geschlossenen Port rund 2 s lang
        let mut u = umgebung(frei);
        u.verbindung = Duration::from_secs(5);
        let e = http_abruf_mit("http://firma.test/", &freigabe(), &u).await.unwrap_err();
        assert_eq!(e.fehler, FehlerArt::Verbindung, "{e}");
    }

    #[tokio::test]
    async fn sendet_nur_get_mit_eigenem_user_agent() {
        let (adresse, _, anfragen) = crate::testserver::http_server_mit_anfragen(vec![b"HTTP/1.1 204 No Content\r\n\r\n".to_vec()]);
        let r = http_abruf_mit("http://www.firma.test/pfad?x=1", &freigabe(), &umgebung(adresse)).await.unwrap();
        assert_eq!(r.status, 204);
        let anfrage = anfragen.lock().unwrap()[0].to_ascii_lowercase();
        assert!(anfrage.starts_with("get /pfad?x=1 http/1.1\r\n"), "{anfrage}");
        assert!(anfrage.contains("user-agent: sicherheitscheck/0.1 (passive pruefung)"));
        assert!(anfrage.contains("host: www.firma.test"));
        assert!(!anfrage.contains("cookie"));
    }
}
