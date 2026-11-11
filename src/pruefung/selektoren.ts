/** DKIM-Selektoren: höchstens 5, Labels 1–63 Zeichen aus Buchstaben, Ziffern, „-“ und „_“. */
export function pruefeSelektoren(eingabe: string): { ok: true; selektoren: string[] } | { ok: false; fehler: string } {
  const selektoren = [...new Set(eingabe.split(/[\s,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))]
  if (selektoren.length > 5) return { ok: false, fehler: 'Höchstens 5 Selektoren.' }
  for (const s of selektoren) {
    const labels = s.split('.')
    if (labels.some((l) => !/^[a-z0-9_-]{1,63}$/.test(l))) return { ok: false, fehler: `Ungültiger Selektor „${s}“.` }
  }
  return { ok: true, selektoren }
}
