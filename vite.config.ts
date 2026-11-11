/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

const paket = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

/**
 * Content-Security-Policy als Meta-Tag, nur im Produktions-Build für den Browser (Spezifikation 7.8).
 * Im Entwicklungsserver würde sie das Nachladen von Vite blockieren. Im Windows-Programm gilt die
 * CSP aus src-tauri/tauri.conf.json (7.6); ein zusätzlicher Meta-Tag sperrte dort die Brücke zu
 * Rust (ipc:). Die Tauri-CLI setzt TAURI_ENV_PLATFORM für ihren Build.
 */
const CSP = [
  "default-src 'self'",
  "connect-src 'self' https://cloudflare-dns.com https://dns.google",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function csp(): Plugin {
  return {
    name: 'sicherheitscheck-csp',
    apply: (_, { command }) => command === 'build' && !process.env.TAURI_ENV_PLATFORM,
    transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  }
}

export default defineConfig({
  plugins: [react(), csp()],
  define: {
    __VERSION__: JSON.stringify(paket.version),
  },
  // Fester Port für Vorschau und Browsertests; 4173 gehört dem Prozesslotsen
  preview: {
    port: 4181,
    strictPort: true,
  },
  worker: {
    format: 'es',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
