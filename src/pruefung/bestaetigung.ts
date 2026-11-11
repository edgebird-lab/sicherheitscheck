/** Bestätigung der Zuständigkeit vor jedem Lauf (Spezifikation 6.7); ohne tldts, damit die Oberfläche sie sofort zeigen kann. */

/** Wortlaut der Bestätigung; er wird mit Name, Rolle und Zeit gespeichert und im Bericht gedruckt. */
export function bestaetigungsText(D: string): string {
  return `Ich bestätige, dass ich für die Domain ${D} verantwortlich bin oder vom Inhaber mit dieser Prüfung beauftragt wurde. Die Prüfung ruft nur öffentliche DNS-Einträge, die Startseite und zwei Standarddateien ab, so wie es ein Besucher oder ein Mailserver auch tut.`
}

export const FEHLT_BESTAETIGUNG = 'Bitte zuerst Rolle und Name angeben und die Zuständigkeit bestätigen.'
