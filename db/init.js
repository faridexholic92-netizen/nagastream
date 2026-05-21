const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')

// Render persistent disk mounts at /data, fallback to local for dev
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'nagastream.db')
const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Tables ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'user',   -- 'superadmin' | 'admin' | 'user'
    avatar      TEXT    DEFAULT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login  TEXT    DEFAULT NULL
  );

  CREATE TABLE IF NOT EXISTS dramas (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    title         TEXT    NOT NULL,
    slug          TEXT    UNIQUE NOT NULL,
    provider      TEXT    NOT NULL,
    provider_key  TEXT    NOT NULL,
    url           TEXT    NOT NULL,
    synopsis      TEXT    DEFAULT '',
    genres        TEXT    DEFAULT '[]',
    total_episodes INTEGER DEFAULT 0,
    cover         TEXT    DEFAULT NULL,
    status        TEXT    DEFAULT 'ongoing',   -- 'ongoing' | 'completed'
    views         INTEGER DEFAULT 0,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    drama_id   INTEGER NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
    number     INTEGER NOT NULL,
    title      TEXT    NOT NULL,
    url        TEXT    NOT NULL,
    locked     INTEGER NOT NULL DEFAULT 0,
    views      INTEGER DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(drama_id, number)
  );

  CREATE TABLE IF NOT EXISTS watchlist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drama_id   INTEGER NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, drama_id)
  );

  CREATE TABLE IF NOT EXISTS watch_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drama_id   INTEGER NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
    episode_id INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    watched_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_dramas_provider   ON dramas(provider_key);
  CREATE INDEX IF NOT EXISTS idx_dramas_slug       ON dramas(slug);
  CREATE INDEX IF NOT EXISTS idx_episodes_drama    ON episodes(drama_id);
`)

// ── Seed SUPERADMIN ──────────────────────────────────────
function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('master')
  if (!existing) {
    const hash = bcrypt.hashSync('NagaStream@2026', 10)
    db.prepare(`
      INSERT INTO users (username, email, password, role)
      VALUES (?, ?, ?, ?)
    `).run('master', 'master@nagastream.tv', hash, 'superadmin')
    console.log('[DB] SUPERADMIN created: master / NagaStream@2026')
  }
}
seedAdmin()

module.exports = db
