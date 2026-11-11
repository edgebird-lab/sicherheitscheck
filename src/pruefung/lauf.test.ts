import { describe, expect, it } from 'vitest'
import { browserNetz } from '../netz/browser'
import { http, leer, servfail, testnetz, txt } from '../netz/testnetz'
import { Lauf, LaufEnde, laufUmgebung, type Grenzen, type LaufUmgebung } from './lauf'

/** Umgebung ohne echte Wartezeit; die Uhr steht still, außer ein Test stellt sie. */
function umgebung(teil: Partial<Omit<LaufUmgebung, 'grenzen'>> & { grenzen?: Partial<Grenzen> } = {}) {
  const gewartet: number[] = []
  const u = laufUmgebung({
    jetzt: () => new Date('2026-11-11T12:00:00.000Z'),
    uhr: () => 0,
    warte: async (ms) => {
      gewartet.push(ms)
    },
    ...teil,
  })
  return { u, gewartet }
}

describe('Zwischenspeicher je Lauf (6.4)', () => {
  it('T-N09: dieselbe Abfrage zweimal im Lauf ergibt einen Abruf im Protokoll', async () => {
    const netz = testnetz({ dns: { 'TXT firma.test': txt('firma.test', 'v=spf1 -all') } })
    const lauf = new Lauf(netz, umgebung().u)
    const a = await lauf.dns('firma.test', 'TXT')
    const b = await lauf.dns('firma.test', 'TXT')
    expect(b).toEqual(a)
    expect(netz.zaehle('DNS')).toBe(1)
    expect(lauf.protokoll).toEqual([{ zeit: '2026-11-11T12:00:00.000Z', art: 'dns', anfrage: 'TXT firma.test', ergebnis: 'NOERROR, 1 Antwort', dauerMs: 0 }])
  })

  it('T-N05: „example.com.“ und „Example.com“ sind dieselbe Abfrage', async () => {
    const netz = testnetz()
    const lauf = new Lauf(netz, umgebung().u)
    await lauf.dns('example.com.', 'MX')
    await lauf.dns('Example.com', 'MX')
    expect(netz.aufrufe).toEqual(['DNS MX example.com'])
  })

  it('gleichzeitige gleiche Abfragen teilen sich einen Abruf; cd=1 ist eine eigene Abfrage', async () => {
    const netz = testnetz()
    const lauf = new Lauf(netz, umgebung().u)
    await Promise.all([lauf.dns('firma.test', 'SOA'), lauf.dns('firma.test', 'SOA'), lauf.dns('firma.test', 'SOA', true)])
    expect(netz.aufrufe).toEqual(['DNS SOA firma.test', 'DNS SOA firma.test cd'])
    expect(lauf.protokoll.map((a) => a.anfrage)).toEqual(['SOA firma.test', 'SOA firma.test (ohne DNSSEC-Prüfung)'])
  })
})

describe('Wiederholversuch (6.4)', () => {
  it('T-N07: HTTP 500 vom DoH-Anbieter: ein Wiederholversuch nach 500 ms, dann NetzFehler antwort; 2 Einträge im Protokoll', async () => {
    let aufrufe = 0
    const f = (async () => {
      aufrufe++
      return new Response('Fehler', { status: 500 })
    }) as typeof fetch
    const { u, gewartet } = umgebung()
    const lauf = new Lauf(browserNetz({ anbieter: 'cloudflare', fetch: f }), u)
    const r = await lauf.dns('firma.test', 'TXT')
    expect(r).toEqual({ fehler: 'antwort', text: 'HTTP 500', httpStatus: 500 })
    expect(aufrufe).toBe(2)
    expect(gewartet).toEqual([500])
    expect(lauf.protokoll.map((a) => `${a.anfrage} → ${a.ergebnis}`)).toEqual(['TXT firma.test → HTTP 500', 'TXT firma.test, Wiederholung → HTTP 500'])
    expect(lauf.anzahl('dns')).toBe(2)
  })

  it('nach einer Zeitüberschreitung hilft der zweite Versuch', async () => {
    const netz = testnetz({ dns: { 'MX firma.test': [{ fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' }, leer()] } })
    const lauf = new Lauf(netz, umgebung().u)
    expect(await lauf.dns('firma.test', 'MX')).toEqual(leer())
    expect(lauf.protokoll.map((a) => a.ergebnis)).toEqual(['Zeitüberschreitung', 'NOERROR, keine Antwort'])
  })

  it('SERVFAIL ist eine Antwort und wird nicht wiederholt', async () => {
    const netz = testnetz({ dns: { 'TXT _dmarc.firma.test': servfail() } })
    const lauf = new Lauf(netz, umgebung().u)
    expect(await lauf.dns('_dmarc.firma.test', 'TXT')).toMatchObject({ status: 2 })
    expect(netz.zaehle('DNS')).toBe(1)
  })

  it('ist die Grenze erreicht, entfällt der Wiederholversuch und der erste Fehler bleibt', async () => {
    const netz = testnetz({ dns: { 'MX firma.test': { fehler: 'verbindung', text: 'Keine Verbindung' } } })
    const lauf = new Lauf(netz, umgebung({ grenzen: { dns: 1 } }).u)
    expect(await lauf.dns('firma.test', 'MX')).toEqual({ fehler: 'verbindung', text: 'Keine Verbindung' })
    expect(netz.zaehle('DNS')).toBe(1)
  })
})

describe('Grenzen und Abbruch (6.7)', () => {
  it('die Grenze der DNS-Abfragen beendet weitere Abfragen mit LaufEnde „Grenze erreicht“', async () => {
    const netz = testnetz()
    const lauf = new Lauf(netz, umgebung({ grenzen: { dns: 2 } }).u)
    await lauf.dns('a.test', 'TXT')
    await lauf.dns('b.test', 'TXT')
    await expect(lauf.dns('c.test', 'TXT')).rejects.toEqual(new LaufEnde('grenze'))
    // aus dem Zwischenspeicher geht es weiter
    await expect(lauf.dns('a.test', 'TXT')).resolves.toEqual(leer())
    expect(netz.zaehle('DNS')).toBe(2)
    expect(lauf.protokoll).toHaveLength(2)
  })

  it('die Zeitgrenze je Lauf gilt für jede neue Abfrage', async () => {
    let ms = 0
    const netz = testnetz()
    const lauf = new Lauf(netz, umgebung({ uhr: () => ms, grenzen: { laufMs: 1000 } }).u)
    await lauf.dns('a.test', 'TXT')
    ms = 1000
    await expect(lauf.dns('b.test', 'TXT')).rejects.toThrow('Grenze erreicht')
  })

  it('Abbruch während einer Abfrage: Protokoll „abgebrochen“, LaufEnde abgebrochen', async () => {
    const abbruch = new AbortController()
    const netz = testnetz({ beiAufruf: (nr) => nr === 2 && abbruch.abort() })
    const lauf = new Lauf(netz, umgebung({ signal: abbruch.signal }).u)
    await lauf.dns('a.test', 'TXT')
    await expect(lauf.dns('b.test', 'TXT')).rejects.toEqual(new LaufEnde('abgebrochen'))
    await expect(lauf.dns('c.test', 'TXT')).rejects.toThrow('abgebrochen')
    expect(lauf.protokoll.map((a) => a.ergebnis)).toEqual(['NOERROR, keine Antwort', 'abgebrochen'])
    expect(netz.zaehle('DNS')).toBe(2)
  })

  it('HTTP-Abrufe: mindestens 250 ms Abstand, Protokoll mit Status und Weiterleitungsziel', async () => {
    let ms = 0
    const gewartet: number[] = []
    const netz = testnetz({
      modus: 'desktop',
      http: { 'https://firma.test/': http('https://firma.test/', 301, [['location', 'https://www.firma.test/']]), 'https://www.firma.test/': http('https://www.firma.test/', 200) },
    })
    const lauf = new Lauf(netz, umgebung({ uhr: () => ms, warte: async (n) => void gewartet.push(n) }).u)
    await lauf.http('https://firma.test/')
    ms = 100
    await lauf.http('https://www.firma.test/')
    expect(gewartet).toEqual([150])
    expect(lauf.protokoll.map((a) => `${a.art} ${a.anfrage} → ${a.ergebnis}`)).toEqual(['http GET https://firma.test/ → 301 → https://www.firma.test/', 'http GET https://www.firma.test/ → 200'])
  })

  it('eine Ausnahme im Netz wird zum NetzFehler und steht im Protokoll', async () => {
    const netz = { ...testnetz(), dns: async () => Promise.reject(new Error('kaputt')) }
    const lauf = new Lauf(netz, umgebung({ grenzen: { dns: 1 } }).u)
    expect(await lauf.dns('a.test', 'TXT')).toEqual({ fehler: 'verbindung', text: 'kaputt' })
    expect(lauf.protokoll[0].ergebnis).toBe('kaputt')
  })
})
