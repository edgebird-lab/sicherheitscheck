# Katalog – alle eigenen Formulierungen

Katalogversion 2026.1. Erzeugt aus `src/katalog` (nicht von Hand ändern; nach Änderungen am Katalog `npx vitest run -u`).

Alle Texte sind eigene Formulierungen, kein Normtext. Robin prüft sie gegen die DIN SPEC 27076 (Phase 0.3): Deckt die Anforderung inhaltlich eine Anforderung der Norm ab, und ist kein Wortlaut der Norm übernommen? Ergebnis und Freigabe trägt er in [katalog-abgleich.md](katalog-abgleich.md) ein.

## Vorfragen

- **Arbeiten Beschäftigte im Homeoffice oder unterwegs mit Firmendaten?** (`mobiles_arbeiten`)  
  Gemeint ist jede Arbeit außerhalb der Betriebsräume mit Firmengeräten oder Zugriff auf Firmendaten, auch gelegentlich. Bei „Nein“ entfällt die Anforderung zu Regeln für mobiles Arbeiten.
- **Betreibt der Betrieb ein eigenes WLAN?** (`wlan`)  
  Auch das WLAN des Internet-Routers zählt, selbst wenn es nur Gäste nutzen. Bei „Nein“ entfällt die Anforderung zum WLAN.
- **Greift jemand von außen auf Rechner oder Daten im Betrieb zu, etwa per Fernwartung oder VPN?** (`fernzugriff`)  
  Dazu zählen Fernwartung durch einen IT-Dienstleister, Fernsteuerungsprogramme und VPN-Zugänge von Beschäftigten. Cloud-Dienste, die nur im Browser genutzt werden, zählen nicht. Bei „Nein“ entfällt die Anforderung zum Fernzugriff.
- **Werden Smartphones oder Tablets für die Arbeit genutzt, auch private?** (`mobilgeraete`)  
  Schon das Abrufen der Firmen-E-Mails auf dem privaten Handy zählt. Bei „Nein“ entfällt die Anforderung zu Smartphones und Tablets.

## Vorbereitungsliste fürs Vorgespräch

- Notfallplan oder Liste der Notfallkontakte (`notfallplan`)
- Datensicherungskonzept oder Beschreibung der Sicherung (`datensicherung`)
- Zugangs- und Berechtigungskonzept (`berechtigungen`)
- Übersicht der IT-Systeme und Online-Dienste (`it_uebersicht`)
- Verträge mit IT-Dienstleistern (`dienstleister`)

## 1 Organisation & Sensibilisierung

### A01 · vorläufige Nr. 1.1 · TOP

- **Titel:** Geschäftsführung verantwortet die Informationssicherheit
- **Kurzfrage:** Sieht sich die Geschäftsführung selbst in der Verantwortung für die Informationssicherheit und kümmert sie sich erkennbar darum?
- **Darum geht es:** Erfüllt, wenn die Geschäftsführung Sicherheit als eigene Aufgabe versteht: Sie trifft Entscheidungen dazu, stellt Zeit und Geld bereit und lässt sich regelmäßig über den Stand berichten. Die Umsetzung darf sie übertragen, die Verantwortung nicht.
- **Maßnahme bei Nichterfüllung:** Die Geschäftsführung übernimmt die Informationssicherheit ausdrücklich als Chefsache: Verantwortung schriftlich festhalten, ein Budget festlegen und sich mindestens zweimal im Jahr über offene Maßnahmen berichten lassen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ISMS.1

### A02 · vorläufige Nr. 1.2 · TOP

- **Titel:** Beschäftigte erkennen Phishing und Betrugsversuche
- **Kurzfrage:** Wurden alle, die mit der IT arbeiten, eingewiesen, und erkennen sie verdächtige E-Mails, Anrufe oder Links?
- **Darum geht es:** Erfüllt, wenn alle, die die IT nutzen, auch Aushilfen und Auszubildende, beim Einstieg und danach regelmäßig zu typischen Angriffen geschult werden und wissen, wem sie einen Verdacht melden. Belege sind etwa eine Teilnehmerliste oder eine Übung mit Test-Phishing.
- **Maßnahme bei Nichterfüllung:** Alle Beschäftigten zu Phishing, Betrugsanrufen und dem sicheren Umgang mit E-Mail einweisen, neue Beschäftigte gleich zu Beginn. Die Schulung mindestens jährlich wiederholen und eine feste Stelle für Verdachtsmeldungen benennen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ORP.3

### A03 · vorläufige Nr. 1.3

- **Titel:** Zuständigkeit für IT-Sicherheit ist geregelt
- **Kurzfrage:** Ist eine Person benannt, die sich um die IT-Sicherheit kümmert, und gibt es eine Vertretung?
- **Darum geht es:** Erfüllt, wenn feststeht, wer im Betrieb zuständig ist und welche Aufgaben ein externer Dienstleister übernimmt. Alle Beschäftigten kennen diese Ansprechperson.
- **Maßnahme bei Nichterfüllung:** Eine verantwortliche Person und eine Vertretung für IT-Sicherheit benennen, ihre Aufgaben kurz schriftlich festhalten und im Betrieb bekannt machen. Aufgaben eines IT-Dienstleisters im Vertrag festlegen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ISMS.1, ORP.1

### A04 · vorläufige Nr. 1.4

- **Titel:** Notfallplan für IT-Ausfälle und Angriffe
- **Kurzfrage:** Weiß der Betrieb, was bei einem IT-Ausfall oder Angriff zu tun ist und wer dann benachrichtigt wird?
- **Darum geht es:** Erfüllt, wenn ein kurzer schriftlicher Plan existiert: wichtige Telefonnummern (IT-Dienstleister, Bank, Versicherung, Polizei), erste Schritte bei einem Angriff und wie der Betrieb ohne IT weiterarbeitet. Der Plan liegt auch auf Papier vor.
- **Maßnahme bei Nichterfüllung:** Einen Notfallplan auf ein bis zwei Seiten erstellen: Ansprechpartner mit Telefonnummern, Sofortmaßnahmen bei Verdacht auf einen Angriff, Meldewege und Ersatzlösungen für die wichtigsten Abläufe. Ausgedruckt aufbewahren und einmal im Jahr durchspielen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** DER.2.1, DER.4

### A05 · vorläufige Nr. 1.5

- **Titel:** Regeln für Homeoffice und mobiles Arbeiten
- **Kurzfrage:** Gibt es verbindliche Regeln, wie außerhalb des Betriebs mit Geräten und Firmendaten umzugehen ist?
- **Darum geht es:** Erfüllt, wenn die Beschäftigten Regeln kennen und bestätigt haben, etwa: nur Firmengeräte oder geprüfte Zugänge, Bildschirmsperre, keine Firmendaten auf privaten Speichern, vertrauliche Gespräche nicht in der Öffentlichkeit.
- **Maßnahme bei Nichterfüllung:** Kurze Regeln für mobiles Arbeiten aufschreiben und von allen Betroffenen bestätigen lassen: zugelassene Geräte und Zugänge, Umgang mit Ausdrucken und Datenträgern, Verhalten bei Verlust eines Geräts.
- **Relevanz:** nur relevant, wenn die Vorfrage „Arbeiten Beschäftigte im Homeoffice oder unterwegs mit Firmendaten?“ mit Ja beantwortet ist
- **IT-Grundschutz (Vorschlag):** ORP.2

### A06 · vorläufige Nr. 1.6

- **Titel:** Überblick über IT, Daten und Dienstleister
- **Kurzfrage:** Gibt es eine aktuelle Übersicht der Geräte, Programme, Online-Dienste und der Dienstleister, die Zugang haben?
- **Darum geht es:** Erfüllt, wenn eine Liste existiert, die in den letzten zwölf Monaten geprüft wurde. Sie zeigt, welche Geräte und Dienste es gibt, wo wichtige Daten liegen und welche Dienstleister worauf zugreifen.
- **Maßnahme bei Nichterfüllung:** Eine einfache Übersicht anlegen und jährlich prüfen: Geräte, Programme, Online-Dienste mit Vertragspartner, Speicherorte wichtiger Daten und externe Zugänge. Sie ist die Grundlage für Updates, Datensicherung und Notfallplan.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ISMS.1, ORP.1

## 2 Identitäts- und Berechtigungsmanagement

### A07 · vorläufige Nr. 2.1

- **Titel:** Persönliche Benutzerkonten für alle
- **Kurzfrage:** Meldet sich jede Person mit einem eigenen Konto an, statt Konten und Passwörter zu teilen?
- **Darum geht es:** Erfüllt, wenn es für Rechner, E-Mail und wichtige Programme keine gemeinsam genutzten Konten gibt. Ausnahmen wie ein Kassen- oder Maschinenkonto sind bekannt und begründet.
- **Maßnahme bei Nichterfüllung:** Für jede Person eigene Konten einrichten und gemeinsam genutzte Zugänge abschaffen. Wo ein geteiltes Konto unvermeidbar ist, es auf das Nötigste beschränken und das Passwort bei jedem Personalwechsel ändern.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ORP.4

### A08 · vorläufige Nr. 2.2

- **Titel:** Sichere und verschiedene Passwörter
- **Kurzfrage:** Sind die Passwörter lang, für jeden Dienst verschieden, und werden sie sicher aufbewahrt?
- **Darum geht es:** Erfüllt, wenn Passwörter nicht mehrfach verwendet, nicht weitergegeben und nicht offen notiert werden, etwa auf einem Zettel am Bildschirm. Ein Passwortmanager ist ein gutes Zeichen.
- **Maßnahme bei Nichterfüllung:** Einen Passwortmanager einführen und Regeln festlegen: mindestens zwölf Zeichen oder eine lange Passphrase, kein Passwort doppelt, keine Weitergabe. Bekannt gewordene Passwörter sofort ändern.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ORP.4

### A09 · vorläufige Nr. 2.3

- **Titel:** Zweiter Faktor für Zugänge aus dem Internet
- **Kurzfrage:** Verlangen E-Mail, Cloud-Dienste und Fernzugänge bei der Anmeldung einen zweiten Faktor?
- **Darum geht es:** Erfüllt, wenn wichtige, aus dem Internet erreichbare Zugänge neben dem Passwort einen zweiten Nachweis verlangen, etwa über eine App, einen Hardware-Schlüssel oder einen Code. Besonders wichtig bei Administratorkonten und beim Online-Banking.
- **Maßnahme bei Nichterfüllung:** Für E-Mail, Cloud-Dienste, Fernzugänge und Administratorkonten die Anmeldung mit zweitem Faktor einschalten, mit den wichtigsten Zugängen beginnen und die Wiederherstellungscodes sicher verwahren.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ORP.4

### A10 · vorläufige Nr. 2.4

- **Titel:** Rechte nur so weit wie nötig, Administration getrennt
- **Kurzfrage:** Haben Beschäftigte nur die Rechte, die sie für ihre Arbeit brauchen, und wird im Alltag ohne Administratorrechte gearbeitet?
- **Darum geht es:** Erfüllt, wenn Zugriffe auf Ordner und Programme nach Aufgaben vergeben sind und nur wenige Personen Administratorrechte haben. Diese nutzen dafür ein eigenes Konto und arbeiten im Alltag (E-Mail, Internet) ohne diese Rechte.
- **Maßnahme bei Nichterfüllung:** Zugriffsrechte nach Aufgaben ordnen und überzählige Rechte entfernen. Administratorrechte auf wenige Personen beschränken und dafür getrennte Konten einrichten, die nicht für E-Mail und Internet genutzt werden.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** ORP.4

### A11 · vorläufige Nr. 2.5

- **Titel:** Zugänge werden beim Austritt entzogen
- **Kurzfrage:** Werden Konten, Schlüssel und Zugänge sofort gesperrt, wenn jemand den Betrieb verlässt oder die Aufgabe wechselt?
- **Darum geht es:** Erfüllt, wenn es dafür feste Schritte gibt (Konten, E-Mail, Cloud, Fernzugang, Geräte, Schlüssel) und die Rechte regelmäßig überprüft werden. Nicht relevant kann die Anforderung nur sein, wenn außer der Inhaberin oder dem Inhaber niemand die IT nutzt.
- **Maßnahme bei Nichterfüllung:** Eine Checkliste für Eintritte und Austritte erstellen und bei jedem Wechsel abarbeiten. Einmal im Jahr prüfen, ob noch Konten früherer Beschäftigter oder Dienstleister aktiv sind.
- **Relevanz:** „nicht relevant“ wählbar, mit Begründung
- **IT-Grundschutz (Vorschlag):** ORP.2, ORP.4

## 3 Datensicherung

### A12 · vorläufige Nr. 3.1 · TOP

- **Titel:** Regelmäßige Datensicherung
- **Kurzfrage:** Werden alle wichtigen Daten in festen Abständen gesichert, die zum Betrieb passen?
- **Darum geht es:** Erfüllt, wenn die Sicherung automatisch oder nach festem Plan läuft und der Abstand dazu passt, wie viel Datenverlust der Betrieb verkraften kann, meist mindestens täglich. Erfolg oder Fehler jeder Sicherung fallen jemandem auf.
- **Maßnahme bei Nichterfüllung:** Festlegen, wie viel Datenverlust höchstens tragbar ist, und danach eine automatische Sicherung einrichten, meist täglich. Fehlermeldungen der Sicherung an eine verantwortliche Person senden lassen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** CON.3

### A13 · vorläufige Nr. 3.2

- **Titel:** Alle wichtigen Daten sind in der Sicherung
- **Kurzfrage:** Ist festgelegt, welche Daten gesichert werden, und sind auch E-Mails, Cloud-Daten und Daten auf einzelnen Geräten erfasst?
- **Darum geht es:** Erfüllt, wenn klar ist, wo wichtige Daten liegen (Server, Rechner, Cloud, E-Mail, Branchensoftware), und jede dieser Quellen gesichert wird. Daten in Cloud-Diensten sind nicht von selbst gesichert.
- **Maßnahme bei Nichterfüllung:** Alle Speicherorte wichtiger Daten auflisten und für jeden die Sicherung festlegen. Für Cloud-Dienste und E-Mail eine eigene Sicherung einrichten oder im Vertrag prüfen, was der Anbieter sichert.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** CON.3

### A14 · vorläufige Nr. 3.3

- **Titel:** Eine Sicherung liegt getrennt und geschützt
- **Kurzfrage:** Gibt es eine Kopie der Sicherung, die vom Netz getrennt oder gegen Löschen geschützt ist?
- **Darum geht es:** Erfüllt, wenn mindestens eine Sicherung offline (etwa abwechselnd genutzte, abgezogene Festplatten) oder unveränderbar gespeichert ist und nicht im selben Raum wie die Originaldaten liegt. So übersteht sie Erpressungstrojaner, Brand und Diebstahl.
- **Maßnahme bei Nichterfüllung:** Zusätzlich zur laufenden Sicherung eine Kopie anlegen, die nach dem Sichern vom Netz getrennt oder unveränderbar gespeichert wird, und sie an einem anderen Ort aufbewahren, etwa nach der 3-2-1-Regel.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** CON.3

### A15 · vorläufige Nr. 3.4

- **Titel:** Wiederherstellung wird erprobt
- **Kurzfrage:** Wurde ausprobiert, ob sich Daten aus der Sicherung tatsächlich zurückholen lassen?
- **Darum geht es:** Erfüllt, wenn die Wiederherstellung regelmäßig, mindestens einmal im Jahr, getestet und das Ergebnis notiert wird. Bekannt ist auch, wie lange eine vollständige Wiederherstellung dauert.
- **Maßnahme bei Nichterfüllung:** Mindestens einmal im Jahr eine Wiederherstellung testen, für einzelne Dateien und für ein ganzes System. Dauer und Probleme notieren und den Notfallplan danach anpassen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** CON.3

## 4 Patch- und Änderungsmanagement

### A16 · vorläufige Nr. 4.1 · TOP

- **Titel:** Updates werden zeitnah eingespielt
- **Kurzfrage:** Werden Sicherheitsupdates für Betriebssysteme, Programme und Geräte zeitnah installiert?
- **Darum geht es:** Erfüllt, wenn automatische Updates eingeschaltet sind oder ein fester Ablauf dafür sorgt, dass Updates innerhalb weniger Tage installiert werden, auch für Router, Drucker, Server und Branchensoftware. Jemand prüft, ob das klappt.
- **Maßnahme bei Nichterfüllung:** Automatische Updates überall einschalten, wo es möglich ist. Für alles Übrige (Router, Server, Branchensoftware) eine verantwortliche Person und einen festen Termin festlegen; kritische Lücken sofort schließen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** OPS.1.1.3

### A17 · vorläufige Nr. 4.2

- **Titel:** Keine Systeme ohne Herstellerunterstützung
- **Kurzfrage:** Laufen alle Geräte und Programme in einer Version, für die es noch Sicherheitsupdates gibt?
- **Darum geht es:** Erfüllt, wenn kein Betriebssystem und keine Software im Einsatz ist, deren Unterstützung durch den Hersteller ausgelaufen ist, etwa ein altes Windows. Wo das ausnahmsweise nötig ist, ist das Gerät vom Netz getrennt oder besonders abgeschottet.
- **Maßnahme bei Nichterfüllung:** Veraltete Systeme und Programme ersetzen oder aktualisieren. Wo das nicht sofort geht, das Gerät vom Internet und vom übrigen Netz trennen und einen Termin für den Ersatz festlegen. Das Ende der Unterstützung in der IT-Übersicht vermerken.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** OPS.1.1.3

### A18 · vorläufige Nr. 4.3

- **Titel:** Software kommt nur aus geprüften Quellen
- **Kurzfrage:** Ist geregelt, wer Software installieren darf, und stammt sie nur aus vertrauenswürdigen Quellen?
- **Darum geht es:** Erfüllt, wenn Beschäftigte nicht beliebig Programme installieren können und neue Software vor dem Einsatz geprüft wird. Änderungen an wichtigen Systemen werden abgesprochen und notiert.
- **Maßnahme bei Nichterfüllung:** Installationen auf die Personen mit Administratorrechten beschränken und eine Liste zugelassener Programme führen. Software nur beim Hersteller oder in offiziellen Stores beziehen und größere Änderungen vorher absprechen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** OPS.1.1.3

## 5 Schutz vor Schadprogrammen

### A19 · vorläufige Nr. 5.1 · TOP

- **Titel:** Makros und aktive Inhalte sind abgeschaltet
- **Kurzfrage:** Sind Makros in Office-Dateien und andere aktive Inhalte standardmäßig abgeschaltet?
- **Darum geht es:** Erfüllt, wenn Office-Programme Makros in Dateien aus dem Internet und aus E-Mail-Anhängen blockieren und nur geprüfte oder signierte Makros erlaubt sind. Beschäftigte können diese Sperre nicht einfach aufheben.
- **Maßnahme bei Nichterfüllung:** Makros zentral oder an jedem Rechner standardmäßig sperren, besonders in Dateien aus dem Internet. Benötigte Makros nur aus vertrauenswürdigen Speicherorten oder mit Signatur zulassen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** APP.1.1, OPS.1.1.4

### A20 · vorläufige Nr. 5.2

- **Titel:** Virenschutz auf allen Rechnern und Servern
- **Kurzfrage:** Ist auf allen Rechnern und Servern ein aktueller Schutz vor Schadprogrammen eingeschaltet?
- **Darum geht es:** Erfüllt, wenn ein Virenschutz, etwa der in Windows enthaltene, überall läuft, sich selbst aktualisiert und Funde jemandem auffallen. Beschäftigte können ihn nicht abschalten.
- **Maßnahme bei Nichterfüllung:** Auf allen Rechnern und Servern einen Virenschutz einschalten und automatisch aktualisieren lassen. Regelmäßig prüfen, ob er überall läuft, und Warnungen an eine verantwortliche Person leiten.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** OPS.1.1.4

### A21 · vorläufige Nr. 5.3

- **Titel:** Eingehende E-Mails werden gefiltert
- **Kurzfrage:** Werden eingehende E-Mails auf Schadprogramme und Spam geprüft, bevor sie im Postfach landen?
- **Darum geht es:** Erfüllt, wenn der E-Mail-Dienst oder ein Filter gefährliche Anhänge wie ausführbare Dateien blockiert, Spam aussortiert und verdächtige Links markiert. Große Anbieter haben das meist eingebaut; es muss aber eingeschaltet sein.
- **Maßnahme bei Nichterfüllung:** Beim E-Mail-Anbieter Filter gegen Schadprogramme und Spam einschalten und gefährliche Dateitypen als Anhang sperren. Externe E-Mails nach Möglichkeit sichtbar kennzeichnen lassen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** OPS.1.1.4, APP.5.3

## 6 IT-Systeme und Netzwerke

### A22 · vorläufige Nr. 6.1

- **Titel:** Firewall schützt das Netz des Betriebs
- **Kurzfrage:** Trennt eine Firewall das Netz des Betriebs vom Internet, und sind keine unnötigen Dienste von außen erreichbar?
- **Darum geht es:** Erfüllt, wenn der Internetanschluss über einen Router oder eine Firewall läuft, die eingehende Verbindungen blockiert, und Freigaben (Portweiterleitungen) bekannt und begründet sind. Die Rechner haben ihre eigene Firewall eingeschaltet.
- **Maßnahme bei Nichterfüllung:** Die Freigaben im Router oder in der Firewall prüfen und alle nicht benötigten schließen. Die Firewall der Rechner eingeschaltet lassen und Änderungen an der Firewall nur der zuständigen Person erlauben.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** NET.3.2, NET.1.1

### A23 · vorläufige Nr. 6.2

- **Titel:** WLAN ist verschlüsselt, Gäste sind getrennt
- **Kurzfrage:** Ist das WLAN mit aktueller Verschlüsselung und starkem Kennwort geschützt, und nutzen Gäste ein eigenes Netz?
- **Darum geht es:** Erfüllt, wenn das WLAN mit WPA2 oder WPA3 und einem langen, selbst gewählten Kennwort geschützt ist und Gäste nur ins Internet, nicht ins Netz des Betriebs kommen.
- **Maßnahme bei Nichterfüllung:** Das WLAN auf WPA3 oder mindestens WPA2 umstellen, ein langes neues Kennwort setzen und ein getrenntes Gäste-WLAN einrichten. Das Kennwort ändern, wenn jemand mit Zugang den Betrieb verlässt.
- **Relevanz:** nur relevant, wenn die Vorfrage „Betreibt der Betrieb ein eigenes WLAN?“ mit Ja beantwortet ist
- **IT-Grundschutz (Vorschlag):** NET.2.1

### A24 · vorläufige Nr. 6.3

- **Titel:** Fernzugriff und Fernwartung sind abgesichert
- **Kurzfrage:** Läuft jeder Zugriff von außen über einen gesicherten Weg mit eigener Anmeldung, und ist Fernwartung nur nach Freigabe möglich?
- **Darum geht es:** Erfüllt, wenn Fernzugriffe über ein VPN oder einen ähnlich geschützten Dienst mit zweitem Faktor laufen und nicht über offene Portfreigaben. Fernwartung durch Dienstleister wird für jede Sitzung freigegeben und protokolliert.
- **Maßnahme bei Nichterfüllung:** Fernzugänge auf ein VPN oder einen geschützten Dienst mit zweitem Faktor umstellen und direkte Portfreigaben, etwa für Remotedesktop, schließen. Fernwartung nur nach Freigabe im Einzelfall erlauben und protokollieren.
- **Relevanz:** nur relevant, wenn die Vorfrage „Greift jemand von außen auf Rechner oder Daten im Betrieb zu, etwa per Fernwartung oder VPN?“ mit Ja beantwortet ist
- **IT-Grundschutz (Vorschlag):** OPS.1.2.5

### A25 · vorläufige Nr. 6.4

- **Titel:** Smartphones und Tablets sind geschützt
- **Kurzfrage:** Sind dienstlich genutzte Smartphones und Tablets mit Sperre und Updates geschützt und aus der Ferne löschbar?
- **Darum geht es:** Erfüllt, wenn alle Geräte mit Firmendaten eine Displaysperre haben, aktuelle Updates bekommen, verschlüsselt sind und bei Verlust gesperrt oder gelöscht werden können. Das gilt auch für private Geräte, auf denen Firmen-E-Mails ankommen.
- **Maßnahme bei Nichterfüllung:** Für alle Geräte mit Firmendaten Displaysperre, Updates und Verschlüsselung vorschreiben und eine Fernlöschung einrichten. Bei mehreren Geräten eine Geräteverwaltung (MDM) erwägen und den Verlust eines Geräts sofort melden lassen.
- **Relevanz:** nur relevant, wenn die Vorfrage „Werden Smartphones oder Tablets für die Arbeit genutzt, auch private?“ mit Ja beantwortet ist
- **IT-Grundschutz (Vorschlag):** SYS.3.2.1

### A26 · vorläufige Nr. 6.5

- **Titel:** Geräte ohne voreingestellte Zugangsdaten
- **Kurzfrage:** Sind bei Router, Druckern, Netzwerkspeichern und anderen Geräten die voreingestellten Passwörter geändert?
- **Darum geht es:** Erfüllt, wenn kein Netzwerkgerät mehr das Passwort aus Werkseinstellung oder Handbuch hat und die Verwaltungsoberflächen nicht aus dem Internet erreichbar sind.
- **Maßnahme bei Nichterfüllung:** Bei allen Netzwerkgeräten die voreingestellten Passwörter durch eigene ersetzen und im Passwortmanager ablegen. Den Zugriff auf Verwaltungsoberflächen aus dem Internet abschalten.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** NET.1.1

### A27 · vorläufige Nr. 6.6

- **Titel:** Rechner sind gegen fremden Zugriff gesperrt
- **Kurzfrage:** Sperren sich die Rechner bei Abwesenheit selbst, und sind die Festplatten von Laptops verschlüsselt?
- **Darum geht es:** Erfüllt, wenn alle Rechner nach wenigen Minuten ohne Eingabe den Bildschirm sperren, Laptops verschlüsselt sind (etwa mit BitLocker) und Server und Netzwerktechnik nicht frei zugänglich stehen.
- **Maßnahme bei Nichterfüllung:** Eine automatische Bildschirmsperre nach höchstens zehn Minuten einstellen, Laptops verschlüsseln und die Wiederherstellungsschlüssel sicher ablegen. Server und Netzwerktechnik in einem abschließbaren Raum oder Schrank unterbringen.
- **Relevanz:** immer relevant („nicht relevant“ ist nicht wählbar)
- **IT-Grundschutz (Vorschlag):** SYS.2.1
