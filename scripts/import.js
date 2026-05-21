/**
 * Import drama data from NagaStream scraper TXT files → SQLite DB
 * Usage: node scripts/import.js
 */
const fs   = require('fs')
const path = require('path')
const db   = require('../db/init')

const SCRAPER_OUTPUT = path.join(__dirname, '../../nagastream/output')

const PROVIDERS = {
  dramabox:  { name: 'DramaBox',            key: 'dramabox' },
  reelshort: { name: 'ReelShort',           key: 'reelshort' },
  shorttv:   { name: 'ShortTV (ShortMax)',   key: 'shorttv' },
  goodshort: { name: 'GoodShort',           key: 'goodshort' },
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80)
}

function parseTxt(content) {
  const lines   = content.split('\n')
  const drama   = {}
  const episodes = []
  let inEpList  = false

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('=') || line.startsWith('-')) {
      if (line.startsWith('-') && lines[lines.indexOf(raw) + 1]?.trim() === 'EPISODE LIST') inEpList = false
      if (line === 'EPISODE LIST') inEpList = true
      continue
    }

    if (!inEpList) {
      const m = line.match(/^(\w[\w\s]+?)\s*:\s*(.+)$/)
      if (m) {
        const key = m[1].trim().toLowerCase().replace(/\s+/g, '_')
        drama[key] = m[2].trim()
      }
    } else {
      // EP 001 | Episode 1 | https://...
      // EP 001 [LOCKED/VIP] | Episode 1 | https://...
      const epMatch = line.match(/^EP\s+(\d+)(\s*\[LOCKED\/VIP\])?\s*\|\s*(.+?)\s*\|\s*(.*)$/)
      if (epMatch) {
        episodes.push({
          number: parseInt(epMatch[1]),
          locked: !!epMatch[2],
          title:  epMatch[3].trim(),
          url:    epMatch[4].trim(),
        })
      }
    }
  }

  return { drama, episodes }
}

function importProvider(dirName) {
  const config = PROVIDERS[dirName]
  if (!config) return

  const dirPath = path.join(SCRAPER_OUTPUT, dirName)
  if (!fs.existsSync(dirPath)) {
    console.log(`[Import] Skipping ${dirName} — folder not found`)
    return
  }

  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.txt'))
  console.log(`[Import] ${config.name}: ${files.length} files`)

  let imported = 0, skipped = 0

  const insertDrama   = db.prepare(`
    INSERT OR IGNORE INTO dramas (title, slug, provider, provider_key, url, synopsis, genres, total_episodes, status)
    VALUES (@title, @slug, @provider, @provider_key, @url, @synopsis, @genres, @total_episodes, @status)
  `)
  const insertEpisode = db.prepare(`
    INSERT OR IGNORE INTO episodes (drama_id, number, title, url, locked)
    VALUES (@drama_id, @number, @title, @url, @locked)
  `)

  const importAll = db.transaction((files) => {
    for (const file of files) {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf8')
      const { drama: d, episodes } = parseTxt(content)

      if (!d.title) { skipped++; continue }

      const slug = slugify(d.title)
      const res  = insertDrama.run({
        title:          d.title,
        slug,
        provider:       config.name,
        provider_key:   config.key,
        url:            d.url || '',
        synopsis:       d.synopsis || '',
        genres:         JSON.stringify((d.genre || '').split(',').map(g => g.trim()).filter(Boolean)),
        total_episodes: parseInt(d.episodes) || episodes.length,
        status:         'completed',
      })

      if (res.changes === 0) { skipped++; continue }

      const drama_id = res.lastInsertRowid
      for (const ep of episodes) {
        insertEpisode.run({ drama_id, number: ep.number, title: ep.title, url: ep.url, locked: ep.locked ? 1 : 0 })
      }
      imported++
    }
  })

  importAll(files)
  console.log(`[Import] ${config.name}: ✅ ${imported} imported, ⏭ ${skipped} skipped`)
}

console.log('\n🐉 NagaStream — Importing drama data...\n')
for (const key of Object.keys(PROVIDERS)) {
  importProvider(key)
}

const total = db.prepare('SELECT COUNT(*) as c FROM dramas').get().c
const eps   = db.prepare('SELECT COUNT(*) as c FROM episodes').get().c
console.log(`\n✅ Done! Database now has ${total} dramas and ${eps} episodes.\n`)
