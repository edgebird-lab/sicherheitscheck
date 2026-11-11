import type { Vorfrage } from '../modell/typen'

/**
 * Vorfragen im Vorgespräch. Eine Antwort, die nicht zu `relevantWenn` passt, macht die
 * abhängige Anforderung „nicht relevant“ (Spezifikation 6.1).
 *
 * Eigene Formulierungen. Welche Anforderungen die Norm als „nicht relevant“ zulässt und
 * über welche Fragen, ist eine Annahme bis zum Abgleich in Phase 0.2 (docs/katalog-abgleich.md).
 */
export const VORFRAGEN: Vorfrage[] = [
  {
    id: 'mobiles_arbeiten',
    frage: 'Arbeiten Beschäftigte im Homeoffice oder unterwegs mit Firmendaten?',
    hilfe: 'Gemeint ist jede Arbeit außerhalb der Betriebsräume mit Firmengeräten oder Zugriff auf Firmendaten, auch gelegentlich. Bei „Nein“ entfällt die Anforderung zu Regeln für mobiles Arbeiten.',
  },
  {
    id: 'wlan',
    frage: 'Betreibt der Betrieb ein eigenes WLAN?',
    hilfe: 'Auch das WLAN des Internet-Routers zählt, selbst wenn es nur Gäste nutzen. Bei „Nein“ entfällt die Anforderung zum WLAN.',
  },
  {
    id: 'fernzugriff',
    frage: 'Greift jemand von außen auf Rechner oder Daten im Betrieb zu, etwa per Fernwartung oder VPN?',
    hilfe: 'Dazu zählen Fernwartung durch einen IT-Dienstleister, Fernsteuerungsprogramme und VPN-Zugänge von Beschäftigten. Cloud-Dienste, die nur im Browser genutzt werden, zählen nicht. Bei „Nein“ entfällt die Anforderung zum Fernzugriff.',
  },
  {
    id: 'mobilgeraete',
    frage: 'Werden Smartphones oder Tablets für die Arbeit genutzt, auch private?',
    hilfe: 'Schon das Abrufen der Firmen-E-Mails auf dem privaten Handy zählt. Bei „Nein“ entfällt die Anforderung zu Smartphones und Tablets.',
  },
]
