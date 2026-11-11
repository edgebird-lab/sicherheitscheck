import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Modaler Dialog; schließt mit Escape über `onSchliessen`. Der Aufrufer blendet ihn aus, indem er ihn nicht mehr rendert. */
export function Dialog({ titel, children, onSchliessen, breit }: { titel: string; children: ReactNode; onSchliessen: () => void; breit?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`dialog${breit ? ' dialog-breit' : ''}`}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault()
        onSchliessen()
      }}
    >
      <h2 id={id}>{titel}</h2>
      {children}
    </dialog>
  )
}
