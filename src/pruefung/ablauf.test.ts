import { describe, expect, it } from 'vitest'
import type { DnsAntwort } from '../modell/typen'
import { ausDohJson } from '../netz/schnittstelle'
import { http, nxdomain, testnetz, txt, mx, type TestnetzDaten } from '../netz/testnetz'
import { JETZT } from '../testhilfen/pruefung'
import { aussenpruefung, type Laufauftrag, type LaufOptionen } from './ablauf'
import { bestaetigungsText, FEHLT_BESTAETIGUNG } from './bestaetigung'
import type { Grenzen } from './lauf'
import { WEBSITE_PRUEF_IDS } from './stufen'

const AUFTRAG: Laufauftrag = {
  domain: 'example.com',
  dkimSelektoren: [],
  dohAnbieter: 'cloudflare',
  bestaetigung: { name: 'Robin Olbricht', rolle: 'beauftragt', zugestimmt: true },
}

/** Fiktive Zone des Beispielbetriebs (auch im Browsertest E-07) */
const zone = import.meta.glob<{ default: Record<string, unknown> }>('/testdaten/dns/beispiel-zone.json', { eager: true })['/testdaten/dns/beispiel-zone.json'].default
const BEISPIEL_DNS: Record<string, DnsAntwort> = Object.fromEntries(Object.entries(zone).map(([k, v]) => [k, ausDohJson(v) as DnsAntwort]))

function optionen(teil: LaufOptionen & { grenzen?: Partial<Grenzen> } = {}): LaufOptionen {
  let ms = 0
  return { jetzt: () => JETZT, uhr: () => (ms += 7), warte: async () => {}, ...teil }
}

async function laufe(daten: TestnetzDaten, auftrag: Partial<Laufauftrag> = {}, teil: LaufOptionen = {}) {
  const netz = testnetz(daten)
  const r = await aussenpruefung({ ...AUFTRAG, ...auftrag }, netz, optionen(teil))
  return { r, netz }
}

function aussen(r: Awaited<ReturnType<typeof aussenpruefung>>) {
  if (!r.ok) throw new Error(r.fehler)
  return r.aussen
}

const regeln = (a: ReturnType<typeof aussen>) => a.befunde.filter((b) => b.regel !== 'BROWSER-01').map((b) => `${b.pruefId} ${b.regel} ${b.stufe}`)

describe('Ablauf der Außenprüfung (6.7)', () => {
  it('T-A01: ohne Bestätigung kein Lauf, das Testnetz zählt 0 Abrufe', async () => {
    for (const bestaetigung of [
      { name: 'Robin', rolle: 'beauftragt' as const, zugestimmt: false },
      { name: 'Robin', rolle: null, zugestimmt: true },
      { name: '  ', rolle: 'verantwortlich' as const, zugestimmt: true },
    ]) {
      const { r, netz } = await laufe({}, { bestaetigung })
      expect(r).toEqual({ ok: false, fehler: FEHLT_BESTAETIGUNG })
      expect(netz.aufrufe).toEqual([])
    }
  })

  it('ungültige Domain oder Selektoren: Fehler nach 6.3, kein Abruf', async () => {
    const ip = await laufe({}, { domain: '192.168.2.105' })
    expect(ip.r).toEqual({ ok: false, fehler: 'IP-Adressen werden nicht geprüft.' })
    expect(ip.netz.aufrufe).toEqual([])
    const sel = await laufe({}, { dkimSelektoren: ['gut', 'schlecht!'] })
    expect(sel.r.ok).toBe(false)
    expect(sel.netz.aufrufe).toEqual([])
  })

  it('Beispielzone im Browser: erwartete Befunde, Reihenfolge der Abfragen, Bestätigung mit Wortlaut', async () => {
    const { r, netz } = await laufe({ dns: BEISPIEL_DNS }, { domain: 'https://www.Example.com/kontakt' })
    const a = aussen(r)
    expect(regeln(a)).toEqual([
      'mx MX-03 info',
      'spf SPF-04 warnung',
      'dmarc DMARC-05 warnung',
      'dkim DKIM-01 info',
      'mta_sts STS-01 info',
      'tls_rpt RPT-01 info',
      'dnssec DNSSEC-02 hinweis',
      'caa CAA-01 hinweis',
    ])
    expect(netz.aufrufe).toEqual([
      'DNS MX example.com',
      'DNS TXT example.com',
      'DNS TXT _dmarc.example.com',
      'DNS TXT _mta-sts.example.com',
      'DNS TXT _smtp._tls.example.com',
      'DNS SOA example.com',
      'DNS CAA example.com',
      'DNS CAA com',
    ])
    expect(a).toMatchObject({
      domain: 'example.com',
      modus: 'browser',
      dohAnbieter: 'cloudflare',
      abgebrochen: false,
      gestartet: '2026-11-11T12:00:00.000Z',
      beendet: '2026-11-11T12:00:00.000Z',
      bestaetigung: { name: 'Robin Olbricht', rolle: 'beauftragt', text: bestaetigungsText('example.com'), zeit: '2026-11-11T12:00:00.000Z' },
    })
    expect(a.bestaetigung.text).toContain('für die Domain example.com verantwortlich')
    expect(a.protokoll.map((p) => `${p.anfrage} → ${p.ergebnis}`)).toEqual([
      'MX example.com → NOERROR, 1 Antwort',
      'TXT example.com → NOERROR, 2 Antworten',
      'TXT _dmarc.example.com → NOERROR, 1 Antwort',
      'TXT _mta-sts.example.com → NXDOMAIN',
      'TXT _smtp._tls.example.com → NXDOMAIN',
      'SOA example.com → NOERROR, 1 Antwort',
      'CAA example.com → NOERROR, keine Antwort',
      'CAA com → NOERROR, keine Antwort',
    ])
  })

  it('T-A05: Browser-Modus: alle Website-Prüfungen BROWSER-01 nicht_geprueft, kein HTTP- oder TLS-Aufruf', async () => {
    const { r, netz } = await laufe({ dns: BEISPIEL_DNS })
    const web = aussen(r).befunde.filter((b) => WEBSITE_PRUEF_IDS.includes(b.pruefId))
    expect(web.map((b) => b.pruefId)).toEqual(WEBSITE_PRUEF_IDS)
    expect(web.every((b) => b.regel === 'BROWSER-01' && b.stufe === 'nicht_geprueft' && b.ziel === 'example.com')).toBe(true)
    expect(netz.zaehle('HTTP') + netz.zaehle('TLS')).toBe(0)
  })

  it('T-N06: MX mit Status 3: Lauf bricht ab, genau ein Befund MX-01', async () => {
    const { r, netz } = await laufe({ dns: { 'MX example.com': nxdomain() } })
    const a = aussen(r)
    expect(a.befunde.map((b) => `${b.regel} ${b.stufe}`)).toEqual(['MX-01 fehler'])
    expect(a.abgebrochen).toBe(false)
    expect(netz.aufrufe).toEqual(['DNS MX example.com'])
  })

  it('T-A02 (DNS-Teil): Windows-Programm: erst alle DNS-Abfragen, dann der HTTP-Abruf der MTA-STS-Richtlinie; jeder Abruf genau einmal im Protokoll', async () => {
    const url = 'https://mta-sts.example.com/.well-known/mta-sts.txt'
    const { r, netz } = await laufe({
      modus: 'desktop',
      dns: {
        ...BEISPIEL_DNS,
        'TXT _mta-sts.example.com': txt('_mta-sts.example.com', 'v=STSv1; id=1;'),
        'MX example.com': mx('example.com', '10 mail.example.com.'),
      },
      http: { [url]: http(url, 200, [['content-type', 'text/plain']], 'version: STSv1\nmode: enforce\nmx: mail.example.com\nmax_age: 86400\n') },
    })
    const a = aussen(r)
    expect(a.modus).toBe('desktop')
    expect(a.protokoll.map((p) => p.art)).toEqual([...Array(8).fill('dns'), 'http'])
    expect(a.protokoll.map((p) => p.anfrage)).toEqual(netz.aufrufe.map((x) => x.replace(/^DNS (\S+) (\S+)$/, '$1 $2').replace(/^HTTP /, 'GET ')))
    expect(new Set(a.protokoll.map((p) => p.anfrage)).size).toBe(a.protokoll.length)
    expect(a.protokoll.every((p) => p.dauerMs >= 0)).toBe(true)
    expect(a.befunde.find((b) => b.pruefId === 'mta_sts')).toMatchObject({ regel: 'STS-09', stufe: 'ok' })
    expect(a.befunde.find((b) => b.pruefId === 'tls_rpt')?.regel).toBe('RPT-02')
  })

  it('T-A03: Grenze 10 DNS-Abfragen: genau 10, übrige Prüfungen fehler „Grenze erreicht“, Lauf endet normal', async () => {
    const includes = Array.from({ length: 6 }, (_, i) => `include:s${i}.example.net`).join(' ')
    const dns: TestnetzDaten['dns'] = { ...BEISPIEL_DNS, 'TXT example.com': txt('example.com', `v=spf1 ${includes} -all`) }
    for (let i = 0; i < 6; i++) dns[`TXT s${i}.example.net`] = txt(`s${i}.example.net`, 'v=spf1 -all')
    const { r, netz } = await laufe({ dns }, { dkimSelektoren: ['s1'] }, { grenzen: { dns: 10 } })
    const a = aussen(r)
    expect(netz.zaehle('DNS')).toBe(10)
    expect(a.protokoll).toHaveLength(10)
    expect(a.abgebrochen).toBe(false)
    expect(regeln(a)).toEqual([
      'mx MX-03 info',
      'spf SPF-06 ok',
      'dmarc DMARC-05 warnung',
      'dkim DKIM-02 warnung',
      'mta_sts STS-00 fehler',
      'tls_rpt RPT-00 fehler',
      'dnssec DNSSEC-04 fehler',
      'caa CAA-00 fehler',
    ])
    for (const pruefId of ['mta_sts', 'tls_rpt', 'dnssec', 'caa']) expect(a.befunde.find((b) => b.pruefId === pruefId)?.messwert).toBe('Grenze erreicht')
  })

  it('T-A04: Abbruch nach 3 Abrufen: abgebrochen = true, offene Prüfungen fehler „abgebrochen“', async () => {
    const abbruch = new AbortController()
    const fortschritt: string[][] = []
    const { r, netz } = await laufe(
      { dns: BEISPIEL_DNS, beiAufruf: (nr) => nr === 3 && abbruch.abort() },
      { dkimSelektoren: ['s1'] },
      { signal: abbruch.signal, fortschritt: (f) => fortschritt.push(f) },
    )
    const a = aussen(r)
    expect(a.abgebrochen).toBe(true)
    expect(netz.zaehle('DNS')).toBe(3)
    expect(a.protokoll.map((p) => p.ergebnis)).toEqual(['NOERROR, 1 Antwort', 'NOERROR, 2 Antworten', 'abgebrochen'])
    const offen = a.befunde.filter((b) => ['dmarc', 'dkim', 'mta_sts', 'tls_rpt', 'dnssec', 'caa'].includes(b.pruefId))
    expect(offen.map((b) => `${b.regel} ${b.messwert}`)).toEqual([
      'DMARC-00 abgebrochen',
      'DKIM-00 abgebrochen',
      'STS-00 abgebrochen',
      'RPT-00 abgebrochen',
      'DNSSEC-04 abgebrochen',
      'CAA-00 abgebrochen',
    ])
    expect(fortschritt.at(-1)).toHaveLength(21)
  })

  it('meldet den Fortschritt je Prüfung', async () => {
    const fortschritt: string[][] = []
    await laufe({ dns: BEISPIEL_DNS }, {}, { fortschritt: (f) => fortschritt.push(f) })
    expect(fortschritt[0]).toEqual(['mx'])
    expect(fortschritt.at(-1)?.slice(0, 8)).toEqual(['mx', 'spf', 'dmarc', 'dkim', 'mta_sts', 'tls_rpt', 'dnssec', 'caa'])
  })
})
