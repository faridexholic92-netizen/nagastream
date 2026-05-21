const router = require('express').Router()
const db     = require('../db/init')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// GET /api/dramas  — list with search/filter/pagination
router.get('/', (req, res) => {
  const { q = '', provider = '', genre = '', page = 1, limit = 24 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)
  const like   = `%${q}%`

  let where = 'WHERE 1=1'
  const params = []

  if (q)        { where += ' AND title LIKE ?';       params.push(like) }
  if (provider) { where += ' AND provider_key = ?';   params.push(provider) }
  if (genre)    { where += ' AND genres LIKE ?';       params.push(`%"${genre}"%`) }

  const total  = db.prepare(`SELECT COUNT(*) as c FROM dramas ${where}`).get(...params).c
  const dramas = db.prepare(
    `SELECT id, title, slug, provider, provider_key, synopsis, genres, total_episodes, cover, status, views
     FROM dramas ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, parseInt(limit), offset)

  dramas.forEach(d => { try { d.genres = JSON.parse(d.genres) } catch { d.genres = [] } })
  res.json({ dramas, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
})

// GET /api/dramas/providers — list available providers
router.get('/providers', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT provider_key, provider FROM dramas ORDER BY provider').all()
  res.json(rows)
})

// GET /api/dramas/genres — list all genres
router.get('/genres', (req, res) => {
  const rows  = db.prepare('SELECT genres FROM dramas').all()
  const set   = new Set()
  rows.forEach(r => { try { JSON.parse(r.genres).forEach(g => set.add(g)) } catch {} })
  res.json([...set].sort())
})

// GET /api/dramas/featured — top 10 by views
router.get('/featured', (req, res) => {
  const dramas = db.prepare(
    'SELECT id,title,slug,provider,cover,synopsis,total_episodes,views FROM dramas ORDER BY views DESC LIMIT 10'
  ).all()
  dramas.forEach(d => { try { d.genres = JSON.parse(d.genres) } catch { d.genres = [] } })
  res.json(dramas)
})

// GET /api/dramas/:slug
router.get('/:slug', (req, res) => {
  const drama = db.prepare('SELECT * FROM dramas WHERE slug = ?').get(req.params.slug)
  if (!drama) return res.status(404).json({ error: 'Not found' })
  try { drama.genres = JSON.parse(drama.genres) } catch { drama.genres = [] }

  const episodes = db.prepare(
    'SELECT id, number, title, url, locked, views FROM episodes WHERE drama_id = ? ORDER BY number ASC'
  ).all(drama.id)

  // increment view
  db.prepare('UPDATE dramas SET views = views + 1 WHERE id = ?').run(drama.id)

  res.json({ drama, episodes })
})

// ADMIN: POST /api/dramas  — create
router.post('/', requireAdmin, (req, res) => {
  const { title, slug, provider, provider_key, url, synopsis, genres, total_episodes, cover, status } = req.body
  try {
    const r = db.prepare(
      'INSERT INTO dramas (title,slug,provider,provider_key,url,synopsis,genres,total_episodes,cover,status) VALUES (?,?,?,?,?,?,?,?,?,?)'
    ).run(title, slug, provider, provider_key, url, synopsis, JSON.stringify(genres || []), total_episodes || 0, cover || null, status || 'ongoing')
    res.json({ ok: true, id: r.lastInsertRowid })
  } catch (e) { res.status(400).json({ error: e.message }) }
})

// ADMIN: DELETE /api/dramas/:id
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM dramas WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

module.exports = router
