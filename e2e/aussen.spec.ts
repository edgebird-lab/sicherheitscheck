import type { Page } from '@playwright/test'
import { dohNachbilden, expect, fremdeAnfragen, gespeichert, neuerBetrieb, pruefeBarrierefreiheit, schritt, test } from './hilfen.ts'

/** Betrieb mit Domain example.com und neuer Prüfung, dann zum Schritt Außenprüfung */
async function vorbereiten(page: Page) {
  await page.goto('/')
  await neuerBetrieb(page, 'Bäckerei Probe')
  await page.getByLabel('Domain (optional)').fill('www.Example.com')
  await page.getByLabel('Domain (optional)').press('Tab')
  await expect(page.getByLabel('Domain (optional)')).toHaveValue('example.com')
  await page.getByRole('button', { name: 'Neue Prüfung' }).click()
  await schritt(page, /^Außenprüfung/)
  await expect(page.getByRole('heading', { name: 'Außenprüfung', level: 1 })).toBeVisible()
}

test('E-06: ohne Häkchen ist „Prüfung starten“ gesperrt', async ({ page }) => {
  await vorbereiten(page)
  await expect(page.getByText('Optional. Ohne Außenprüfung entfällt Teil B des Berichts.')).toBeVisible()
  const start = page.getByRole('button', { name: 'Prüfung starten' })
  await expect(start).toBeDisabled()
  await page.getByRole('radio', { name: /^Beauftragt/ }).check()
  await page.getByLabel('Name', { exact: true }).fill('Robin Olbricht')
  await expect(start).toBeDisabled()
  const haken = page.getByRole('checkbox', { name: /Ich bestätige, dass ich für die Domain example\.com verantwortlich bin/ })
  await haken.check()
  await expect(start).toBeEnabled()
  // Eine andere Domain hebt die Bestätigung auf
  await page.getByLabel('Domain', { exact: true }).fill('firma.de')
  await expect(haken).toHaveCount(1)
  await expect(start).toBeDisabled()
})

test('E-07: Außenprüfung example.com mit nachgebildeten DoH-Antworten', async ({ page, baseURL }) => {
  const fremd = fremdeAnfragen(page, baseURL!)
  const anfragen = await dohNachbilden(page)
  await vorbereiten(page)
  await expect(page.getByText(/bis zu 40 DNS-Abfragen über Cloudflare zu example\.com/)).toBeVisible()
  await page.getByRole('radio', { name: /^Beauftragt/ }).check()
  await page.getByLabel('Name', { exact: true }).fill('Robin Olbricht')
  await page.getByRole('checkbox', { name: /Ich bestätige/ }).check()
  await page.getByRole('button', { name: 'Prüfung starten' }).click()

  const ergebnis = page.getByRole('heading', { name: /^Ergebnis vom/ })
  await expect(ergebnis).toBeFocused()
  await expect(page.getByRole('list', { name: 'Anzahl je Stufe' }).getByRole('listitem')).toHaveText(['2 Warnungen', '2 Hinweise', '4 Informationen', '13 nicht geprüft'])

  const email = page.getByRole('region', { name: 'E-Mail' })
  await expect(email.getByRole('heading', { level: 3 })).toHaveText([
    'Mailserver eingetragen',
    'SPF ohne klare Regel für fremde Server',
    'DMARC beobachtet nur, ohne Berichte',
    'DKIM ohne Selektor nicht prüfbar',
    'Kein MTA-STS',
    'Keine TLS-Berichte',
  ])
  await expect(email.getByText('10 mail.example.com')).toBeVisible()
  await expect(email.getByText('v=spf1 mx a ?all (2 DNS-Abfragen)')).toBeVisible()
  const domain = page.getByRole('region', { name: 'Domain' })
  await expect(domain.getByRole('heading', { level: 3 })).toHaveText(['DNSSEC nicht eingerichtet', 'Keine CAA-Einträge'])
  const website = page.getByRole('region', { name: 'Website' })
  await expect(website.getByText('Nur im Windows-Programm')).toBeVisible()
  await expect(website.getByText('13 Prüfungen')).toBeVisible()

  // Abrufprotokoll mit acht DNS-Abfragen, nur an den DoH-Anbieter
  await page.getByText('Abrufprotokoll (8 Abrufe)').click()
  await expect(page.getByRole('table', { name: 'Abrufprotokoll' }).getByRole('row')).toHaveCount(9)
  expect(anfragen).toEqual([
    'MX example.com',
    'TXT example.com',
    'TXT _dmarc.example.com',
    'TXT _mta-sts.example.com',
    'TXT _smtp._tls.example.com',
    'SOA example.com',
    'CAA example.com',
    'CAA com',
  ])
  expect(fremd).toEqual([])

  await pruefeBarrierefreiheit(page, 'Ergebnis der Außenprüfung hell')
  await page.emulateMedia({ colorScheme: 'dark' })
  await pruefeBarrierefreiheit(page, 'Ergebnis der Außenprüfung dunkel')

  // Gespeichert: nach dem Neuladen noch da, Häkchen in der Schrittleiste
  await gespeichert(page)
  await page.reload()
  await page.getByRole('button', { name: 'Bäckerei Probe' }).click()
  await schritt(page, /^Außenprüfung/)
  await expect(page.getByRole('region', { name: 'E-Mail' }).getByRole('heading', { level: 3 })).toHaveCount(6)
  await expect(page.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name: 'Außenprüfung (vollständig)' })).toBeVisible()

  // Neuer Lauf nur nach Rückfrage, mit neuer Bestätigung
  await page.getByRole('button', { name: 'Neue Außenprüfung' }).click()
  await page.getByRole('dialog', { name: 'Neue Außenprüfung?' }).getByRole('button', { name: 'Neuen Lauf vorbereiten' }).click()
  await expect(page.getByRole('button', { name: 'Prüfung starten' })).toBeDisabled()
})

test('Abbrechen während des Laufs speichert ein abgebrochenes Teilergebnis', async ({ page }) => {
  // DMARC antwortet erst nach dem Abbruch
  let weiter: () => void = () => {}
  const haengt = new Promise<void>((r) => (weiter = r))
  await dohNachbilden(page)
  await page.route(
    (url) => url.hostname === 'cloudflare-dns.com' && url.searchParams.get('name') === '_dmarc.example.com',
    async (route) => {
      await haengt
      await route.abort().catch(() => {})
    },
  )
  await vorbereiten(page)
  await page.getByRole('radio', { name: /^Verantwortlich/ }).check()
  await page.getByLabel('Name', { exact: true }).fill('Erika Beispiel')
  await page.getByRole('checkbox', { name: /Ich bestätige/ }).check()
  await page.getByRole('button', { name: 'Prüfung starten' }).click()
  await expect(page.getByRole('heading', { name: 'Prüfung läuft …' })).toBeVisible()
  await expect(page.getByText('E-Mail: 2 von 6 fertig')).toBeVisible()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  weiter()
  await expect(page.getByText('Der Lauf wurde abgebrochen.')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Anzahl je Stufe' })).toContainText('nicht prüfbar')
  await expect(page.getByRole('navigation', { name: 'Schritte' }).getByRole('button', { name: 'Außenprüfung (vollständig)' })).toHaveCount(0)
})
