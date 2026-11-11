import { useApp, useAuswahl } from './kontext'
import { AussenSchritt } from './schritte/AussenSchritt'
import { AuswertungSchritt } from './schritte/AuswertungSchritt'
import { BerichtSchritt } from './schritte/BerichtSchritt'
import { BetriebSchritt } from './schritte/BetriebSchritt'
import { KeinePruefung } from './schritte/gemeinsam'
import { InterviewSchritt } from './schritte/InterviewSchritt'
import { MassnahmenSchritt } from './schritte/MassnahmenSchritt'
import { VorgespraechSchritt } from './schritte/VorgespraechSchritt'
import { SCHRITTE } from './zustand'

export function BetriebAnsicht() {
  const { z } = useApp()
  const { betrieb, pruefung } = useAuswahl()
  const schritt = z.ansicht.art === 'betrieb' ? z.ansicht.schritt : 'betrieb'
  const titel = SCHRITTE.find((s) => s.id === schritt)?.name ?? ''
  return (
    <main id="inhalt" className={`seite${schritt === 'interview' ? ' seite-breit' : ''}`}>
      {schritt === 'betrieb' ? (
        <BetriebSchritt key={betrieb.id} />
      ) : !pruefung ? (
        <KeinePruefung titel={titel} />
      ) : (
        <>
          {schritt === 'vorgespraech' && <VorgespraechSchritt key={pruefung.id} />}
          {schritt === 'interview' && <InterviewSchritt key={pruefung.id} />}
          {schritt === 'aussen' && <AussenSchritt key={pruefung.id} />}
          {schritt === 'auswertung' && <AuswertungSchritt />}
          {schritt === 'massnahmen' && <MassnahmenSchritt />}
          {schritt === 'bericht' && <BerichtSchritt />}
        </>
      )}
    </main>
  )
}
