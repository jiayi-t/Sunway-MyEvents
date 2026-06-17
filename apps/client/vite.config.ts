import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

// mkcert certs only exist locally for LAN phone testing, not present in CI
const certsExist = fs.existsSync('certs/key.pem') && fs.existsSync('certs/cert.pem')

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
