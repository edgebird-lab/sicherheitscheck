import { describe, expect, it } from 'vitest'
import type { DnsAntwort } from '../modell/typen'
import { ausDohJson, dnsErgebnisText, istNetzFehler, normName, setzeTxtZusammen, wiederholbar } from './schnittstelle'

/** Formatmuster beider Anbieter aus testdaten/dns (synthetisch, siehe testdaten/README.md) */
const muster = import.meta.glob<{ default: unknown }>('/testdaten/dns/*.json', { eager: true })
function fixture(name: string): unknown {
  const m = muster[`/testdaten/dns/${name}.json`]
  if (!m) throw new Error(`Testdaten ${name} fehlen`)
  return m.default
}
function antwort(name: string): DnsAntwort {
  const a = ausDohJson(fixture(name))
  if (istNetzFehler(a)) throw new Error(a.text)
  return a
}

describe('TXT zusammensetzen (6.4)', () => {
  it('T-N01: Cloudflare liefert TXT in Anführungszeichen', () => {
    expect(antwort('cloudflare-txt').antworten[0].daten).toBe('v=spf1 -all')
  })

  it('T-N02: Google liefert TXT ohne Anführungszeichen', () => {
    expect(antwort('google-txt').antworten[0].daten).toBe('v=spf1 -all')
  })

  it('T-N03: mehrere Zeichenketten werden ohne Leerzeichen verbunden', () => {
    expect(setzeTxtZusammen('"v=spf1 include:a.example " "-all"')).toBe('v=spf1 include:a.example -all')
    expect(antwort('cloudflare-txt-mehrteilig').antworten[0].daten).toBe('v=spf1 include:a.example -all')
  })

  it('T-N04: \\" und \\DDD werden aufgelöst', () => {
    expect(setzeTxtZusammen('"a\\"b" "c\\059d"')).toBe('a"bc;d')
    expect(antwort('cloudflare-txt-mehrteilig').antworten[1].daten).toBe('a"bc;d')
  })

  it('mehrere \\DDD ergeben zusammen ein UTF-8-Zeichen; \\\\ wird zu \\', () => {
    expect(antwort('cloudflare-txt-mehrteilig').antworten[2].daten).toBe('Müller')
    expect(setzeTxtZusammen('"a\\\\b"')).toBe('a\\b')
  })

  it('Text ohne Anführungszeichen am Anfang bleibt unverändert', () => {
    expect(setzeTxtZusammen('v=DMARC1; p=none')).toBe('v=DMARC1; p=none')
    expect(setzeTxtZusammen('')).toBe('')
  })
})

describe('Antworten im JSON-Format (6.4)', () => {
  it('T-N05: Namen mit und ohne Punkt am Ende und in Großbuchstaben werden gleich behandelt', () => {
    expect(normName('example.com.')).toBe('example.com')
    expect(normName('Example.COM')).toBe('example.com')
    const google = antwort('google-mx')
    expect(google.antworten.map((a) => a.name)).toEqual(['firma.test', 'firma.test'])
    expect(antwort('cloudflare-mx').antworten.map((a) => a.name)).toEqual(['firma.test', 'firma.test'])
  })

  it('bildet Status, AD und Kommentar ab; Cloudflare-Kommentare sind eine Liste, Google ein Text', () => {
    expect(antwort('cloudflare-mx')).toMatchObject({ status: 0, ad: true, kommentar: '' })
    expect(antwort('cloudflare-servfail-dnssec')).toMatchObject({ status: 2, ad: false, antworten: [], kommentar: expect.stringContaining('EDE(9)') })
    expect(antwort('google-servfail-dnssec').kommentar).toContain('DNSSEC validation failure')
    expect(antwort('cloudflare-nxdomain')).toMatchObject({ status: 3, antworten: [] })
  })

  it('CAA kommt bei beiden Anbietern im selben Format', () => {
    expect(antwort('cloudflare-caa').antworten[0]).toMatchObject({ typ: 257, daten: '0 issue "letsencrypt.org"' })
    expect(antwort('google-caa').antworten[0].daten).toBe('0 issue "letsencrypt.org"')
  })

  it('eine abgeschnittene Antwort (TC) gilt als gescheitert', () => {
    expect(ausDohJson(fixture('cloudflare-abgeschnitten'))).toEqual({ fehler: 'antwort', text: 'Antwort abgeschnitten (TC)' })
  })

  it('fremde Formate werden abgewiesen, kaputte Einträge übersprungen', () => {
    expect(istNetzFehler(ausDohJson({ hallo: 1 }))).toBe(true)
    expect(istNetzFehler(ausDohJson(null))).toBe(true)
    const a = ausDohJson({ Status: 0, Answer: [{ name: 'x.test', type: 16 }, 'Unsinn', { name: 'x.test', type: 16, data: '"ok"' }] })
    expect(a).toEqual({ status: 0, ad: false, antworten: [{ name: 'x.test', typ: 16, ttl: 0, daten: 'ok' }], kommentar: '' })
  })

  it('Protokolltext nennt Status und Zahl der Antworten des angefragten Typs', () => {
    expect(dnsErgebnisText(antwort('cloudflare-mx'), 'MX')).toBe('NOERROR, 2 Antworten, signiert (AD)')
    expect(dnsErgebnisText(antwort('cloudflare-txt'), 'TXT')).toBe('NOERROR, 1 Antwort')
    expect(dnsErgebnisText(antwort('cloudflare-nodata'), 'TXT')).toBe('NOERROR, keine Antwort')
    expect(dnsErgebnisText(antwort('cloudflare-nxdomain'), 'TXT')).toBe('NXDOMAIN')
    expect(dnsErgebnisText({ status: 5, ad: false, antworten: [], kommentar: '' }, 'TXT')).toBe('REFUSED')
    expect(dnsErgebnisText({ fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' }, 'TXT')).toBe('Zeitüberschreitung')
  })

  it('Wiederholversuch nur bei Netzfehlern und HTTP 5xx', () => {
    expect(wiederholbar({ fehler: 'zeitueberschreitung', text: '' })).toBe(true)
    expect(wiederholbar({ fehler: 'verbindung', text: '' })).toBe(true)
    expect(wiederholbar({ fehler: 'antwort', text: 'HTTP 503', httpStatus: 503 })).toBe(true)
    expect(wiederholbar({ fehler: 'antwort', text: 'HTTP 400', httpStatus: 400 })).toBe(false)
    expect(wiederholbar({ fehler: 'antwort', text: 'Antwort ist kein JSON' })).toBe(false)
    expect(wiederholbar({ fehler: 'nicht_erlaubt', text: '' })).toBe(false)
  })
})
