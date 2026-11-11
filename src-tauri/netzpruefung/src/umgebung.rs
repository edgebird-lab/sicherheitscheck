//! Umgebung der Netzzugriffe: Adresssperre, Wurzelzertifikate, Namensauflösung, Zeitgrenzen.
//! Nur Tests ändern die Standardwerte (Testserver auf 127.0.0.1 mit eigener Test-CA).

use std::{
    net::{SocketAddr, ToSocketAddrs},
    sync::Arc,
    time::Duration,
};

use rustls::{ClientConfig, RootCertStore};

use crate::fehler::{FehlerArt, NetzFehler};

pub(crate) enum Aufloeser {
    /// Namensauflösung des Systems
    System,
    /// jeder Name ergibt diese Adressen (nur Tests)
    #[cfg(test)]
    Fest(Vec<SocketAddr>),
}

pub(crate) struct Umgebung {
    /// Private und besondere Adressen sperren (7.7); nur Tests schalten das ab.
    pub adresssperre: bool,
    pub wurzeln: Arc<RootCertStore>,
    pub aufloeser: Aufloeser,
    /// Aufbau der Verbindung
    pub verbindung: Duration,
    /// ganzer Abruf (HTTP) bzw. Lesen und Schreiben (TLS)
    pub gesamt: Duration,
}

/// Mozilla-Wurzeln (webpki-roots): gleiche Prüfung auf jedem Rechner (7.2)
pub(crate) fn mozilla_wurzeln() -> Arc<RootCertStore> {
    Arc::new(RootCertStore { roots: webpki_roots::TLS_SERVER_ROOTS.to_vec() })
}

pub(crate) fn kryptoanbieter() -> Arc<rustls::crypto::CryptoProvider> {
    Arc::new(rustls::crypto::ring::default_provider())
}

fn loese_system(host: &str, port: u16) -> Result<Vec<SocketAddr>, NetzFehler> {
    Ok((host, port).to_socket_addrs().map_err(|e| NetzFehler::neu(FehlerArt::Verbindung, format!("Name nicht auflösbar: {e}")))?.collect())
}

/// Alle Adressen müssen öffentlich sein (7.7); sonst wird gar nicht verbunden.
fn pruefe_adressen(host: &str, adressen: Vec<SocketAddr>, sperre: bool) -> Result<Vec<SocketAddr>, NetzFehler> {
    if adressen.is_empty() {
        return Err(NetzFehler::neu(FehlerArt::Verbindung, format!("Keine Adresse für {host}")));
    }
    if sperre {
        if let Some(a) = adressen.iter().find(|a| !crate::ziel::ist_oeffentlich(a.ip())) {
            return Err(NetzFehler::nicht_erlaubt(format!("{host} zeigt auf eine nicht öffentliche Adresse ({})", a.ip())));
        }
    }
    Ok(adressen)
}

impl Umgebung {
    pub fn standard() -> Self {
        Self { adresssperre: true, wurzeln: mozilla_wurzeln(), aufloeser: Aufloeser::System, verbindung: Duration::from_secs(5), gesamt: Duration::from_secs(10) }
    }

    /// rustls-Konfiguration für reqwest: TLS 1.2 und 1.3, Prüfung gegen `wurzeln`
    pub fn client_config(&self) -> Result<ClientConfig, NetzFehler> {
        Ok(ClientConfig::builder_with_provider(kryptoanbieter())
            .with_protocol_versions(&[&rustls::version::TLS13, &rustls::version::TLS12])
            .map_err(|e| NetzFehler::neu(FehlerArt::Tls, format!("TLS-Einstellungen: {e}")))?
            .with_root_certificates(self.wurzeln.clone())
            .with_no_client_auth())
    }

    /// Löst einen Namen auf und prüft die Adressen (blockierend).
    pub fn loese_auf(&self, host: &str, port: u16) -> Result<Vec<SocketAddr>, NetzFehler> {
        let adressen = match &self.aufloeser {
            Aufloeser::System => loese_system(host, port)?,
            #[cfg(test)]
            Aufloeser::Fest(a) => a.clone(),
        };
        pruefe_adressen(host, adressen, self.adresssperre)
    }

    /// Wie `loese_auf`, aber die blockierende Auflösung des Systems läuft in einem eigenen Thread.
    pub async fn loese_auf_async(&self, host: &str, port: u16) -> Result<Vec<SocketAddr>, NetzFehler> {
        let adressen = match &self.aufloeser {
            Aufloeser::System => {
                let h = host.to_string();
                tokio::task::spawn_blocking(move || loese_system(&h, port))
                    .await
                    .map_err(|e| NetzFehler::neu(FehlerArt::Verbindung, format!("Namensauflösung: {e}")))??
            }
            #[cfg(test)]
            Aufloeser::Fest(a) => a.clone(),
        };
        pruefe_adressen(host, adressen, self.adresssperre)
    }

    #[cfg(test)]
    pub fn test(adressen: Vec<SocketAddr>, wurzeln: Option<RootCertStore>) -> Self {
        Self {
            adresssperre: false,
            wurzeln: wurzeln.map(Arc::new).unwrap_or_else(mozilla_wurzeln),
            aufloeser: Aufloeser::Fest(adressen),
            verbindung: Duration::from_secs(2),
            gesamt: Duration::from_secs(5),
        }
    }
}
