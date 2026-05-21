const express     = require('express')
const helmet      = require('helmet')
const cors        = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit   = require('express-rate-limit')
const path        = require('path')

// Init DB first
require('./db/init')

const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting
app.use('/api/auth/login', rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many attempts' } }))
app.use('/api/', rateLimit({ windowMs: 60*1000, max: 300 }))

// Static files
app.use(express.static(path.join(__dirname, 'public')))

// Health check
app.get('/health', (_, res) => res.status(200).json({ status: 'ok' }))

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'))
app.use('/api/dramas', require('./routes/dramas'))
app.use('/api/admin',  require('./routes/admin'))

// ── Page Routes ───────────────────────────────────────────
app.get('/login',       (_, res) => res.sendFile(path.join(__dirname, 'public/login.html')))
app.get('/browse',      (_, res) => res.sendFile(path.join(__dirname, 'public/browse.html')))
app.get('/drama/:slug', (_, res) => res.sendFile(path.join(__dirname, 'public/drama.html')))
app.get('/admin',       (_, res) => res.sendFile(path.join(__dirname, 'public/admin.html')))
app.get('/admin/*path', (_, res) => res.sendFile(path.join(__dirname, 'public/admin.html')))
app.get('/',            (_, res) => res.sendFile(path.join(__dirname, 'public/index.html')))

// ── Error handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐉 NagaStream running at http://0.0.0.0:${PORT}`)
  console.log(`   Login: master / NagaStream@2026`)
  console.log(`   Admin: http://0.0.0.0:${PORT}/admin\n`)
})
