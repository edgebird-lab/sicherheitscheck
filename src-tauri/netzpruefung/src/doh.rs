//! `doh_abfrage` (7.7): DNS über HTTPS bei Cloudflare oder Google mit den festen Adressen aus
//! 6.4. Rückgabe ist der JSON-Text der Antwort; das Lesen übernimmt die Oberfläche
//! (`ausDohJson` in src/netz/schnittstelle.ts), wie im Browser.

use std::time::Duration;

use crate::{
    fehler::{FehlerArt, NetzFehler},
    freigabe::name_gueltig,
    http::fehler_aus_reqwest,
    umgebung::Umgebung,
    USER_AGENT,
};

/// Erlaubte Typen (6.4)
const TYPEN: [&str; 6] = ["A", "AAAA", "MX", "TXT", "CAA", "SOA"];
/// Größte angenommene Antwort in Byte
const MAX_ANTWORT: usize = 65_536;
/// Zeitlimit je Abfrage (6.4)
const ZEITLIMIT: Duration = Duration::from_secs(5);

/// Adresse der Anfrage nach 6.4. `basis` ersetzt nur in Tests den Anbieter.
fn adresse(anbieter: &str, name: &str, typ: &str, ohne_pruefung: bool, basis: Option<&str>) -> Result<String, NetzFehler> {
    let cd = if ohne_pruefung { "&cd=1" } else { "" };
    let url = match anbieter {
        "cloudflare" => format!("{}/dns-query?name={name}&type={typ}{cd}", basis.unwrap_or("https://cloudflare-dns.com")),
        // keine Angaben zum Netz des Beraters an Google (Spezifikation 8)
        "google" => format!("{}/resolve?name={name}&type={typ}{cd}&edns_client_subnet=0.0.0.0/0", basis.unwrap_or("https://dns.google")),
        _ => return Err(NetzFehler::nicht_erlaubt(format!("Unbekannter DoH-Anbieter „{anbieter}“"))),
    };
    if !TYPEN.contains(&typ) {
        return Err(NetzFehler::nicht_erlaubt(format!("Typ {typ} wird nicht abgefragt.")));
    }
    // Namen ohne Punkt (etwa die TLD bei CAA) sind erlaubt; sonst wie bei der Freigabe, mit „_“
    let gueltig = name_gueltig(name, true) || name_gueltig(&format!("{name}.x"), true) && !name.contains('.');
    if !gueltig {
        return Err(NetzFehler::nicht_erlaubt(format!("„{name}“ ist kein gültiger Name.")));
    }
    Ok(url)
}

/// Öffentlicher Befehl mit den festen Adressen der Anbieter.
pub async fn doh_abfrage(anbieter: &str, name: &str, typ: &str, ohne_pruefung: bool) -> Result<String, NetzFehler> {
    let url = adresse(anbieter, name, typ, ohne_pruefung, None)?;
    abfragen(&url, anbieter == "cloudflare", &Umgebung::standard()).await
}

async fn abfragen(url: &str, accept: bool, u: &Umgebung) -> Result<String, NetzFehler> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(ZEITLIMIT)
        .timeout(ZEITLIMIT)
        .user_agent(USER_AGENT)
        .tls_backend_preconfigured(u.client_config()?)
        .build()
        .map_err(|e| NetzFehler::neu(FehlerArt::Verbindung, format!("HTTP-Client: {e}")))?;
    let mut anfrage = client.get(url);
    if accept {
        anfrage = anfrage.header("accept", "application/dns-json");
    }
    let mut antwort = anfrage.send().await.map_err(|e| fehler_aus_reqwest(&e))?;
    let status = antwort.status().as_u16();
    if status != 200 {
        return Err(NetzFehler { http_status: Some(status), ..NetzFehler::neu(FehlerArt::Antwort, format!("HTTP {status}")) });
    }
    let mut bytes = Vec::new();
    while let Some(stueck) = antwort.chunk().await.map_err(|e| fehler_aus_reqwest(&e))? {
        if bytes.len() + stueck.len() > MAX_ANTWORT {
            return Err(NetzFehler::neu(FehlerArt::Antwort, "Antwort zu groß"));
        }
        bytes.extend_from_slice(&stueck);
    }
    String::from_utf8(bytes).map_err(|_| NetzFehler::neu(FehlerArt::Antwort, "Antwort ist kein Text"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testserver::http_server_mit_anfragen;

    #[tokio::test]
    async fn t_r08_nur_bekannte_anbieter_und_typen() {
        for (anbieter, name, typ) in [("quad9", "firma.de", "TXT"), ("cloudflare", "firma.de", "ANY"), ("google", "firma.de", "AXFR"), ("cloudflare", "firma.de/../x", "TXT"), ("cloudflare", "Firma.de", "TXT")] {
            let e = doh_abfrage(anbieter, name, typ, false).await.unwrap_err();
            assert_eq!(e.fehler, FehlerArt::NichtErlaubt, "{anbieter} {name} {typ}");
        }
    }

    #[test]
    fn adressen_nach_6_4() {
        assert_eq!(adresse("cloudflare", "_dmarc.firma.de", "TXT", false, None).unwrap(), "https://cloudflare-dns.com/dns-query?name=_dmarc.firma.de&type=TXT");
        assert_eq!(adresse("google", "firma.de", "SOA", true, None).unwrap(), "https://dns.google/resolve?name=firma.de&type=SOA&cd=1&edns_client_subnet=0.0.0.0/0");
        assert_eq!(adresse("cloudflare", "de", "CAA", false, None).unwrap(), "https://cloudflare-dns.com/dns-query?name=de&type=CAA");
        assert!(adresse("cloudflare", &"a".repeat(64), "CAA", false, None).is_err());
    }

    #[tokio::test]
    async fn fragt_mit_accept_ab_und_reicht_den_text_durch() {
        let json = r#"{"Status":0,"AD":false,"Answer":[]}"#;
        let antwort = format!("HTTP/1.1 200 OK\r\nContent-Type: application/dns-json\r\nContent-Length: {}\r\n\r\n{json}", json.len());
        let (a, _, anfragen) = http_server_mit_anfragen(vec![antwort.into_bytes(), b"HTTP/1.1 503 Service Unavailable\r\nContent-Length: 0\r\n\r\n".to_vec()]);
        let basis = format!("http://{a}");
        let u = Umgebung::test(vec![a], None);
        let url = adresse("cloudflare", "firma.test", "MX", false, Some(&basis)).unwrap();
        assert_eq!(abfragen(&url, true, &u).await.unwrap(), json);
        let kopf = anfragen.lock().unwrap()[0].to_ascii_lowercase();
        assert!(kopf.starts_with("get /dns-query?name=firma.test&type=mx http/1.1"), "{kopf}");
        assert!(kopf.contains("accept: application/dns-json"));
        let e = abfragen(&url, true, &u).await.unwrap_err();
        assert_eq!((e.fehler, e.http_status), (FehlerArt::Antwort, Some(503)));
    }
}
