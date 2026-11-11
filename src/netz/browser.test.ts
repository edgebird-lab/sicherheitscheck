import { describe, expect, it } from 'vitest'
import { browserNetz, dohAdresse } from './browser'

interface Aufruf {
  url: string
  init: RequestInit | undefined
}

/** Nachgebildetes fetch: zeichnet Aufrufe auf und antwortet aus einer Liste */
function nachgebildet(...antworten: (Response | Error | (() => Promise<Response>))[]) {
  const aufrufe: Aufruf[] = []
  const f = async (eingabe: RequestInfo | URL, init?: RequestInit) => {
    aufrufe.push({ url: String(eingabe), init })
    const a = antworten[Math.min(aufrufe.length - 1, antworten.length - 1)]
    if (a instanceof Error) throw a
    if (typeof a === 'function') return a()
    return a.clone()
  }
  return { f: f as typeof fetch, aufrufe }
}

const json = (wert: unknown, status = 200) => new Response(JSON.stringify(wert), { status, headers: { 'content-type': 'application/dns-json' } })

describe('Anfrage an den DoH-Anbieter (6.4)', () => {
  it('Cloudflare: dns-query mit name und type, cd=1 nur auf Wunsch', () => {
    expect(dohAdresse('cloudflare', '_dmarc.firma.test', 'TXT')).toBe('https://cloudflare-dns.com/dns-query?name=_dmarc.firma.test&type=TXT')
    expect(dohAdresse('cloudflare', 'firma.test', 'SOA', true)).toBe('https://cloudflare-dns.com/dns-query?name=firma.test&type=SOA&cd=1')
  })

  it('Google: resolve mit edns_client_subnet=0.0.0.0/0', () => {
    expect(dohAdresse('google', 'firma.test', 'CAA')).toBe('https://dns.google/resolve?name=firma.test&type=CAA&edns_client_subnet=0.0.0.0%2F0')
    expect(dohAdresse('google', 'firma.test', 'SOA', true)).toBe('https://dns.google/resolve?name=firma.test&type=SOA&cd=1&edns_client_subnet=0.0.0.0%2F0')
  })

  it('Cloudflare bekommt die Kopfzeile accept: application/dns-json, ohne Cookies und Referrer', async () => {
    const { f, aufrufe } = nachgebildet(json({ Status: 0, Answer: [{ name: 'firma.test', type: 16, TTL: 1, data: '"v=spf1 -all"' }] }))
    const r = await browserNetz({ anbieter: 'cloudflare', fetch: f }).dns('firma.test', 'TXT')
    expect(r).toEqual({ status: 0, ad: false, antworten: [{ name: 'firma.test', typ: 16, ttl: 1, daten: 'v=spf1 -all' }], kommentar: '' })
    expect(aufrufe[0].init).toMatchObject({ method: 'GET', headers: { accept: 'application/dns-json' }, credentials: 'omit', referrerPolicy: 'no-referrer' })
  })
})

describe('Fehler des Anbieters', () => {
  it('HTTP-Status ungleich 200 ergibt NetzFehler antwort mit Status', async () => {
    const { f } = nachgebildet(new Response('kaputt', { status: 500 }))
    expect(await browserNetz({ anbieter: 'google', fetch: f }).dns('firma.test', 'TXT')).toEqual({ fehler: 'antwort', text: 'HTTP 500', httpStatus: 500 })
  })

  it('Verbindungsfehler und Antworten, die kein JSON sind', async () => {
    const { f } = nachgebildet(new TypeError('Failed to fetch'), new Response('<html>', { status: 200 }))
    const netz = browserNetz({ anbieter: 'cloudflare', fetch: f })
    expect(await netz.dns('firma.test', 'TXT')).toMatchObject({ fehler: 'verbindung' })
    expect(await netz.dns('firma.test', 'TXT')).toEqual({ fehler: 'antwort', text: 'Antwort ist kein JSON' })
  })

  it('nach dem Zeitlimit: Zeitüberschreitung', async () => {
    const haengt = (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_ok, fehler) => init?.signal?.addEventListener('abort', () => fehler(new DOMException('Zeit', 'TimeoutError'))))
    const r = await browserNetz({ anbieter: 'cloudflare', fetch: haengt as typeof fetch, zeitlimitMs: 20 }).dns('firma.test', 'TXT')
    expect(r).toEqual({ fehler: 'zeitueberschreitung', text: 'Zeitüberschreitung' })
  })

  it('HTTP und TLS sind im Browser nicht verfügbar und rufen nichts ab', async () => {
    const { f, aufrufe } = nachgebildet(json({ Status: 0 }))
    const netz = browserNetz({ anbieter: 'cloudflare', fetch: f })
    expect(netz.modus).toBe('browser')
    expect(await netz.http('https://firma.test/')).toMatchObject({ fehler: 'nicht_verfuegbar' })
    expect(await netz.tls('firma.test')).toMatchObject({ fehler: 'nicht_verfuegbar' })
    expect(aufrufe).toHaveLength(0)
  })
})
