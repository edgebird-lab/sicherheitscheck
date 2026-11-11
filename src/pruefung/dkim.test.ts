import { describe, expect, it } from 'vitest'
import { leer, servfail, txt, type DnsEintrag } from '../netz/testnetz'
import { kurz, testlauf } from '../testhilfen/netz'
import { dkimOhneSelektor, liesDer, pruefeDkim, rsaBits } from './dkim'

const D = 'firma.test'
const ZIEL = 's1._domainkey.firma.test'

async function dkim(antwort: DnsEintrag) {
  const { lauf, netz } = testlauf({ dns: { [`TXT ${ZIEL}`]: antwort } })
  return { befund: await pruefeDkim(lauf, D, 's1'), netz }
}

const base64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))

/** Öffentlicher RSA-Schlüssel als SubjectPublicKeyInfo (DER), im Test erzeugt */
async function rsaSpki(bits: number): Promise<Uint8Array> {
  const paar = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])
  return new Uint8Array(await crypto.subtle.exportKey('spki', paar.publicKey))
}

/** Derselbe Schlüssel als RSAPublicKey (PKCS#1): Inhalt des BIT STRING ohne das Füllbyte */
function alsPkcs1(spki: Uint8Array): Uint8Array {
  const aussen = liesDer(spki)!
  const algorithmus = liesDer(aussen.inhalt)!
  return liesDer(aussen.inhalt, algorithmus.ende)!.inhalt.subarray(1)
}

describe('DKIM (6.5)', () => {
  it('T-DK01: keine Selektoren → DKIM-01 info mit Ziel D', () => {
    const b = dkimOhneSelektor(D)
    expect(kurz(b)).toEqual({ regel: 'DKIM-01', stufe: 'info', weitere: [] })
    expect(b.ziel).toBe(D)
  })

  it('T-DK02: Selektor ohne Eintrag → DKIM-02 warnung, Ziel ‹selektor›._domainkey.D', async () => {
    const { befund, netz } = await dkim(leer())
    expect(kurz(befund)).toEqual({ regel: 'DKIM-02', stufe: 'warnung', weitere: [] })
    expect(befund.ziel).toBe(ZIEL)
    expect(netz.aufrufe).toEqual([`DNS TXT ${ZIEL}`])
  })

  it('Eintrag ohne Tag p → DKIM-02', async () => {
    expect(kurz((await dkim(txt(ZIEL, 'v=DKIM1; k=rsa'))).befund).regel).toBe('DKIM-02')
  })

  it('T-DK03: p= leer → DKIM-03 hinweis (Schlüssel widerrufen)', async () => {
    expect(kurz((await dkim(txt(ZIEL, 'v=DKIM1; k=rsa; p='))).befund)).toEqual({ regel: 'DKIM-03', stufe: 'hinweis', weitere: [] })
  })

  it('T-DK04: RSA 512 / 1024 / 2048 Bit (SPKI 94 / 162 / 294 Byte) → DKIM-05 / DKIM-06 / DKIM-07', async () => {
    const erwartet: [number, number, string, string][] = [
      [512, 94, 'DKIM-05', 'warnung'],
      [1024, 162, 'DKIM-06', 'hinweis'],
      [2048, 294, 'DKIM-07', 'ok'],
    ]
    for (const [bits, bytes, regel, stufe] of erwartet) {
      const spki = await rsaSpki(bits)
      expect(spki.length).toBe(bytes)
      const { befund } = await dkim(txt(ZIEL, `v=DKIM1; k=rsa; p=${base64(spki)}`))
      expect(kurz(befund), `${bits} Bit`).toEqual({ regel, stufe, weitere: [] })
      expect(befund.messwert).toBe(`RSA ${bits} Bit`)
      expect(befund.werte).toMatchObject({ verfahren: 'rsa', bits })
    }
  })

  it('PKCS#1-Form und Leerraum im Schlüssel; ohne k gilt rsa', async () => {
    const spki = await rsaSpki(2048)
    expect(rsaBits(alsPkcs1(spki))).toBe(2048)
    const b64 = base64(alsPkcs1(spki))
    const { befund } = await dkim(txt(ZIEL, `v=DKIM1; p=${b64.slice(0, 40)} ${b64.slice(40)}`))
    expect(kurz(befund).regel).toBe('DKIM-07')
  })

  it('T-DK05: k=ed25519 mit 32 Byte → DKIM-04 ok', async () => {
    const paar = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair
    const roh = new Uint8Array(await crypto.subtle.exportKey('raw', paar.publicKey))
    expect(kurz((await dkim(txt(ZIEL, `v=DKIM1; k=ed25519; p=${base64(roh)}`))).befund)).toEqual({ regel: 'DKIM-04', stufe: 'ok', weitere: [] })
  })

  it('nicht lesbare Schlüssel → DKIM-08 hinweis', async () => {
    for (const eintrag of ['v=DKIM1; k=rsa; p=@@@', 'v=DKIM1; k=rsa; p=AAAA', 'v=DKIM1; k=ed25519; p=AAAA', 'v=DKIM1; k=dsa; p=AAAA']) {
      expect(kurz((await dkim(txt(ZIEL, eintrag))).befund).regel, eintrag).toBe('DKIM-08')
    }
  })

  it('gescheiterte Abfrage → DKIM-00 fehler', async () => {
    expect(kurz((await dkim(servfail())).befund)).toEqual({ regel: 'DKIM-00', stufe: 'fehler', weitere: [] })
  })
})
