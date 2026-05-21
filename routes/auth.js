const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const db      = require('../db/init')
const { signToken } = require('../middleware/auth')

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND active = 1').get(username, username)
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id)

  const token = signToken(user)
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' })
  res.json({ ok: true, role: user.role, username: user.username })
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', (req, res) => {
  const token = req.cookies?.token
  if (!token) return res.json({ user: null })
  try {
    const jwt  = require('jsonwebtoken')
    const { JWT_SECRET } = require('../middleware/auth')
    const dec  = jwt.verify(token, JWT_SECRET)
    const user = db.prepare('SELECT id, username, email, role, avatar, created_at FROM users WHERE id = ?').get(dec.id)
    res.json({ user })
  } catch { res.json({ user: null }) }
})

// POST /api/auth/register (admin only creates users)
router.post('/register', (req, res) => {
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { username, email, password, role = 'user' } = req.body
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' })
  try {
    const hash = bcrypt.hashSync(password, 10)
    db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(username, email, hash, role)
    res.json({ ok: true })
  } catch (e) {
    res.status(400).json({ error: 'Username or email already exists' })
  }
})

module.exports = router
