import { describe, expect, it } from 'vitest'
import { gehoertZu, pruefeDomain } from './domain'
import { pruefeSelektoren } from './selektoren'

describe('Domain-Eingabe (Spezifikation 9.3)', () => {
  it('T-D01: Adresse mit Pfad, Großbuchstaben und Leerzeichen am Rand', () => {
    expect(pruefeDomain('  HTTPS://WWW.Firma.DE/pfad  ')).toEqual({
      ok: true,
      domain: 'firma.de',
      hosts: { D: 'firma.de', W: 'www.firma.de', S: 'mta-sts.firma.de' },
      hinweis: 'Geprüft wird firma.de mit www und mta-sts.',
    })
  })

  it('T-D02: Umlaute werden zu Punycode', () => {
    expect(pruefeDomain('müller-bau.de')).toMatchObject({ ok: true, domain: 'xn--mller-bau-q9a.de', hinweis: null })
  })

  it('T-D03: IP-Adressen werden nicht geprüft', () => {
    expect(pruefeDomain('192.168.2.105')).toEqual({ ok: false, fehler: 'IP-Adressen werden nicht geprüft.' })
    expect(pruefeDomain('[::1]')).toEqual({ ok: false, fehler: 'IP-Adressen werden nicht geprüft.' })
  })

  it('T-D04: localhost und intranet sind keine öffentlichen Domains', () => {
    expect(pruefeDomain('localhost')).toEqual({ ok: false, fehler: 'Keine öffentliche Domain.' })
    expect(pruefeDomain('intranet')).toEqual({ ok: false, fehler: 'Keine öffentliche Domain.' })
  })

  it('T-D05: firma.local und firma.test sind keine öffentlichen Domains', () => {
    expect(pruefeDomain('firma.local')).toEqual({ ok: false, fehler: 'Keine öffentliche Domain.' })
    expect(pruefeDomain('firma.test')).toEqual({ ok: false, fehler: 'Keine öffentliche Domain.' })
  })

  it('T-D06: Plattformanbieter werden abgelehnt', () => {
    expect(pruefeDomain('firma.github.io')).toEqual({ ok: false, fehler: 'Die Adresse gehört einem Plattformanbieter (z. B. github.io). Bitte die eigene Domain angeben.' })
    // firma.de.com gilt laut PSL als privat (bewusst abgelehnt)
    expect(pruefeDomain('firma.de.com').ok).toBe(false)
  })

  it('T-D07: shop.firma.co.uk → firma.co.uk mit Hinweis', () => {
    expect(pruefeDomain('shop.firma.co.uk')).toMatchObject({ ok: true, domain: 'firma.co.uk', hinweis: 'Geprüft wird firma.co.uk mit www und mta-sts.' })
  })

  it('T-D08: Punkt am Ende und Großschreibung', () => {
    expect(pruefeDomain('Firma.DE.')).toMatchObject({ ok: true, domain: 'firma.de', hinweis: null })
  })

  it('leere und ungültige Eingaben', () => {
    expect(pruefeDomain('   ')).toEqual({ ok: false, fehler: 'Bitte eine Domain eingeben.' })
    expect(pruefeDomain('firma .de')).toEqual({ ok: false, fehler: 'Keine gültige Adresse.' })
    expect(pruefeDomain('example.com')).toMatchObject({ ok: true, domain: 'example.com' })
  })

  it('nur D und Namen unter D gehören zur Prüfung', () => {
    expect(gehoertZu('www.firma.de', 'firma.de')).toBe(true)
    expect(gehoertZu('FIRMA.de.', 'firma.de')).toBe(true)
    expect(gehoertZu('andere.de', 'firma.de')).toBe(false)
    expect(gehoertZu('firma.de.evil.example', 'firma.de')).toBe(false)
    expect(gehoertZu('xfirma.de', 'firma.de')).toBe(false)
  })
})

describe('DKIM-Selektoren', () => {
  it('liest bis zu 5 Selektoren, durch Komma oder Leerzeichen getrennt', () => {
    expect(pruefeSelektoren('selector1, selector2 s1.sub')).toEqual({ ok: true, selektoren: ['selector1', 'selector2', 's1.sub'] })
    expect(pruefeSelektoren('')).toEqual({ ok: true, selektoren: [] })
    expect(pruefeSelektoren('a b c d e f')).toEqual({ ok: false, fehler: 'Höchstens 5 Selektoren.' })
    expect(pruefeSelektoren('gut, sch/lecht')).toEqual({ ok: false, fehler: 'Ungültiger Selektor „sch/lecht“.' })
  })
})
