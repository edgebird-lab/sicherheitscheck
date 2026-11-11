/**
 * Feste Texte des Berichts (Spezifikation 6.13, 8): eigene Formulierungen, kein Normtext.
 * „Methodik und Grenzen“ soll vor dem ersten bezahlten Auftrag anwaltlich geprüft werden (F10).
 */

export const KEINE_ZERTIFIZIERUNG = 'Der Check ist keine Zertifizierung.'

export const METHODIK: { titel: string; text: string }[] = [
  {
    titel: 'Vorgehen',
    text: 'Die Beratung folgt dem Vorgehen der DIN SPEC 27076 „IT-Sicherheitsberatung für Klein- und Kleinstunternehmen“: Vorgespräch, Interview zu 27 Anforderungen in sechs Themenbereichen anhand der Leitfragen der Norm, Auswertung, Bericht und Besprechung. Kurzfragen, Erläuterungen und Maßnahmen in diesem Bericht sind eigene Formulierungen des Beraters, kein Normtext.',
  },
  {
    titel: 'Bewertung',
    text: 'Eine erfüllte Basis-Anforderung zählt 1 Punkt, eine erfüllte TOP-Anforderung 3 Punkte, eine nicht erfüllte TOP-Anforderung −3 Punkte. Teilweise erfüllte oder unklare Anforderungen gelten als nicht erfüllt. Nicht relevante Anforderungen fallen aus dem Höchstwert. Ausgewiesen wird mindestens 0 Punkte.',
  },
  {
    titel: 'Momentaufnahme',
    text: 'Das Ergebnis beruht auf den Auskünften der Teilnehmenden am Tag des Interviews; Nachweise wurden nur stichprobenartig eingesehen. Es beschreibt den Stand zu diesem Zeitpunkt und ersetzt keine regelmäßige Überprüfung.',
  },
  {
    titel: 'Kein Zertifikat, keine Rechtsberatung',
    text: 'Der Check ist keine Zertifizierung und kein Audit. Er bewertet keine Rechtslage, etwa nach DSGVO, NIS2 oder TDDDG.',
  },
  {
    titel: 'Prüfung von außen',
    text: 'Teil B ist ein Zusatz und nicht Teil der DIN SPEC 27076. Gelesen werden nur öffentlich abrufbare Informationen: DNS-Einträge über einen Anbieter für DNS über HTTPS, im Windows-Programm zusätzlich Startseite, security.txt und MTA-STS-Richtlinie. Es gab keine Portscans, keine Anmeldeversuche und keine Angriffe. Eine passive Prüfung findet nicht alle Schwachstellen. Nicht geprüft werden Mailserver per SMTP (etwa STARTTLS), alte TLS-Versionen und der Sperrstatus von Zertifikaten. Ein Virenschutz oder Proxy auf dem Rechner des Beraters kann Angaben zu Zertifikaten verfälschen.',
  },
  {
    titel: 'Auftrag',
    text: 'Die Bestätigung in Teil B ersetzt keinen schriftlichen Auftrag. Dieser sollte die geprüfte Domain und den Zeitraum der Prüfung nennen.',
  },
]

export const KATALOG_VORLAEUFIG =
  'Hinweis: Nummerierung und Zuordnung der Anforderungen sind noch nicht abschließend mit der DIN SPEC 27076 abgeglichen. Die Bewertung nach dem Punkteschema bleibt davon unberührt.'

export const GRENZEN_AUSSENPRUEFUNG =
  'Passive Prüfung von außen, nur öffentlich abrufbare Informationen. Sie findet nicht alle Schwachstellen. Nicht geprüft: Mailserver per SMTP, alte TLS-Versionen, Sperrstatus von Zertifikaten; im Browser außerdem die Website (nur im Windows-Programm).'

export const ISMS_HINWEIS =
  'Zuordnung der Themenbereiche zu Bausteinen des IT-Grundschutz-Kompendiums (Edition 2023) als Vorschlag für den Weg zu einem Informationssicherheits-Managementsystem. Sie ist nicht mit dem BSI abgestimmt.'

/** Bausteine für die Prüfung von außen (Spezifikation 3.5) */
export const AUSSEN_BAUSTEINE = ['APP.3.1', 'APP.3.2', 'APP.5.3', 'CON.1']

export const FOERDER_LINKS: { name: string; url: string }[] = [
  { name: 'Förderdatenbank des Bundes', url: 'https://www.foerderdatenbank.de' },
  { name: 'Transferstelle Cybersicherheit im Mittelstand', url: 'https://transferstelle-cybersicherheit.de' },
]
