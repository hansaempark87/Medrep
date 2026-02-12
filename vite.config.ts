import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'
import { writeFileSync } from 'fs'

export default defineConfig({
  plugins: [
    build({
      entry: 'src/index.tsx'
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    }),
    {
      name: 'fix-routes',
      closeBundle() {
        // Route everything to the worker (API + HTML pages)
        writeFileSync('dist/_routes.json', JSON.stringify({
          version: 1,
          include: ["/*"],
          exclude: []
        }))
      }
    }
  ],
  build: {
    outDir: 'dist'
  }
})
