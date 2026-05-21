const jwt = require('jsonwebtoken')
const db  = require('../db/init')

const JWT_SECRET = process.env.JWT_SECRET || 'NagaStream_SuperSecret_JWT_2026!'

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

function requireAuth(req, res, next) {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1]
  if (!token) {
    if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    return res.redirect('/login')
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user    = db.prepare('SELECT id, username, role, email, avatar FROM users WHERE id = ? AND active = 1').get(decoded.id)
    if (!user) return res.redirect('/login')
    req.user = user
    next()
  } catch {
    res.clearCookie('token')
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Token expired' })
    res.redirect('/login')
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  })
}

function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  })
}

module.exports = { signToken, requireAuth, requireAdmin, requireSuperAdmin, JWT_SECRET }
