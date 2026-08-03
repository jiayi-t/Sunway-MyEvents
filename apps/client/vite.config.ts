import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import fs from 'fs'

// mkcert certs only exist locally for LAN phone testing, not present in CI
const certsExist = fs.existsSync('certs/key.pem') && fs.existsSync('certs/cert.pem')

// the release name ties a stack trace to the sourcemaps uploaded for that build
const release = process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || process.env.GITHUB_SHA || 'dev'

//checks if the sentry environment variables are set, if not, sentry upload is disabled
const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
)

export default defineConfig({
  define: {
    __SENTRY_RELEASE__: JSON.stringify(release),
  },
  build: {
    // 'hidden' emits the maps but omits the sourceMappingURL comment, so browsers do not fetch them and the original source stays private
    sourcemap: 'hidden',
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(sentryUploadEnabled ? [sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: release },
      sourcemaps: {
        // delete the maps from dist after upload so they would not sit in a guessable URL (index.js.map) )
        filesToDeleteAfterUpload: ['**/*.map'],
      },
    })] : []),
  ],
  server: {
    // expose on LAN so phones can connect by IP
    host: true, 
    ...(certsExist ? {
      https: {
        // mkcert certs, required for camera access (getUserMedia) on non-localhost origins
        key: fs.readFileSync('certs/key.pem'),
        cert: fs.readFileSync('certs/cert.pem'),
      },
    } : {}),
    proxy: {
      // forward to Express server-side so the browser avoids mixed-content blocks (HTTPS -> HTTP)
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
})
