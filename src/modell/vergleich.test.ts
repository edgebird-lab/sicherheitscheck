import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { betriebMit, JETZT, pruefungMit } from '../testhilfen/pruefung'
import { abschliessen } from './operationen'
import type { Aussenpruefung, Befund, Massnahme, Pruefung, Stufe } from './typen'
import { veraenderungAnforderung, veraenderungBefund, vergleiche, vorgaengerVon } from './vergleich'

const K = KATALOG
const TOP = K.anforderungen.filter((a) => a.top).map((a) => a.id)
const BASIS = K.anforderungen.filter((a) => !a.top).map((a) => a.id)

/** Alle TOP erfüllt und die ersten n Basis-Anforderungen: 15 + n Punkte von 37 */
function mitPunkten(n: number, extra: Partial<Pruefung> = {}): Pruefung {
  const erfuellt = new Set([...TOP, ...BASIS.slice(0, n)])
  return pruefungMit(K, (a) => (erfuellt.has(a.id) ? 'erfuellt' : 'nicht_erfuellt'), extra)
}

function aussen(befunde: [Befund['pruefId'], Stufe, string?][], modus: Aussenpruefung['modus'] = 'browser'): Aussenpruefung {
  return {
    domain: 'example.com',
    dkimSelektoren: [],
    modus,
    dohAnbieter: 'cloudflare',
    bestaetigung: { name: 'R', rolle: 'beauftragt', text: '…', zeit: '2026-11-10T10:00:00.000Z' },
    gestartet: '2026-11-10T10:00:00.000Z',
    beendet: '2026-11-10T10:00:01.000Z',
    abgebrochen: false,
    befunde: befunde.map(([pruefId, stufe, ziel]) => ({ pruefId, ziel: ziel ?? 'example.com', stufe, regel: 'X', weitere: [], messwert: '', werte: {} })),
    protokoll: [],
  }
}

describe('Vergleich mit der letzten Prüfung (6.9)', () => {
  it('T-V01: vorher 20 von 37, jetzt 26 von 37 → +6, direkt vergleichbar', () => {
    const v = vergleiche(K, mitPunkten(5), mitPunkten(11))
    expect(v.statuswert).toEqual({ vorher: 20, jetzt: 26, maximalVorher: 37, maximalJetzt: 37, prozentVorher: 54, prozentJetzt: 70, direktVergleichbar: true })
    expect(v.statuswert.jetzt - v.statuswert.vorher).toBe(6)
  })

  it('T-V02: erfüllt → nicht erfüllt ist schlechter; offen → erfüllt ist besser', () => {
    expect(veraenderungAnforderung('erfuellt', 'nicht_erfuellt')).toBe('schlechter')
    expect(veraenderungAnforderung('offen', 'erfuellt')).toBe('besser')
    expect(veraenderungAnforderung('offen', 'nicht_erfuellt')).toBe('gleich')
    expect(veraenderungAnforderung('nicht_relevant', 'nicht_relevant')).toBe('gleich')
    expect(veraenderungAnforderung('nicht_relevant', 'erfuellt')).toBe('nicht_vergleichbar')
    const vorher = pruefungMit(K, (a) => (a.id === 'A03' ? 'erfuellt' : a.id === 'A04' ? 'offen' : 'erfuellt'))
    const jetzt = pruefungMit(K, (a) => (a.id === 'A03' ? 'nicht_erfuellt' : 'erfuellt'))
    const v = vergleiche(K, vorher, jetzt)
    expect(v.anforderungen.filter((x) => x.veraenderung !== 'gleich')).toEqual([
      { id: 'A03', vorher: 'erfuellt', jetzt: 'nicht_erfuellt', veraenderung: 'schlechter' },
      { id: 'A04', vorher: 'offen', jetzt: 'erfuellt', veraenderung: 'besser' },
    ])
    expect(v.anforderungen).toHaveLength(27)
  })

  it('T-V03: DMARC warnung → ok ist besser; neuer Befund; weggefallener Befund', () => {
    const vorher = mitPunkten(5, { aussen: aussen([['dmarc', 'warnung'], ['spf', 'ok'], ['dkim', 'warnung', 'alt._domainkey.example.com']]) })
    const jetzt = mitPunkten(5, { aussen: aussen([['dmarc', 'ok'], ['spf', 'ok'], ['caa', 'hinweis']]) })
    expect(vergleiche(K, vorher, jetzt).befunde).toEqual([
      { pruefId: 'spf', ziel: 'example.com', vorher: 'ok', jetzt: 'ok', veraenderung: 'gleich' },
      { pruefId: 'dmarc', ziel: 'example.com', vorher: 'warnung', jetzt: 'ok', veraenderung: 'besser' },
      { pruefId: 'dkim', ziel: 'alt._domainkey.example.com', vorher: 'warnung', jetzt: null, veraenderung: 'entfallen' },
      { pruefId: 'caa', ziel: 'example.com', vorher: null, jetzt: 'hinweis', veraenderung: 'neu' },
    ])
  })

  it('T-V04: Maximum 37 → 36: nicht direkt vergleichbar, Vergleich über Prozent', () => {
    const jetzt = pruefungMit(K, (a) => (a.id === 'A11' ? 'nicht_relevant' : 'erfuellt'))
    const v = vergleiche(K, mitPunkten(22), jetzt)
    expect(v.statuswert).toMatchObject({ vorher: 37, jetzt: 36, maximalVorher: 37, maximalJetzt: 36, prozentVorher: 100, prozentJetzt: 100, direktVergleichbar: false })
    expect(v.anforderungen.find((a) => a.id === 'A11')?.veraenderung).toBe('nicht_vergleichbar')
  })

  it('T-V05: nicht_geprueft (Browser) gegen ok (Windows-Programm) → nicht vergleichbar', () => {
    expect(veraenderungBefund('nicht_geprueft', 'ok')).toBe('nicht_vergleichbar')
    expect(veraenderungBefund('fehler', 'warnung')).toBe('nicht_vergleichbar')
    expect(veraenderungBefund('info', 'ok')).toBe('gleich')
    expect(veraenderungBefund('hinweis', 'kritisch')).toBe('schlechter')
    const vorher = mitPunkten(0, { aussen: aussen([['hsts', 'nicht_geprueft']]) })
    const jetzt = mitPunkten(0, { aussen: aussen([['hsts', 'ok']], 'desktop') })
    expect(vergleiche(K, vorher, jetzt).befunde.map((b) => b.veraenderung)).toEqual(['nicht_vergleichbar'])
  })

  it('Befunde nur, wenn beide Prüfungen eine Außenprüfung haben; Maßnahmen der letzten Prüfung', () => {
    const massnahme = (id: string, status: Massnahme['status']): Massnahme => ({
      id,
      quelle: { art: 'anforderung', anforderungId: 'A04' },
      titel: 'T',
      prioritaet: 2,
      prioritaetManuell: null,
      begruendungManuell: '',
      frist: '2027-01-01',
      verantwortlich: '',
      status,
      notiz: '',
      erledigtAm: null,
      ursacheEntfallen: false,
    })
    const vorher = mitPunkten(5, { aussen: aussen([['dmarc', 'warnung']]), massnahmen: [massnahme('1', 'erledigt'), massnahme('2', 'offen'), massnahme('3', 'in_arbeit'), massnahme('4', 'verworfen')] })
    const v = vergleiche(K, vorher, mitPunkten(5))
    expect(v.befunde).toEqual([])
    expect(v.massnahmenVorher).toEqual({ erledigt: 1, offen: 2 })
  })

  it('nutzt das eingefrorene Ergebnis einer abgeschlossenen Prüfung', () => {
    const r = abschliessen(K, mitPunkten(5), JETZT)
    if (!r.ok) throw new Error('nicht abgeschlossen')
    const eingefroren = { ...r.pruefung, ergebnis: { ...r.pruefung.ergebnis!, statuswert: 19 } }
    expect(vergleiche(K, eingefroren, mitPunkten(5)).statuswert.vorher).toBe(19)
  })

  it('Vorgänger: vorgaengerId, sonst die letzte abgeschlossene Prüfung mit kleinerer Nummer', () => {
    const eins = { ...mitPunkten(1), id: 'p1', nr: 1, status: 'abgeschlossen' as const }
    const zwei = { ...mitPunkten(2), id: 'p2', nr: 2, status: 'abgeschlossen' as const }
    const drei = { ...mitPunkten(3), id: 'p3', nr: 3 }
    const b = betriebMit(eins, zwei, drei)
    expect(vorgaengerVon(b, drei)?.id).toBe('p2')
    expect(vorgaengerVon(b, { ...drei, vorgaengerId: 'p1' })?.id).toBe('p1')
    expect(vorgaengerVon(b, eins)).toBeNull()
    expect(vorgaengerVon(betriebMit({ ...eins, status: 'entwurf' }, drei), drei)).toBeNull()
  })
})
