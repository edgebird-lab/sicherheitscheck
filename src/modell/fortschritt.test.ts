import { describe, expect, it } from 'vitest'
import { KATALOG } from '../katalog'
import { HEUTE, JETZT, pruefungMit, zaehler } from '../testhilfen/pruefung'
import { aendereMassnahme, gleicheMassnahmenAb } from './massnahmen'
import { naechsteOffene, offeneAnforderungen, schrittVollstaendig, sichtbareAnforderungen, themenFortschritt } from './fortschritt'
import { neuePruefung, neuerBetrieb, setzeAntwort, setzeVorfrage } from './operationen'

const K = KATALOG
const leer = () => neuePruefung(neuerBetrieb('X', JETZT, 'b'), K, 'R', HEUTE, JETZT, 'p')

describe('Fortschritt im Interview', () => {
  it('zählt je Thema beantwortete von sichtbaren Anforderungen', () => {
    let p = leer().pruefung
    p = setzeAntwort(p, K, 'A01', { bewertung: 'erfuellt', begruendung: 'GF kümmert sich' }, JETZT)
    p = setzeAntwort(p, K, 'A02', { bewertung: 'nicht_erfuellt' }, JETZT) // ohne Begründung: nicht fertig
    p = setzeVorfrage(p, K, 'mobiles_arbeiten', false, JETZT) // blendet A05 aus
    const org = themenFortschritt(K, p)[0]
    expect(org).toMatchObject({ anzahl: 5, beantwortet: 1, vollstaendig: false })
    expect(org.thema.id).toBe('organisation')
    expect(sichtbareAnforderungen(K, p)).toHaveLength(26)
  })

  it('übernommene, unbestätigte Antworten zählen als nicht fertig', () => {
    const p = pruefungMit(K, () => 'erfuellt')
    p.antworten.A03 = { ...p.antworten.A03, uebernommen: true }
    expect(offeneAnforderungen(K, p).map((a) => a.id)).toEqual(['A03'])
  })

  it('nächste offene Anforderung, ringsum', () => {
    const p = pruefungMit(K, (a) => (a.id === 'A02' || a.id === 'A20' ? 'offen' : 'erfuellt'))
    expect(naechsteOffene(K, p, null)).toBe('A02')
    expect(naechsteOffene(K, p, 'A02')).toBe('A20')
    expect(naechsteOffene(K, p, 'A20')).toBe('A02')
    expect(naechsteOffene(K, pruefungMit(K, () => 'erfuellt'), 'A01')).toBeNull()
  })
})

describe('Häkchen der Schrittleiste', () => {
  it('Vorgespräch braucht Datum und alle Vorfragen; Interview alle Antworten; Bericht den Abschluss', () => {
    const { betrieb, pruefung } = leer()
    expect(schrittVollstaendig('betrieb', betrieb, pruefung, K)).toBe(true)
    expect(schrittVollstaendig('vorgespraech', betrieb, pruefung, K)).toBe(false)
    const fertig = pruefungMit(K, () => 'erfuellt')
    expect(schrittVollstaendig('vorgespraech', betrieb, fertig, K)).toBe(true)
    expect(schrittVollstaendig('vorgespraech', betrieb, { ...fertig, datum: '' }, K)).toBe(false)
    expect(schrittVollstaendig('interview', betrieb, fertig, K)).toBe(true)
    expect(schrittVollstaendig('interview', betrieb, pruefung, K)).toBe(false)
    expect(schrittVollstaendig('bericht', betrieb, fertig, K)).toBe(false)
    expect(schrittVollstaendig('bericht', betrieb, { ...fertig, status: 'abgeschlossen' }, K)).toBe(true)
    expect(schrittVollstaendig('aussen', betrieb, fertig, K)).toBe(false)
    expect(schrittVollstaendig('interview', betrieb, null, K)).toBe(false)
  })

  it('Maßnahmen: Interview fertig und jede offene Maßnahme hat einen Verantwortlichen', () => {
    const { betrieb, pruefung } = leer()
    const fertig = pruefungMit(K, () => 'erfuellt')
    expect(schrittVollstaendig('massnahmen', betrieb, fertig, K)).toBe(true)
    expect(schrittVollstaendig('massnahmen', betrieb, pruefung, K)).toBe(false)
    const mit = gleicheMassnahmenAb(K, pruefungMit(K, (a) => (a.id === 'A04' || a.id === 'A06' ? 'nicht_erfuellt' : 'erfuellt')), JETZT, zaehler())
    expect(schrittVollstaendig('massnahmen', betrieb, mit, K)).toBe(false)
    const zugeteilt = aendereMassnahme(aendereMassnahme(mit, 'id-1', { verantwortlich: 'Erika' }, JETZT), 'id-2', { status: 'verworfen' }, JETZT)
    expect(schrittVollstaendig('massnahmen', betrieb, zugeteilt, K)).toBe(true)
  })
})
