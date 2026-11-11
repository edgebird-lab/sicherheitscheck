import { describe, expect, it } from 'vitest'
import { desktopNetz, type Rufe } from './desktop'

/** Brücke zu Rust als Attrappe: zeichnet Aufrufe auf und antwortet aus einer Tabelle */
function bruecke(antworten: Record<string, unknown | ((args: Record<string, unknown>) => unknown)>) {
  const aufrufe: [string, Record<string, unknown>][] = []
  const rufe: Rufe = async <T,>(befehl: string, args: Record<string, unknown>) => {
    aufrufe.push([befehl, args])
    const a = antworten[befehl]
    const wert = typeof a === 'function' ? a(args) : a
    if (wert instanceof Error || (typeof wert === 'object' && wert !== null && 'fehler' in wert)) throw wert
    return wert as T
  }
  return { rufe, aufrufe }
}

const keinFetch = (async () => {
  throw new Error('kein Netz im Test')
}) as typeof fetch

describe('Netz im Windows-Programm', () => {
  it('HTTP, TLS und Freigabe gehen an die Rust-Befehle; Modus desktop', async () => {
    const antwort = { url: 'https://firma.test/', status: 200, kopfzeilen: [], text: null, gekuerzt: false }
    const { rufe, aufrufe } = bruecke({ http_abruf: antwort, tls_info: { host: 'firma.test', version: 'TLS 1.3' }, freigabe_setzen: null })
    const netz = desktopNetz({ anbieter: 'cloudflare', rufe, fetch: keinFetch })
    expect(netz.modus).toBe('desktop')
    expect(await netz.freigeben?.('firma.test')).toBeNull()
    expect(await netz.http('https://firma.test/')).toEqual(antwort)
    expect(await netz.tls('firma.test')).toMatchObject({ version: 'TLS 1.3' })
    expect(aufrufe).toEqual([
      ['freigabe_setzen', { domain: 'firma.test' }],
      ['http_abruf', { url: 'https://firma.test/' }],
      ['tls_info', { host: 'firma.test' }],
    ])
  })

  it('NetzFehler aus Rust kommen unverändert zurück, andere Fehler werden zu „verbindung“', async () => {
    const { rufe } = bruecke({
      http_abruf: { fehler: 'nicht_erlaubt', text: 'example.com ist nicht freigegeben' },
      tls_info: new Error('tls_info not allowed. Permissions associated with this command: allow-tls-info'),
      freigabe_setzen: { fehler: 'nicht_erlaubt', text: '„de“ ist keine registrierbare Domain.' },
    })
    const netz = desktopNetz({ anbieter: 'google', rufe, fetch: keinFetch })
    expect(await netz.http('https://example.com/')).toEqual({ fehler: 'nicht_erlaubt', text: 'example.com ist nicht freigegeben' })
    expect(await netz.tls('firma.test')).toMatchObject({ fehler: 'verbindung', text: expect.stringContaining('allow-tls-info') })
    expect(await netz.freigeben?.('de')).toEqual({ fehler: 'nicht_erlaubt', text: '„de“ ist keine registrierbare Domain.' })
  })

  it('DNS über HTTPS wie im Browser (fetch beim gewählten Anbieter)', async () => {
    const angefragt: string[] = []
    const fetchAttrappe = (async (eingabe: RequestInfo | URL) => {
      angefragt.push(String(eingabe))
      return new Response(JSON.stringify({ Status: 0, AD: false, Answer: [{ name: 'firma.test.', type: 16, TTL: 300, data: '"v=spf1 -all"' }] }), { status: 200 })
    }) as typeof fetch
    const { rufe, aufrufe } = bruecke({})
    const r = await desktopNetz({ anbieter: 'cloudflare', rufe, fetch: fetchAttrappe }).dns('firma.test', 'TXT')
    expect(r).toMatchObject({ status: 0, antworten: [{ name: 'firma.test', daten: 'v=spf1 -all' }] })
    expect(angefragt).toEqual(['https://cloudflare-dns.com/dns-query?name=firma.test&type=TXT'])
    expect(aufrufe).toEqual([])
  })
})
