import type { Regeltext } from '../modell/typen'

/**
 * Texte zu den Regeln der Außenprüfung (Spezifikation 6.5), eigene Formulierungen für Laien.
 * Die Reihenfolge je Prüfung folgt den Tabellen in 6.5: Bei gleicher Stufe gewinnt die Regel,
 * die hier zuerst steht. Eine Maßnahme gibt es nur bei hinweis, warnung und kritisch.
 * Die Website-Regeln (6.6) folgen mit dem Windows-Programm (Phase 5).
 *
 * Die Regel ‹Präfix›-00 steht für „nicht prüfbar“: Abfrage gescheitert, Grenze erreicht oder
 * Lauf abgebrochen; der Messwert nennt den Grund.
 */
export const REGELTEXTE: Regeltext[] = [
  /* ---------- MX ---------- */
  {
    regel: 'MX-00',
    pruefId: 'mx',
    stufe: 'fehler',
    titel: 'Mailserver nicht prüfbar',
    erklaerung: 'Die Abfrage der MX-Einträge ist gescheitert, etwa wegen einer Zeitüberschreitung oder eines Fehlers beim Nameserver. Über die Einstellungen der Domain sagt das nichts.',
    massnahme: null,
  },
  {
    regel: 'MX-01',
    pruefId: 'mx',
    stufe: 'fehler',
    titel: 'Domain existiert nicht',
    erklaerung: 'Der Nameserver meldet, dass es diese Domain nicht gibt (NXDOMAIN). Deshalb entfallen alle weiteren Prüfungen. Meist hilft es, die Schreibweise der Domain zu prüfen.',
    massnahme: null,
  },
  {
    regel: 'MX-02',
    pruefId: 'mx',
    stufe: 'info',
    titel: 'Domain empfängt keine E-Mail',
    erklaerung: 'Ein Null-MX-Eintrag erklärt ausdrücklich, dass unter dieser Domain keine E-Mails angenommen werden. Das passt, wenn die Domain nicht für E-Mail genutzt wird.',
    massnahme: null,
  },
  {
    regel: 'MX-03',
    pruefId: 'mx',
    stufe: 'info',
    titel: 'Mailserver eingetragen',
    erklaerung: 'Die MX-Einträge nennen die Server, die E-Mails für die Domain annehmen. Die Zahl davor legt die Reihenfolge fest: Absender versuchen kleinere Zahlen zuerst.',
    massnahme: null,
  },
  {
    regel: 'MX-04',
    pruefId: 'mx',
    stufe: 'info',
    titel: 'Kein MX-Eintrag',
    erklaerung: 'Für die Domain ist kein Mailserver eingetragen. Absender versuchen dann, E-Mails direkt an die Adresse der Domain zu senden. Wird die Domain nicht für E-Mail genutzt, ist ein Null-MX-Eintrag eindeutiger.',
    massnahme: null,
  },

  /* ---------- SPF ---------- */
  {
    regel: 'SPF-00',
    pruefId: 'spf',
    stufe: 'fehler',
    titel: 'SPF nicht prüfbar',
    erklaerung: 'Eine Abfrage für den SPF-Eintrag oder für ein eingebundenes include ist gescheitert. Empfänger würden das als vorübergehenden Fehler (temperror) werten.',
    massnahme: null,
  },
  {
    regel: 'SPF-01',
    pruefId: 'spf',
    stufe: 'warnung',
    titel: 'Kein SPF-Eintrag',
    erklaerung: 'Ohne SPF können Empfänger nicht prüfen, welche Server E-Mails im Namen der Domain senden dürfen. Gefälschte Absenderadressen fallen so weniger auf.',
    massnahme:
      'Einen SPF-Eintrag (TXT) anlegen, der alle Dienste nennt, die E-Mails für die Domain versenden, und ihn mit „-all“ oder „~all“ abschließen. Wird die Domain nicht für E-Mail genutzt, genügt „v=spf1 -all“.',
  },
  {
    regel: 'SPF-02',
    pruefId: 'spf',
    stufe: 'warnung',
    titel: 'Mehrere SPF-Einträge',
    erklaerung: 'Die Domain hat mehr als einen TXT-Eintrag, der mit „v=spf1“ beginnt. Empfänger werten SPF dann als Fehler (permerror) und beachten keinen der Einträge.',
    massnahme: 'Die SPF-Einträge zu einem einzigen Eintrag zusammenführen.',
  },
  {
    regel: 'SPF-07',
    pruefId: 'spf',
    stufe: 'warnung',
    titel: 'SPF braucht zu viele Abfragen',
    erklaerung:
      'SPF erlaubt höchstens 10 Angaben, die weitere DNS-Abfragen auslösen (include, a, mx, ptr, exists, redirect), auch in eingebundenen Einträgen, und keine Schleifen. Darüber werten Empfänger den Eintrag als Fehler (permerror).',
    massnahme: 'Den SPF-Eintrag verschlanken: nicht mehr genutzte Dienste entfernen, a und mx durch feste Adressen (ip4, ip6) ersetzen und Schleifen auflösen.',
  },
  {
    regel: 'SPF-08',
    pruefId: 'spf',
    stufe: 'warnung',
    titel: 'Eingebundener SPF-Eintrag fehlt',
    erklaerung: 'Ein Ziel von include oder redirect hat keinen oder mehr als einen SPF-Eintrag. Empfänger werten den ganzen SPF-Eintrag dann als Fehler (permerror).',
    massnahme: 'Das Ziel prüfen: Tippfehler berichtigen oder einen nicht mehr genutzten Dienst aus dem SPF-Eintrag entfernen.',
  },
  {
    regel: 'SPF-10',
    pruefId: 'spf',
    stufe: 'warnung',
    titel: 'Ungültige Angabe im SPF-Eintrag',
    erklaerung: 'Der SPF-Eintrag enthält eine Angabe, die SPF nicht kennt, oft einen Tippfehler, oder ein redirect doppelt. Empfänger werten den ganzen Eintrag dann als Fehler (permerror).',
    massnahme: 'Den Eintrag berichtigen; erlaubt sind nur die Angaben aus RFC 7208 (all, include, a, mx, ptr, ip4, ip6, exists, redirect).',
  },
  {
    regel: 'SPF-03',
    pruefId: 'spf',
    stufe: 'kritisch',
    titel: 'SPF erlaubt jedem Server das Senden',
    erklaerung: 'Der Eintrag endet mit „+all“ oder „all“. Damit darf jeder Server der Welt E-Mails im Namen der Domain senden; SPF schützt dann gar nicht.',
    massnahme: 'Sofort „+all“ durch „-all“ ersetzen (übergangsweise „~all“), nachdem alle berechtigten Versender im Eintrag stehen.',
  },
  {
    regel: 'SPF-04',
    pruefId: 'spf',
    stufe: 'warnung',
    titel: 'SPF ohne klare Regel für fremde Server',
    erklaerung: 'Der Eintrag endet mit „?all“ oder hat kein „all“. Empfänger erfahren so nicht, dass E-Mails von nicht genannten Servern verdächtig sind.',
    massnahme: 'Den Eintrag mit „-all“ abschließen, sobald alle berechtigten Versender genannt sind; übergangsweise mit „~all“.',
  },
  {
    regel: 'SPF-05',
    pruefId: 'spf',
    stufe: 'ok',
    titel: 'SPF mit ~all',
    erklaerung: 'Nicht genannte Server gelten als verdächtig (softfail). Zusammen mit DMARC ist das üblich und ausreichend.',
    massnahme: null,
  },
  {
    regel: 'SPF-06',
    pruefId: 'spf',
    stufe: 'ok',
    titel: 'SPF mit -all',
    erklaerung: 'Nicht genannte Server sind ausdrücklich nicht berechtigt (fail).',
    massnahme: null,
  },
  {
    regel: 'SPF-09',
    pruefId: 'spf',
    stufe: 'hinweis',
    titel: 'SPF nutzt ptr',
    erklaerung: 'Die Angabe „ptr“ ist langsam und unzuverlässig; RFC 7208 rät davon ab, sie zu veröffentlichen. Manche Empfänger ignorieren sie.',
    massnahme: '„ptr“ durch die Adressen der Server (ip4, ip6) oder ein include des Anbieters ersetzen.',
  },
  {
    regel: 'SPF-11',
    pruefId: 'spf',
    stufe: 'hinweis',
    titel: 'SPF-Makro nicht ausgewertet',
    erklaerung: 'Der Eintrag nutzt Makros (%{…}). Sie werden erst beim Empfang einer E-Mail aufgelöst; diese Prüfung kann sie nicht nachvollziehen.',
    massnahme: 'Prüfen, ob das Makro nötig ist. Einträge ohne Makros sind leichter zu prüfen und zu pflegen.',
  },

  /* ---------- DMARC ---------- */
  {
    regel: 'DMARC-00',
    pruefId: 'dmarc',
    stufe: 'fehler',
    titel: 'DMARC nicht prüfbar',
    erklaerung: 'Die Abfrage des DMARC-Eintrags ist gescheitert. Über die Einstellungen der Domain sagt das nichts.',
    massnahme: null,
  },
  {
    regel: 'DMARC-08',
    pruefId: 'dmarc',
    stufe: 'warnung',
    titel: 'DMARC-Eintrag falsch geschrieben',
    erklaerung: 'Der Eintrag beginnt mit „v=dmarc1“ oder einer ähnlichen Schreibweise. Empfänger erkennen nur „v=DMARC1“ genau so geschrieben und ignorieren den Eintrag.',
    massnahme: 'Den Eintrag mit „v=DMARC1“ beginnen lassen (DMARC1 in Großbuchstaben).',
  },
  {
    regel: 'DMARC-01',
    pruefId: 'dmarc',
    stufe: 'warnung',
    titel: 'Kein DMARC-Eintrag',
    erklaerung:
      'Ohne DMARC legt die Domain nicht fest, was Empfänger mit E-Mails tun sollen, die SPF und DKIM nicht bestehen. Der Betrieb erfährt auch nicht, ob jemand seine Absenderadresse fälscht.',
    massnahme:
      'Einen DMARC-Eintrag unter _dmarc.‹Domain› anlegen, zunächst mit „p=none“ und einer Berichtsadresse (rua=mailto:…). Nach Auswertung der Berichte auf „quarantine“ oder „reject“ erhöhen.',
  },
  {
    regel: 'DMARC-02',
    pruefId: 'dmarc',
    stufe: 'warnung',
    titel: 'Mehrere DMARC-Einträge',
    erklaerung: 'Gibt es mehr als einen gültigen DMARC-Eintrag, wenden Empfänger keinen davon an.',
    massnahme: 'Die Einträge zu einem einzigen zusammenführen.',
  },
  {
    regel: 'DMARC-03',
    pruefId: 'dmarc',
    stufe: 'warnung',
    titel: 'DMARC ohne gültige Richtlinie',
    erklaerung: 'Die Angabe „p“ fehlt oder hat keinen der Werte none, quarantine oder reject. Empfänger behandeln gefälschte E-Mails dann nicht strenger.',
    massnahme: '„p=quarantine“ oder „p=reject“ setzen (übergangsweise „p=none“ mit Berichtsadresse).',
  },
  {
    regel: 'DMARC-05',
    pruefId: 'dmarc',
    stufe: 'warnung',
    titel: 'DMARC beobachtet nur, ohne Berichte',
    erklaerung: '„p=none“ bittet Empfänger nur um Beobachtung. Ohne Berichtsadresse (rua) erfährt aber niemand etwas davon; der Eintrag schützt so nicht.',
    massnahme: 'Eine Berichtsadresse eintragen (rua=mailto:…), die Berichte auswerten und die Richtlinie danach auf quarantine oder reject erhöhen.',
  },
  {
    regel: 'DMARC-04',
    pruefId: 'dmarc',
    stufe: 'hinweis',
    titel: 'DMARC beobachtet nur',
    erklaerung: 'Mit „p=none“ und Berichtsadresse melden Empfänger ihre Ergebnisse, stellen gefälschte E-Mails aber weiter zu. Als Übergang ist das sinnvoll.',
    massnahme: 'Die Berichte auswerten, alle berechtigten Versender einbinden und die Richtlinie dann auf quarantine oder reject erhöhen.',
  },
  {
    regel: 'DMARC-09',
    pruefId: 'dmarc',
    stufe: 'hinweis',
    titel: 'DMARC gilt nur für einen Teil der E-Mails',
    erklaerung: '„pct“ unter 100 wendet die Richtlinie nur auf einen Teil der E-Mails an; der Rest wird wie bei „p=none“ behandelt.',
    massnahme: '„pct“ auf 100 setzen oder entfernen, sobald die Berichte keine Probleme zeigen.',
  },
  {
    regel: 'DMARC-10',
    pruefId: 'dmarc',
    stufe: 'hinweis',
    titel: 'Subdomains ohne DMARC-Schutz',
    erklaerung: '„sp=none“ nimmt Subdomains von der strengeren Richtlinie aus. Angreifer können dann Absender wie rechnung.‹Domain› leichter fälschen.',
    massnahme: '„sp“ entfernen (dann gilt die Richtlinie auch für Subdomains) oder auf quarantine oder reject setzen.',
  },
  {
    regel: 'DMARC-12',
    pruefId: 'dmarc',
    stufe: 'hinweis',
    titel: 'Ungewöhnliche Berichtsadresse',
    erklaerung: 'Mindestens eine Adresse unter „rua“ beginnt nicht mit „mailto:“. Empfänger senden DMARC-Berichte in der Regel nur per E-Mail.',
    massnahme: 'Die Berichtsadresse als „mailto:…“ angeben.',
  },
  {
    regel: 'DMARC-11',
    pruefId: 'dmarc',
    stufe: 'info',
    titel: 'Keine DMARC-Berichte',
    erklaerung: 'Die Richtlinie schützt. Ohne Berichtsadresse (rua) erfährt der Betrieb aber nicht, ob und wie oft gefälschte E-Mails abgewiesen werden.',
    massnahme: null,
  },
  {
    regel: 'DMARC-06',
    pruefId: 'dmarc',
    stufe: 'ok',
    titel: 'DMARC mit quarantine',
    erklaerung: 'Empfänger sollen E-Mails, die SPF und DKIM nicht bestehen, als verdächtig behandeln, etwa in den Spam-Ordner legen.',
    massnahme: null,
  },
  {
    regel: 'DMARC-07',
    pruefId: 'dmarc',
    stufe: 'ok',
    titel: 'DMARC mit reject',
    erklaerung: 'Empfänger sollen E-Mails, die SPF und DKIM nicht bestehen, abweisen. Das ist der stärkste Schutz.',
    massnahme: null,
  },

  /* ---------- DKIM ---------- */
  {
    regel: 'DKIM-00',
    pruefId: 'dkim',
    stufe: 'fehler',
    titel: 'DKIM nicht prüfbar',
    erklaerung: 'Die Abfrage des DKIM-Schlüssels unter diesem Selektor ist gescheitert. Über die Einstellungen der Domain sagt das nichts.',
    massnahme: null,
  },
  {
    regel: 'DKIM-02',
    pruefId: 'dkim',
    stufe: 'warnung',
    titel: 'Kein DKIM-Schlüssel unter diesem Selektor',
    erklaerung: 'Unter dem angegebenen Selektor steht kein DKIM-Schlüssel. Entweder ist der Selektor falsch, oder Empfänger können die Signatur der E-Mails nicht prüfen.',
    massnahme: 'Den Selektor in einer aktuellen E-Mail nachsehen (Kopfzeile DKIM-Signature, Angabe s=) und den Schlüssel beim Mail-Anbieter aktivieren und veröffentlichen.',
  },
  {
    regel: 'DKIM-05',
    pruefId: 'dkim',
    stufe: 'warnung',
    titel: 'DKIM-Schlüssel zu kurz',
    erklaerung: 'Der RSA-Schlüssel hat weniger als 1024 Bit. Solche Schlüssel gelten als unsicher; viele Empfänger erkennen die Signatur nicht an.',
    massnahme: 'Einen neuen Schlüssel mit 2048 Bit erzeugen und veröffentlichen, danach den alten entfernen.',
  },
  {
    regel: 'DKIM-03',
    pruefId: 'dkim',
    stufe: 'hinweis',
    titel: 'DKIM-Schlüssel zurückgezogen',
    erklaerung: 'Der Eintrag hat ein leeres „p=“. Damit ist der Schlüssel widerrufen; Signaturen mit diesem Selektor gelten nicht.',
    massnahme: 'Prüfen, ob der Selektor noch genutzt wird. Wenn ja, einen gültigen Schlüssel veröffentlichen; wenn nein, ihn aus der Liste des Betriebs entfernen.',
  },
  {
    regel: 'DKIM-06',
    pruefId: 'dkim',
    stufe: 'hinweis',
    titel: 'DKIM-Schlüssel mit 1024 Bit',
    erklaerung: 'Schlüssel mit 1024 Bit sind noch zulässig, aber nicht mehr zeitgemäß.',
    massnahme: 'Beim nächsten Schlüsselwechsel einen Schlüssel mit 2048 Bit verwenden.',
  },
  {
    regel: 'DKIM-08',
    pruefId: 'dkim',
    stufe: 'hinweis',
    titel: 'DKIM-Schlüssel nicht lesbar',
    erklaerung: 'Der Schlüssel im Eintrag lässt sich nicht auswerten, etwa weil der Eintrag abgeschnitten ist oder ein unbekanntes Verfahren nennt.',
    massnahme: 'Den Eintrag mit den Angaben des Mail-Anbieters vergleichen und berichtigen.',
  },
  {
    regel: 'DKIM-01',
    pruefId: 'dkim',
    stufe: 'info',
    titel: 'DKIM ohne Selektor nicht prüfbar',
    erklaerung: 'DKIM-Schlüssel stehen unter einem Namen (Selektor), den man von außen nicht erraten kann. Ohne bekannten Selektor wird DKIM nicht geprüft; er lässt sich im Schritt Betrieb eintragen.',
    massnahme: null,
  },
  {
    regel: 'DKIM-04',
    pruefId: 'dkim',
    stufe: 'ok',
    titel: 'DKIM-Schlüssel Ed25519',
    erklaerung: 'Der Schlüssel nutzt das moderne Verfahren Ed25519.',
    massnahme: null,
  },
  {
    regel: 'DKIM-07',
    pruefId: 'dkim',
    stufe: 'ok',
    titel: 'DKIM-Schlüssel ab 2048 Bit',
    erklaerung: 'Der RSA-Schlüssel ist lang genug.',
    massnahme: null,
  },

  /* ---------- MTA-STS ---------- */
  {
    regel: 'STS-00',
    pruefId: 'mta_sts',
    stufe: 'fehler',
    titel: 'MTA-STS nicht prüfbar',
    erklaerung: 'Die Abfrage des MTA-STS-Eintrags ist gescheitert. Über die Einstellungen der Domain sagt das nichts.',
    massnahme: null,
  },
  {
    regel: 'STS-10',
    pruefId: 'mta_sts',
    stufe: 'kritisch',
    titel: 'MTA-STS sperrt eigene Mailserver aus',
    erklaerung:
      'Die Richtlinie steht auf „enforce“, nennt aber nicht alle Mailserver aus den MX-Einträgen. Absender, die MTA-STS beachten, stellen an diese Server keine E-Mails mehr zu.',
    massnahme: 'Sofort die Liste „mx“ der Richtlinie an die MX-Einträge anpassen oder den Modus vorübergehend auf „testing“ setzen.',
  },
  {
    regel: 'STS-02',
    pruefId: 'mta_sts',
    stufe: 'warnung',
    titel: 'MTA-STS-Eintrag ungültig',
    erklaerung:
      'Der TXT-Eintrag unter _mta-sts ist fehlerhaft oder mehrfach vorhanden. Erwartet wird genau einer, der mit „v=STSv1;“ beginnt und eine id aus 1 bis 32 Buchstaben oder Ziffern hat. Absender ignorieren MTA-STS sonst.',
    massnahme: 'Den Eintrag berichtigen, z. B. „v=STSv1; id=20261111“, und doppelte Einträge entfernen.',
  },
  {
    regel: 'STS-03',
    pruefId: 'mta_sts',
    stufe: 'warnung',
    titel: 'MTA-STS-Richtlinie nicht abrufbar',
    erklaerung: 'Die Richtlinie unter https://mta-sts.‹Domain›/.well-known/mta-sts.txt war nicht abrufbar: Verbindungs- oder Zertifikatsfehler, Weiterleitung oder ein anderer Status als 200.',
    massnahme: 'Die Datei ohne Weiterleitung und mit gültigem Zertifikat bereitstellen.',
  },
  {
    regel: 'STS-05',
    pruefId: 'mta_sts',
    stufe: 'warnung',
    titel: 'MTA-STS-Richtlinie ungültig',
    erklaerung: 'Die Richtlinie braucht version: STSv1, einen gültigen mode, max_age bis 31 557 600 Sekunden und außer bei „none“ mindestens einen Eintrag mx. Sonst ignorieren Absender sie.',
    massnahme: 'Die Datei mta-sts.txt nach RFC 8461 berichtigen.',
  },
  {
    regel: 'STS-08',
    pruefId: 'mta_sts',
    stufe: 'warnung',
    titel: 'MTA-STS (testing) passt nicht zu den Mailservern',
    erklaerung: 'Im Testbetrieb nennt die Richtlinie nicht alle Mailserver aus den MX-Einträgen. Beim Umstellen auf „enforce“ würden E-Mails an diese Server abgewiesen.',
    massnahme: 'Die Liste „mx“ der Richtlinie an die MX-Einträge anpassen, bevor der Modus auf „enforce“ wechselt.',
  },
  {
    regel: 'STS-04',
    pruefId: 'mta_sts',
    stufe: 'hinweis',
    titel: 'MTA-STS-Richtlinie mit falschem Dateityp',
    erklaerung: 'Der Server liefert die Richtlinie nicht als „text/plain“ aus. Manche Absender lehnen sie dann ab.',
    massnahme: 'Den Webserver so einstellen, dass mta-sts.txt als „text/plain“ ausgeliefert wird.',
  },
  {
    regel: 'STS-07',
    pruefId: 'mta_sts',
    stufe: 'hinweis',
    titel: 'MTA-STS nur im Testbetrieb',
    erklaerung: 'Die Richtlinie steht auf „testing“: Absender melden Probleme, erzwingen die Verschlüsselung aber noch nicht.',
    massnahme: 'Nach einigen Wochen ohne Fehlerberichte den Modus auf „enforce“ stellen.',
  },
  {
    regel: 'STS-01',
    pruefId: 'mta_sts',
    stufe: 'info',
    titel: 'Kein MTA-STS',
    erklaerung: 'MTA-STS sorgt dafür, dass andere Mailserver E-Mails nur verschlüsselt an die eigenen Server übertragen. Ohne MTA-STS ist die Verschlüsselung auf diesem Weg nicht erzwungen.',
    massnahme: null,
  },
  {
    regel: 'STS-06',
    pruefId: 'mta_sts',
    stufe: 'info',
    titel: 'MTA-STS ausgeschaltet',
    erklaerung: 'Die Richtlinie steht auf „none“ und hebt MTA-STS damit auf.',
    massnahme: null,
  },
  {
    regel: 'STS-11',
    pruefId: 'mta_sts',
    stufe: 'nicht_geprueft',
    titel: 'MTA-STS-Richtlinie nicht geprüft',
    erklaerung: 'Der Eintrag ist vorhanden. Die Richtlinie selbst liegt auf einer Website (mta-sts.‹Domain›); sie abzurufen ist im Browser nicht möglich, nur im Windows-Programm.',
    massnahme: null,
  },
  {
    regel: 'STS-09',
    pruefId: 'mta_sts',
    stufe: 'ok',
    titel: 'MTA-STS erzwingt Verschlüsselung',
    erklaerung: 'Die Richtlinie steht auf „enforce“ und nennt alle Mailserver aus den MX-Einträgen.',
    massnahme: null,
  },

  /* ---------- TLS-RPT ---------- */
  {
    regel: 'RPT-00',
    pruefId: 'tls_rpt',
    stufe: 'fehler',
    titel: 'TLS-RPT nicht prüfbar',
    erklaerung: 'Die Abfrage des TLS-RPT-Eintrags ist gescheitert. Über die Einstellungen der Domain sagt das nichts.',
    massnahme: null,
  },
  {
    regel: 'RPT-02',
    pruefId: 'tls_rpt',
    stufe: 'hinweis',
    titel: 'TLS-Berichte fehlen trotz MTA-STS',
    erklaerung: 'Zu MTA-STS gehört ein TLS-RPT-Eintrag: Absender melden dann Probleme bei der verschlüsselten Zustellung, etwa ein abgelaufenes Zertifikat.',
    massnahme: 'Einen TXT-Eintrag unter _smtp._tls.‹Domain› anlegen, z. B. „v=TLSRPTv1; rua=mailto:tls-berichte@‹Domain›“.',
  },
  {
    regel: 'RPT-03',
    pruefId: 'tls_rpt',
    stufe: 'hinweis',
    titel: 'TLS-RPT-Eintrag fehlerhaft',
    erklaerung: 'Es gibt mehrere TLS-RPT-Einträge, oder die Berichtsadresse (rua) fehlt oder beginnt weder mit „mailto:“ noch mit „https:“. Absender senden dann keine Berichte.',
    massnahme: 'Genau einen Eintrag „v=TLSRPTv1; rua=mailto:…“ veröffentlichen.',
  },
  {
    regel: 'RPT-01',
    pruefId: 'tls_rpt',
    stufe: 'info',
    titel: 'Keine TLS-Berichte',
    erklaerung: 'TLS-RPT ist optional. Damit melden Absender Probleme bei der verschlüsselten Zustellung von E-Mails.',
    massnahme: null,
  },
  {
    regel: 'RPT-04',
    pruefId: 'tls_rpt',
    stufe: 'ok',
    titel: 'TLS-Berichte eingerichtet',
    erklaerung: 'Absender melden Probleme bei der verschlüsselten Zustellung an die angegebene Adresse.',
    massnahme: null,
  },

  /* ---------- DNSSEC ---------- */
  {
    regel: 'DNSSEC-03',
    pruefId: 'dnssec',
    stufe: 'kritisch',
    titel: 'DNSSEC fehlerhaft: Domain teilweise nicht erreichbar',
    erklaerung:
      'Die Domain ist signiert, aber die Signatur passt nicht. Resolver, die DNSSEC prüfen, erhalten deshalb keine Antwort; für ihre Nutzer sind Website und E-Mail der Domain nicht erreichbar.',
    massnahme: 'Sofort den DNS-Anbieter einschalten: Schlüssel und DS-Eintrag beim Registrar abgleichen oder DNSSEC geordnet abschalten.',
  },
  {
    regel: 'DNSSEC-02',
    pruefId: 'dnssec',
    stufe: 'hinweis',
    titel: 'DNSSEC nicht eingerichtet',
    erklaerung: 'Die Einträge der Domain sind nicht signiert. Mit DNSSEC erkennen Resolver, ob DNS-Antworten unterwegs gefälscht wurden.',
    massnahme: 'DNSSEC beim DNS-Anbieter oder Registrar einschalten; viele Anbieter bieten das ohne Aufwand an.',
  },
  {
    regel: 'DNSSEC-04',
    pruefId: 'dnssec',
    stufe: 'fehler',
    titel: 'DNSSEC nicht prüfbar',
    erklaerung: 'Die Abfrage ist gescheitert, auch ohne DNSSEC-Prüfung. Das deutet auf ein Problem beim Nameserver oder auf dem Weg dorthin, nicht auf DNSSEC.',
    massnahme: null,
  },
  {
    regel: 'DNSSEC-01',
    pruefId: 'dnssec',
    stufe: 'ok',
    titel: 'DNSSEC aktiv',
    erklaerung: 'Die Antworten für die Domain sind signiert und gültig.',
    massnahme: null,
  },

  /* ---------- CAA ---------- */
  {
    regel: 'CAA-00',
    pruefId: 'caa',
    stufe: 'fehler',
    titel: 'CAA nicht prüfbar',
    erklaerung: 'Die Abfrage der CAA-Einträge ist gescheitert. Über die Einstellungen der Domain sagt das nichts.',
    massnahme: null,
  },
  {
    regel: 'CAA-04',
    pruefId: 'caa',
    stufe: 'warnung',
    titel: 'CAA mit unbekannter kritischer Angabe',
    erklaerung: 'Ein CAA-Eintrag hat eine unbekannte Angabe mit dem Kennzeichen „kritisch“ (Flag 128). Zertifizierungsstellen dürfen dann gar keine Zertifikate ausstellen.',
    massnahme: 'Den Eintrag berichtigen oder entfernen.',
  },
  {
    regel: 'CAA-01',
    pruefId: 'caa',
    stufe: 'hinweis',
    titel: 'Keine CAA-Einträge',
    erklaerung: 'CAA legt fest, welche Zertifizierungsstellen Zertifikate für die Domain ausstellen dürfen. Ohne Eintrag darf das jede.',
    massnahme: 'Einen CAA-Eintrag für die genutzte Zertifizierungsstelle anlegen, z. B. „0 issue "letsencrypt.org"“.',
  },
  {
    regel: 'CAA-03',
    pruefId: 'caa',
    stufe: 'hinweis',
    titel: 'CAA ohne erlaubte Zertifizierungsstelle',
    erklaerung: 'Es gibt CAA-Einträge, aber keinen „issue“ oder „issuewild“. Damit schränkt CAA die Ausstellung von Zertifikaten nicht ein.',
    massnahme: 'Einen issue-Eintrag für die genutzte Zertifizierungsstelle ergänzen.',
  },
  {
    regel: 'CAA-02',
    pruefId: 'caa',
    stufe: 'ok',
    titel: 'CAA beschränkt die Zertifizierungsstellen',
    erklaerung: 'Nur die genannten Zertifizierungsstellen dürfen Zertifikate für die Domain ausstellen.',
    massnahme: null,
  },

  /* ---------- Website im Browser ---------- */
  {
    regel: 'BROWSER-01',
    pruefId: null,
    stufe: 'nicht_geprueft',
    titel: 'Nur im Windows-Programm',
    erklaerung: 'Ein Browser darf fremde Websites aus Sicherheitsgründen nicht selbst abrufen und keine Zertifikate lesen. Diese Prüfung der Website macht nur das Windows-Programm.',
    massnahme: null,
  },
]

const NACH_REGEL = new Map(REGELTEXTE.map((r, i) => [r.regel, { text: r, position: i }]))

/** Gibt es zu dieser Regel einen Text? Gespeicherte Befunde prüft das beim Laden und Import (speicher/pruefen.ts). */
export function istRegel(regel: string): boolean {
  return NACH_REGEL.has(regel)
}

/** Text zu einer Regel; unbekannte Regeln sind ein Programmfehler (gespeicherte Befunde sind beim Laden geprüft). */
export function regeltext(regel: string): Regeltext {
  const r = NACH_REGEL.get(regel)
  if (!r) throw new Error(`Unbekannte Regel ${regel}`)
  return r.text
}

/** Position in der Tabelle (für „bei gleicher Stufe gewinnt die Regel, die zuerst steht“) */
export function regelPosition(regel: string): number {
  return NACH_REGEL.get(regel)?.position ?? Number.MAX_SAFE_INTEGER
}

/** Setzt die geprüfte Domain in Platzhalter wie ‹Domain› ein. */
export function mitDomain(text: string, domain: string): string {
  return text.replaceAll('‹Domain›', domain)
}
