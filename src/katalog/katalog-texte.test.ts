import { expect, it } from 'vitest'
import type { Anforderung, Katalog } from '../modell/typen'
import { KATALOG, themenSortiert } from './index'

/**
 * Erzeugt docs/katalog-texte.md aus dem Katalog, damit Robin alle eigenen Formulierungen
 * neben der Norm prüfen kann. Nach einer Änderung am Katalog: `npx vitest run -u`.
 */
function relevanzText(k: Katalog, a: Anforderung): string {
  switch (a.relevanz.art) {
    case 'immer':
      return 'immer relevant („nicht relevant“ ist nicht wählbar)'
    case 'begruendet':
      return '„nicht relevant“ wählbar, mit Begründung'
    case 'vorfrage': {
      const { vorfrageId, relevantWenn } = a.relevanz
      const v = k.vorfragen.find((x) => x.id === vorfrageId)
      return `nur relevant, wenn die Vorfrage „${v?.frage ?? vorfrageId}“ mit ${relevantWenn ? 'Ja' : 'Nein'} beantwortet ist`
    }
  }
}

function katalogAlsMarkdown(k: Katalog): string {
  const zeilen: string[] = [
    '# Katalog – alle eigenen Formulierungen',
    '',
    `Katalogversion ${k.version}. Erzeugt aus \`src/katalog\` (nicht von Hand ändern; nach Änderungen am Katalog \`npx vitest run -u\`).`,
    '',
    'Alle Texte sind eigene Formulierungen, kein Normtext. Robin prüft sie gegen die DIN SPEC 27076 (Phase 0.3): Deckt die Anforderung inhaltlich eine Anforderung der Norm ab, und ist kein Wortlaut der Norm übernommen? Ergebnis und Freigabe trägt er in [katalog-abgleich.md](katalog-abgleich.md) ein.',
    '',
    '## Vorfragen',
    '',
  ]
  for (const v of k.vorfragen) {
    zeilen.push(`- **${v.frage}** (\`${v.id}\`)  `, `  ${v.hilfe}`)
  }
  zeilen.push('', '## Vorbereitungsliste fürs Vorgespräch', '')
  for (const v of k.vorbereitung) zeilen.push(`- ${v.text} (\`${v.id}\`)`)
  for (const t of themenSortiert(k)) {
    zeilen.push('', `## ${t.nr} ${t.name}`, '')
    for (const a of k.anforderungen.filter((x) => x.thema === t.id)) {
      zeilen.push(
        `### ${a.id} · vorläufige Nr. ${a.normNr}${a.top ? ' · TOP' : ''}`,
        '',
        `- **Titel:** ${a.titel}`,
        `- **Kurzfrage:** ${a.frage}`,
        `- **Darum geht es:** ${a.hilfe}`,
        `- **Maßnahme bei Nichterfüllung:** ${a.massnahme}`,
        `- **Relevanz:** ${relevanzText(k, a)}`,
        `- **IT-Grundschutz (Vorschlag):** ${a.grundschutz.join(', ')}`,
        '',
      )
    }
  }
  return zeilen.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}

it('docs/katalog-texte.md entspricht dem Katalog', async () => {
  await expect(katalogAlsMarkdown(KATALOG)).toMatchFileSnapshot('../../docs/katalog-texte.md')
})
