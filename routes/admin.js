const router = require('express').Router()
const db     = require('../db/init')
const bcrypt = require('bcryptjs')
const { requireAdmin, requireSuperAdmin } = require('../middleware/auth')

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const stats = {
    totalDramas:   db.prepare('SELECT COUNT(*) as c FROM dramas').get().c,
    totalEpisodes: db.prepare('SELECT COUNT(*) as c FROM episodes').get().c,
    totalUsers:    db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    totalViews:    db.prepare('SELECT SUM(views) as s FROM dramas').get().s || 0,
    byProvider:    db.prepare('SELECT provider, COUNT(*) as count FROM dramas GROUP BY provider_key').all(),
    recentDramas:  db.prepare('SELECT title, provider, created_at FROM dramas ORDER BY created_at DESC LIMIT 5').all(),
  }
  res.json(stats)
})

// GET /api/admin/users
router.get('/users', requireSuperAdmin, (req, res) => {
  const users = db.prepare('SELECT id,username,email,role,active,created_at,last_login FROM users ORDER BY created_at DESC').all()
  res.json(users)
})

// PATCH /api/admin/users/:id
router.patch('/users/:id', requireSuperAdmin, (req, res) => {
  const { role, active } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })
  if (user.role === 'superadmin' && req.user.id !== user.id) {
    return res.status(403).json({ error: 'Cannot modify another superadmin' })
  }
  if (role !== undefined)   db.prepare('UPDATE users SET role   = ? WHERE id = ?').run(role, user.id)
  if (active !== undefined) db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, user.id)
  res.json({ ok: true })
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireSuperAdmin, (req, res) => {
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  if (user.role === 'superadmin') return res.status(403).json({ error: 'Cannot delete superadmin' })
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// POST /api/admin/users/reset-password
router.post('/users/:id/reset-password', requireSuperAdmin, (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' })
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id)
  res.json({ ok: true })
})

module.exports = router
