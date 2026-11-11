import type { Thema } from '../modell/typen'

/**
 * Die sechs Themenbereiche der DIN SPEC 27076 in der Reihenfolge der Norm (Spezifikation 3.1).
 * Die Zuordnung zu Bausteinen des IT-Grundschutz-Kompendiums (Edition 2023) ist ein
 * Vorschlag (Spezifikation 3.5); Robin prüft sie in Phase 4.5.
 */
export const THEMEN: Thema[] = [
  {
    id: 'organisation',
    nr: 1,
    name: 'Organisation & Sensibilisierung',
    grundschutz: ['ISMS.1', 'ORP.1', 'ORP.2', 'ORP.3', 'DER.2.1', 'DER.4'],
  },
  {
    id: 'identitaet',
    nr: 2,
    name: 'Identitäts- und Berechtigungsmanagement',
    grundschutz: ['ORP.4'],
  },
  {
    id: 'datensicherung',
    nr: 3,
    name: 'Datensicherung',
    grundschutz: ['CON.3'],
  },
  {
    id: 'patch',
    nr: 4,
    name: 'Patch- und Änderungsmanagement',
    grundschutz: ['OPS.1.1.3'],
  },
  {
    id: 'schadprogramme',
    nr: 5,
    name: 'Schutz vor Schadprogrammen',
    grundschutz: ['OPS.1.1.4', 'APP.1.1'],
  },
  {
    id: 'systeme',
    nr: 6,
    name: 'IT-Systeme und Netzwerke',
    grundschutz: ['NET.1.1', 'NET.2.1', 'NET.3.2', 'SYS.2.1', 'SYS.3.2.1', 'OPS.1.2.5'],
  },
]

/** Titel der Bausteine (IT-Grundschutz-Kompendium, Edition 2023), für die ISMS-Brücke im Bericht */
export const GRUNDSCHUTZ_BAUSTEINE: Record<string, string> = {
  'ISMS.1': 'Sicherheitsmanagement',
  'ORP.1': 'Organisation',
  'ORP.2': 'Personal',
  'ORP.3': 'Sensibilisierung und Schulung zur Informationssicherheit',
  'ORP.4': 'Identitäts- und Berechtigungsmanagement',
  'DER.2.1': 'Behandlung von Sicherheitsvorfällen',
  'DER.4': 'Notfallmanagement',
  'CON.3': 'Datensicherungskonzept',
  'OPS.1.1.3': 'Patch- und Änderungsmanagement',
  'OPS.1.1.4': 'Schutz vor Schadprogrammen',
  'APP.1.1': 'Office-Produkte',
  'NET.1.1': 'Netzarchitektur und -design',
  'NET.2.1': 'WLAN-Betrieb',
  'NET.3.2': 'Firewall',
  'SYS.2.1': 'Allgemeiner Client',
  'SYS.3.2.1': 'Allgemeine Smartphones und Tablets',
  'OPS.1.2.5': 'Fernwartung',
  // Außenprüfung (Zusatz)
  'APP.3.1': 'Webanwendungen und Webservices',
  'APP.3.2': 'Webserver',
  'APP.5.3': 'Allgemeiner E-Mail-Client und -Server',
  'CON.1': 'Kryptokonzept',
}
