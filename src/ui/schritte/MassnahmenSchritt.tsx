import { useAuswahl } from '../kontext'

/** Platzhalter bis Phase 4 (Maßnahmen ableiten, priorisieren, verfolgen) */
export function MassnahmenSchritt() {
  const { pruefung } = useAuswahl()
  const offen = (pruefung?.massnahmen ?? []).filter((m) => m.status === 'offen' || m.status === 'in_arbeit').length
  return (
    <section className="schritt" aria-labelledby="schritt-titel">
      <h1 id="schritt-titel">Maßnahmen</h1>
      <div className="karte">
        <p className="leise">
          Der Maßnahmenplan ist noch in Arbeit: Aus nicht erfüllten Anforderungen und Befunden der Außenprüfung entstehen Maßnahmen mit Priorität, Frist, Verantwortlichem und Status.
        </p>
        {offen > 0 && <p>{offen === 1 ? '1 offene Maßnahme' : `${offen} offene Maßnahmen`} aus der letzten Prüfung übernommen.</p>}
      </div>
    </section>
  )
}
