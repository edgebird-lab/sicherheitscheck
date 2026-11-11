// Nimmt Formatmuster der DoH-Anbieter auf (Spezifikation 9.10): öffentliche DNS-Antworten
// bekannter Namen, unverändert als JSON unter testdaten/dns/aufgenommen/.
// NUR VON HAND STARTEN (Live-Abfragen): node scripts/fixtures-aufnehmen.mjs
// Tests und CI nutzen diese Dateien höchstens als Formatbeispiel und fragen nie selbst ab.
import { mkdir, writeFile } from 'node:fs/promises'

const ANFRAGEN = [
  ['google.com', 'TXT'],
  ['google.com', 'CAA'],
  ['gmail.com', 'MX'],
  ['dnssec-failed.org', 'SOA'],
  ['dnssec-failed.org', 'SOA', true],
]

const ANBIETER = {
  cloudflare: (name, typ, cd) => `https://cloudflare-dns.com/dns-query?name=${name}&type=${typ}${cd ? '&cd=1' : ''}`,
  google: (name, typ, cd) => `https://dns.google/resolve?name=${name}&type=${typ}${cd ? '&cd=1' : ''}&edns_client_subnet=0.0.0.0/0`,
}

const ziel = 'testdaten/dns/aufgenommen'
const tag = new Date().toISOString().slice(0, 10)
await mkdir(ziel, { recursive: true })

for (const [anbieter, adresse] of Object.entries(ANBIETER)) {
  for (const [name, typ, cd] of ANFRAGEN) {
    const url = adresse(name, typ, cd)
    const antwort = await fetch(url, { headers: anbieter === 'cloudflare' ? { accept: 'application/dns-json' } : {} })
    const text = await antwort.text()
    const datei = `${ziel}/${tag}-${anbieter}-${name}-${typ}${cd ? '-cd' : ''}.json`
    await writeFile(datei, JSON.stringify(JSON.parse(text), null, 2) + '\n')
    console.log(antwort.status, datei)
  }
}
