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
        // Only route /api/* to the worker, let everything else be served as static
        writeFileSync('dist/_routes.json', JSON.stringify({
          version: 1,
          include: ["/api/*"],
          exclude: []
        }))
      }
    }
  ],
  build: {
    outDir: 'dist'
  }
})
