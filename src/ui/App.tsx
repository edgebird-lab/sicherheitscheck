import { APP_NAME, VERSION } from './marke'

export default function App() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Check nach DIN SPEC 27076 mit passiver Außenprüfung. Version {VERSION}.</p>
    </main>
  )
}
