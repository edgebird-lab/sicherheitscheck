/**
 * Prüft das echte Windows-Programm (Debug-Build) ohne Installation (Spezifikation 9.9):
 * D-01 Start im sicheren Kontext, Beispielbetrieb; D-02 verschlüsselt exportieren, alles
 * löschen, importieren, Daten gleich; D-03 Bericht als PDF in A4; D-04 Netzbefehle ohne
 * Freigabe werden abgelehnt (kein Netzverkehr); D-05 Außenprüfung von
 * example.com mit nachgebildeten DoH-Antworten (nichts verlässt den Rechner); dazu zweiter
 * Start mit einer Sicherung (Einzelinstanz, Rückfrage vor dem Import), Speichern beim
 * Schließen und keine Verstöße gegen die Content-Security-Policy. Dateidialoge beantwortet der Debug-Build
 * über Umgebungsvariablen; die Oberfläche steuert Playwright über die Debug-Schnittstelle der
 * WebView2 (eigener Port 9336, 9333 gehört dem Prozesslotsen).
 *
 * Das Programm nutzt dieselben Programmdaten wie ein installierter Sicherheitscheck. Deshalb
 * benennt der Test sie vorher um und stellt sie danach wieder her; läuft der Sicherheitscheck,
 * bricht er ab.
 *
 * Vorher: npx tauri build --debug --no-bundle
 * Aufruf:  npm run desktop:test
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const ZIEL = process.env.CARGO_TARGET_DIR ?? 'src-tauri/target'
const EXE = resolve(ZIEL, 'debug', 'sicherheitscheck.exe')
const KENNUNG = 'de.olbricht-digital.sicherheitscheck'
const PORT = 9336
const PASSWORT = 'Desktop-Test 2026!'
const ordner = mkdtempSync(join(tmpdir(), 'sicherheitscheck-desktop-'))
const datei = (name) => join(ordner, name)
const appDaten = [join(process.env.APPDATA, KENNUNG), join(process.env.LOCALAPPDATA, KENNUNG)]
const sicherung = (d) => `${d}.desktop-test-sicherung`

function pruefe(bedingung, text) {
  if (!bedingung) throw new Error(`Fehlgeschlagen: ${text}`)
  console.log(`  ✓ ${text}`)
}

const schlafe = (ms) => new Promise((r) => setTimeout(r, ms))

async function warte(bedingung, text, ms = 15000) {
  const ende = Date.now() + ms
  while (Date.now() < ende) {
    if (await bedingung()) return pruefe(true, text)
    await schlafe(200)
  }
  pruefe(false, text)
}

function laeuftSchon() {
  const liste = execFileSync('tasklist', ['/FI', 'IMAGENAME eq sicherheitscheck.exe', '/NH'], { encoding: 'utf8' })
  return liste.toLowerCase().includes('sicherheitscheck.exe')
}

/** Dateien der WebView2 sind kurz nach dem Beenden noch gesperrt: mehrmals versuchen */
async function mitGeduld(f) {
  for (let i = 0; ; i++) {
    try {
      return f()
    } catch (e) {
      if (i >= 20) throw e
      await schlafe(500)
    }
  }
}

/** Programmdaten beiseitelegen (Umbenennen, nichts wird gelöscht) */
function sichereProgrammdaten() {
  for (const d of appDaten) {
    if (existsSync(sicherung(d))) {
      throw new Error(`Von einem abgebrochenen Testlauf liegt noch ${sicherung(d)}. Bitte prüfen und von Hand zurückbenennen (das sind die echten Programmdaten).`)
    }
  }
  const gesichert = []
  for (const d of appDaten) {
    if (existsSync(d)) {
      renameSync(d, sicherung(d))
      gesichert.push(d)
    }
  }
  return gesichert
}

async function stelleProgrammdatenWiederHer(gesichert) {
  for (const d of appDaten) {
    if (existsSync(d)) await mitGeduld(() => rmSync(d, { recursive: true, force: true }))
    if (gesichert.includes(d)) await mitGeduld(() => renameSync(sicherung(d), d))
  }
}

function starte(args = []) {
  return spawn(EXE, args, {
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`,
      SICHERHEITSCHECK_TEST_SPEICHERN: datei('sicherung.sicherheitscheck'),
      SICHERHEITSCHECK_TEST_OEFFNEN: datei('sicherung.sicherheitscheck'),
      SICHERHEITSCHECK_TEST_PDF: datei('bericht.pdf'),
    },
    stdio: 'ignore',
  })
}

const cspVerstoesse = []

async function verbinde() {
  const ende = Date.now() + 45000
  while (Date.now() < ende) {
    try {
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`)
      const kontext = browser.contexts()[0]
      const seite = kontext.pages()[0] ?? (await kontext.waitForEvent('page', { timeout: 10000 }))
      // Beim ersten Start legt WebView2 erst ihr Profil an; die Seite kommt dann etwas später
      await seite.waitForURL(/tauri\.localhost/, { timeout: 20000 })
      await seite.waitForLoadState('domcontentloaded')
      seite.on('console', (m) => {
        if (/Content.Security.Policy/i.test(m.text())) cspVerstoesse.push(m.text())
      })
      seite.on('pageerror', (e) => cspVerstoesse.push(`Seitenfehler: ${e.message}`))
      return { browser, seite }
    } catch {
      await schlafe(500)
    }
  }
  throw new Error('Keine Verbindung zur WebView2')
}

/** Alle Betriebe aus der IndexedDB, nach id sortiert */
function leseBetriebe(seite) {
  return seite.evaluate(
    () =>
      new Promise((fertig, fehler) => {
        const anfrage = indexedDB.open('sicherheitscheck')
        anfrage.onerror = () => fehler(anfrage.error)
        anfrage.onsuccess = () => {
          const db = anfrage.result
          const alle = db.transaction('betriebe').objectStore('betriebe').getAll()
          alle.onsuccess = () => {
            db.close()
            fertig(JSON.stringify([...alle.result].sort((a, b) => a.id.localeCompare(b.id))))
          }
          alle.onerror = () => fehler(alle.error)
        }
      }),
  )
}

async function gespeichert(seite) {
  await schlafe(600)
  await seite.locator('.speicherstatus').filter({ hasText: /^gespeichert$/ }).waitFor({ timeout: 10000 })
}

async function beende(prozess) {
  if (prozess.exitCode !== null) return
  execFileSync('taskkill', ['/PID', String(prozess.pid)])
  await warte(() => prozess.exitCode !== null, 'Programm schließt sich nach dem Speichern', 20000)
}

if (!existsSync(EXE)) throw new Error(`${EXE} fehlt. Vorher: npx tauri build --debug --no-bundle`)
if (laeuftSchon()) throw new Error('Der Sicherheitscheck läuft gerade. Bitte erst schließen; der Test braucht dieselben Programmdaten.')

const gesichert = sichereProgrammdaten()
if (gesichert.length > 0) console.log(`Programmdaten beiseitegelegt: ${gesichert.map(sicherung).join(', ')}`)
let prozess = starte()
let browser
try {
  console.log(`Programm gestartet (PID ${prozess.pid}), Testordner ${ordner}`)
  let verbindung = await verbinde()
  browser = verbindung.browser
  let seite = verbindung.seite

  // D-01: sicherer Kontext, Startseite, Beispielbetrieb
  console.log('D-01 Start und Beispielbetrieb')
  pruefe(await seite.evaluate(() => window.isSecureContext), 'isSecureContext ist true')
  pruefe(await seite.evaluate(() => typeof crypto.randomUUID === 'function' && 'locks' in navigator && !!crypto.subtle), 'Web Crypto, randomUUID und Web Locks vorhanden')
  await seite.getByRole('heading', { name: 'Sicherheitscheck', level: 1 }).waitFor({ timeout: 15000 })
  pruefe(true, 'Startseite erscheint')
  await seite.getByRole('button', { name: 'Beispielbetrieb laden' }).click()
  await seite.getByRole('heading', { name: 'Betrieb', level: 1 }).waitFor({ timeout: 10000 })
  await warte(async () => (await seite.title()) === 'Tischlerei Beispiel GmbH (fiktiv) – Sicherheitscheck', 'Fenstertitel nennt den Betrieb')
  await seite.getByRole('button', { name: 'Sicherheitscheck', exact: true }).click()
  await seite.getByRole('row', { name: /Tischlerei Beispiel/ }).waitFor({ timeout: 10000 })
  pruefe((await seite.getByRole('row', { name: /Tischlerei Beispiel/ }).textContent()).includes('18 von 37 Punkten'), 'Beispielbetrieb in der Liste mit 18 von 37 Punkten')
  await gespeichert(seite)
  const vorher = await leseBetriebe(seite)

  // D-02: verschlüsselt exportieren, alles löschen, importieren
  console.log('D-02 Export, Löschen, Import')
  await seite.getByRole('button', { name: 'Sicherung exportieren' }).click()
  const exportDialog = seite.getByRole('dialog', { name: 'Sicherung exportieren' })
  await exportDialog.getByLabel('Passwort', { exact: true }).fill(PASSWORT)
  await exportDialog.getByLabel('Passwort wiederholen').fill(PASSWORT)
  await exportDialog.getByRole('button', { name: 'Exportieren' }).click()
  await warte(() => existsSync(datei('sicherung.sicherheitscheck')), 'Export schreibt die Datei an den gewählten Ort', 30000)
  const exportText = readFileSync(datei('sicherung.sicherheitscheck'), 'utf8')
  const exportKopf = JSON.parse(exportText)
  pruefe(exportKopf.format === 'sicherheitscheck' && exportKopf.verschluesselung?.kdf === 'Argon2id' && !exportText.includes('Tischlerei'), 'Datei ist verschlüsselt (Argon2id, kein Klartext)')
  await seite.getByRole('status').filter({ hasText: 'Gespeichert als „sicherung.sicherheitscheck“.' }).waitFor({ timeout: 10000 })
  pruefe(true, 'Meldung nennt den gewählten Dateinamen')

  await seite.getByRole('button', { name: 'Einstellungen' }).click()
  pruefe((await seite.getByText('Programmdaten dieses Benutzers').count()) === 1, 'Einstellungen nennen die Programmdaten als Speicherort')
  await seite.getByLabel('Zur Bestätigung „LÖSCHEN“ eingeben').fill('LÖSCHEN')
  await seite.getByRole('button', { name: 'Alle Daten löschen' }).click()
  await seite.getByRole('status').filter({ hasText: 'Alle Daten wurden gelöscht.' }).waitFor({ timeout: 10000 })
  await seite.getByRole('button', { name: 'Sicherheitscheck', exact: true }).click()
  await seite.getByRole('button', { name: 'Beispielbetrieb laden' }).waitFor({ timeout: 10000 })
  pruefe((await leseBetriebe(seite)) === '[]', 'nach „Alle Daten löschen“ ist die IndexedDB leer')

  await seite.getByRole('button', { name: 'Datei importieren' }).click()
  const pw = seite.getByRole('dialog', { name: 'Datei entschlüsseln' })
  await pw.getByLabel('Passwort der Datei').fill(PASSWORT)
  await pw.getByRole('button', { name: 'Entschlüsseln' }).click()
  await seite.getByRole('dialog', { name: 'Einstellungen übernehmen?' }).getByRole('button', { name: 'Übernehmen' }).click({ timeout: 30000 })
  await seite.getByRole('status').filter({ hasText: 'Import: 1 hinzugefügt.' }).waitFor({ timeout: 10000 })
  await gespeichert(seite)
  pruefe((await leseBetriebe(seite)) === vorher, 'nach dem Import sind die Daten gleich (IndexedDB vorher und nachher)')

  // Zweiter Start mit der Sicherung: landet im laufenden Programm, fragt vor dem Import
  console.log('Zweiter Start mit einer Sicherung')
  const zweiter = starte([datei('sicherung.sicherheitscheck')])
  await new Promise((r) => zweiter.on('exit', r))
  pruefe(true, 'zweiter Start beendet sich sofort')
  const rueckfrage = seite.getByRole('dialog', { name: 'Sicherung importieren?' })
  await rueckfrage.waitFor({ timeout: 15000 })
  pruefe((await rueckfrage.textContent()).includes('„sicherung.sicherheitscheck“'), 'das laufende Programm fragt vor dem Import nach')
  await rueckfrage.getByRole('button', { name: 'Abbrechen' }).click()
  pruefe((await leseBetriebe(seite)) === vorher, 'Abbrechen lässt die Daten unverändert')

  // D-03: Bericht als PDF
  console.log('D-03 Bericht als PDF')
  await seite.getByRole('button', { name: 'Tischlerei Beispiel GmbH (fiktiv)' }).click()
  await seite.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name: /Bericht/ }).click()
  await seite.getByRole('button', { name: 'Als PDF speichern' }).click()
  await warte(() => existsSync(datei('bericht.pdf')) && readFileSync(datei('bericht.pdf')).subarray(0, 5).toString() === '%PDF-', 'PDF wird ohne Druckdialog geschrieben', 60000)
  await seite.getByRole('status').filter({ hasText: 'Bericht gespeichert als „bericht.pdf“.' }).waitFor({ timeout: 10000 })
  const pdf = readFileSync(datei('bericht.pdf'), 'latin1')
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(pdf)
  pruefe(box && Math.abs(Number(box[1]) - 595.3) < 2 && Math.abs(Number(box[2]) - 841.9) < 2, `PDF-Seite ist A4 (${box?.[1]} × ${box?.[2]} pt)`)
  const seiten = pdf.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0
  pruefe(seiten >= 3, `PDF hat mindestens 3 Seiten (${seiten})`)
  pruefe(!existsSync(datei('bericht.pdf.speichern.tmp')), 'keine Hilfsdatei übrig')

  // D-04: Netzbefehle ohne Freigabe: abgelehnt, bevor ein Name aufgelöst oder verbunden wird
  console.log('D-04 Netzbefehle ohne Freigabe')
  const rust = (befehl, args) => seite.evaluate(([b, a]) => window.__TAURI_INTERNALS__.invoke(b, a).then((wert) => ({ ok: wert }), (fehler) => ({ fehler })), [befehl, args])
  const ohneFreigabe = await rust('http_abruf', { url: 'https://example.com/' })
  pruefe(ohneFreigabe.fehler?.fehler === 'nicht_erlaubt', `http_abruf an https://example.com/ ohne Freigabe: nicht_erlaubt (${ohneFreigabe.fehler?.text})`)
  pruefe((await rust('tls_info', { host: 'example.com' })).fehler?.fehler === 'nicht_erlaubt', 'tls_info ohne Freigabe: nicht_erlaubt')
  pruefe((await rust('freigabe_setzen', { domain: 'co.uk' })).fehler?.fehler === 'nicht_erlaubt', 'freigabe_setzen für co.uk: nicht_erlaubt')
  pruefe((await rust('doh_abfrage', { anbieter: 'cloudflare', name: 'example.com', typ: 'ANY', ohnePruefung: false })).fehler?.fehler === 'nicht_erlaubt', 'doh_abfrage mit Typ ANY: nicht_erlaubt')

  // D-05: Außenprüfung example.com; DoH-Antworten aus der fiktiven Zone, nichts verlässt den Rechner.
  // Belegt, dass die CSP des Programms DoH beim Anbieter zulässt. Die Zone hat keine A- und
  // AAAA-Einträge; deshalb ruft der Rust-Teil weder HTTP noch TLS ab (WEB-00).
  console.log('D-05 Außenprüfung mit nachgebildeten DoH-Antworten')
  const zone = JSON.parse(readFileSync('testdaten/dns/beispiel-zone.json', 'utf8'))
  const anfragen = []
  const fremd = []
  const kontext = seite.context()
  await kontext.route(
    (url) => !['tauri.localhost', 'ipc.localhost'].includes(url.hostname) && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob'),
    async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname !== 'cloudflare-dns.com') {
        fremd.push(url.href)
        return route.abort()
      }
      const schluessel = `${url.searchParams.get('type')} ${url.searchParams.get('name')}`
      anfragen.push(schluessel)
      const antwort = zone[schluessel] ?? { Status: 0, TC: false, AD: false, Question: [{ name: url.searchParams.get('name'), type: 0 }] }
      await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'content-type': 'application/dns-json' }, body: JSON.stringify(antwort) })
    },
  )
  await seite.getByRole('button', { name: 'Sicherheitscheck', exact: true }).click()
  await seite.getByRole('button', { name: 'Neuer Betrieb' }).click()
  await seite.getByLabel('Name des Betriebs').fill('Bäckerei Probe')
  await seite.getByRole('button', { name: 'Anlegen' }).click()
  await seite.getByLabel('Domain (optional)').fill('example.com')
  await seite.getByLabel('Domain (optional)').press('Tab')
  await seite.getByRole('button', { name: 'Neue Prüfung' }).click()
  await seite.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name: /^Außenprüfung/ }).click()
  await seite.getByRole('radio', { name: /^Beauftragt/ }).check()
  await seite.getByLabel('Name', { exact: true }).fill('Desktop-Test')
  await seite.getByRole('checkbox', { name: /Ich bestätige/ }).check()
  await seite.getByRole('button', { name: 'Prüfung starten' }).click()
  await seite.getByRole('heading', { name: /^Ergebnis vom/ }).waitFor({ timeout: 30000 })
  const email = await seite.getByRole('region', { name: 'E-Mail' }).getByRole('heading', { level: 3 }).allTextContents()
  pruefe(email[0] === 'Mailserver eingetragen' && email.includes('DMARC beobachtet nur, ohne Berichte'), `Befunde der Gruppe E-Mail aus der fiktiven Zone (${email.length})`)
  pruefe(anfragen.length >= 8 && anfragen[0] === 'MX example.com', `DoH-Abfragen gehen an den Anbieter, CSP lässt sie zu (${anfragen.length})`)
  pruefe(fremd.length === 0, `keine Anfrage an andere Ziele${fremd.length ? `: ${fremd.join(', ')}` : ''}`)
  pruefe(anfragen.includes('A www.example.com') && anfragen.includes('AAAA example.com'), 'Vorprüfung der Website über A und AAAA')
  const website = await seite.getByRole('region', { name: 'Website' }).getByRole('heading', { level: 3 }).allTextContents()
  pruefe(website.length === 1 && website[0] === 'Keine Website gefunden', `Website-Gruppe: ${website.join(', ')}`)
  await gespeichert(seite)
  const protokoll = JSON.parse(await leseBetriebe(seite)).find((b) => b.name === 'Bäckerei Probe').pruefungen[0].aussen.protokoll
  pruefe(protokoll.length > 0 && protokoll.every((a) => a.art === 'dns'), `Abrufprotokoll nur mit DNS-Abfragen (${protokoll.length}), kein HTTP- oder TLS-Abruf`)
  await kontext.unrouteAll({ behavior: 'ignoreErrors' })

  // Speichern beim Schließen: Änderung, sofort schließen, neu starten
  console.log('Speichern beim Schließen')
  await seite.getByRole('button', { name: 'Sicherheitscheck', exact: true }).click()
  await seite.getByRole('button', { name: 'Tischlerei Beispiel GmbH (fiktiv)' }).click()
  await seite.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name: /Betrieb/ }).click()
  await seite.getByLabel('Branche').fill('Tischlerei, geändert vor dem Schließen')
  await beende(prozess)
  await browser.close().catch(() => {})
  prozess = starte()
  verbindung = await verbinde()
  browser = verbindung.browser
  seite = verbindung.seite
  await seite.getByRole('button', { name: 'Tischlerei Beispiel GmbH (fiktiv)' }).click({ timeout: 15000 })
  pruefe((await seite.getByLabel('Branche').inputValue()) === 'Tischlerei, geändert vor dem Schließen', 'die letzte Änderung vor dem Schließen ist gespeichert')

  pruefe(cspVerstoesse.length === 0, `keine Verstöße gegen die CSP und keine Seitenfehler${cspVerstoesse.length ? `: ${cspVerstoesse.join(' | ')}` : ''}`)
  await beende(prozess)
  console.log('Desktop-Test bestanden.')
} finally {
  await browser?.close().catch(() => {})
  if (prozess.exitCode === null) prozess.kill()
  await schlafe(1500)
  if (process.env.DESKTOP_TEST_BEHALTEN) console.log(`Testdateien bleiben in ${ordner}`)
  else rmSync(ordner, { recursive: true, force: true })
  await stelleProgrammdatenWiederHer(gesichert)
  if (gesichert.length > 0) console.log('Programmdaten wiederhergestellt.')
}
