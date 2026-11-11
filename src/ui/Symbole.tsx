/**
 * Kleine Symbole. Sie stehen nie allein: Daneben steht immer ein Wort (sichtbar oder für
 * Screenreader), Farbe ist nie das einzige Merkmal (5.1).
 */
export type SymbolArt = 'haken' | 'kreuz' | 'strich' | 'kreis' | 'warnung' | 'info' | 'hinweis' | 'frage' | 'pfeil' | 'schloss'

export function Symbol({ art, groesse = 16, className }: { art: SymbolArt; groesse?: number; className?: string }) {
  const p = { width: groesse, height: groesse, viewBox: '0 0 16 16', 'aria-hidden': true, focusable: false, className: `symbol symbol-${art}${className ? ` ${className}` : ''}` } as const
  switch (art) {
    case 'haken':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.6 8.3l2.2 2.2 4.6-4.9" fill="none" stroke="var(--symbol-innen, #fff)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'kreuz':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4" stroke="var(--symbol-innen, #fff)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'strich':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 8h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'kreis':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.4 2" />
        </svg>
      )
    case 'warnung':
      return (
        <svg {...p}>
          <path d="M8 1.6l6.6 12H1.4z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
          <path d="M8 6v3.6" stroke="var(--symbol-innen, #fff)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="11.7" r="0.9" fill="var(--symbol-innen, #fff)" />
        </svg>
      )
    case 'info':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M8 7.2v4.3" stroke="var(--symbol-innen, #fff)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.95" fill="var(--symbol-innen, #fff)" />
        </svg>
      )
    case 'hinweis':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 4.6v4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r="0.95" fill="currentColor" />
        </svg>
      )
    case 'frage':
      return (
        <svg {...p}>
          <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6.2 6.3a1.9 1.9 0 1 1 2.6 1.8c-.5.2-.8.6-.8 1.1v.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.6" r="0.85" fill="currentColor" />
        </svg>
      )
    case 'pfeil':
      return (
        <svg {...p}>
          <path d="M2.5 8a5.5 5.5 0 1 1 1.6 3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M1.8 9.8l2.3 2.4 2.4-2.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'schloss':
      return (
        <svg {...p}>
          <rect x="3" y="7" width="10" height="7.5" rx="1.5" fill="currentColor" />
          <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )
  }
}
