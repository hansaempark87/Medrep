import { Hono } from 'hono'

const app = new Hono()

// API routes
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', service: 'MedRep Intelligence', version: '1.0.0' })
})

export default app
