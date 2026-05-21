/* ── NagaStream Frontend App ──────────────────────────── */
const NS = {
  user: null,

  // ── Toast ──────────────────────────────────────────────
  toast(msg, type = 'info', duration = 3000) {
    const c = document.getElementById('toast-container')
    if (!c) return
    const t = document.createElement('div')
    t.className = `toast ${type}`
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
    t.innerHTML = `<span>${icon}</span><span>${msg}</span>`
    c.appendChild(t)
    setTimeout(() => t.remove(), duration)
  },

  // ── API helper ─────────────────────────────────────────
  async api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  },

  // ── Auth ───────────────────────────────────────────────
  async loadUser() {
    try {
      const d = await this.api('/auth/me')
      this.user = d.user
    } catch { this.user = null }
    return this.user
  },

  async logout() {
    await this.api('/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  },

  // ── Navbar ─────────────────────────────────────────────
  initNavbar() {
    const navbar = document.getElementById('navbar')
    if (!navbar) return

    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 10)
    })

    // Avatar dropdown
    const avatar = document.getElementById('navAvatar')
    const dropdown = document.getElementById('navDropdown')
    if (avatar && dropdown) {
      avatar.addEventListener('click', (e) => {
        e.stopPropagation()
        dropdown.classList.toggle('open')
      })
      document.addEventListener('click', () => dropdown.classList.remove('open'))
    }

    // Search
    const searchInput = document.getElementById('navSearch')
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
          window.location.href = `/browse?q=${encodeURIComponent(searchInput.value.trim())}`
        }
      })
    }

    // Show username
    if (this.user) {
      const uEl = document.getElementById('navUsername')
      if (uEl) uEl.textContent = this.user.username
      const avatarEl = document.getElementById('navAvatarInitial')
      if (avatarEl) avatarEl.textContent = this.user.username[0].toUpperCase()
      const adminLink = document.getElementById('adminLink')
      if (adminLink && ['admin','superadmin'].includes(this.user.role)) {
        adminLink.classList.remove('hidden')
      }
    }
  },

  // ── Drama Card ─────────────────────────────────────────
  makeDramaCard(drama) {
    const genres  = Array.isArray(drama.genres) ? drama.genres : []
    const badgeCls = `badge-${drama.provider_key || 'dramabox'}`
    const thumb   = drama.cover
      ? `<img src="${drama.cover}" alt="${this.esc(drama.title)}" loading="lazy">`
      : `<div class="no-cover"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"/></svg><span style="font-size:.7rem">${this.esc(drama.title)}</span></div>`

    return `
    <div class="drama-card" onclick="window.location.href='/drama/${drama.slug}'">
      <div class="drama-card-thumb">
        ${thumb}
        <div class="drama-card-overlay">
          <div class="drama-card-play">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <span class="provider-badge ${badgeCls}">${drama.provider_key||''}</span>
      </div>
      <div class="drama-card-info">
        <div class="drama-card-title truncate">${this.esc(drama.title)}</div>
        <div class="drama-card-meta">
          <span>${drama.total_episodes || '?'} eps</span>
          <span>${drama.views || 0} views</span>
        </div>
      </div>
    </div>`
  },

  esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  },

  // ── Pagination ─────────────────────────────────────────
  makePagination(current, total, onClick) {
    if (total <= 1) return ''
    let html = '<div class="pagination">'
    html += `<button class="page-btn" ${current<=1?'disabled':''} onclick="${onClick}(${current-1})">&#8592;</button>`

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current-2 && i <= current+2)) {
        html += `<button class="page-btn ${i===current?'active':''}" onclick="${onClick}(${i})">${i}</button>`
      } else if (i === current-3 || i === current+3) {
        html += '<span style="color:var(--text3);padding:0 .25rem">…</span>'
      }
    }
    html += `<button class="page-btn" ${current>=total?'disabled':''} onclick="${onClick}(${current+1})">&#8594;</button>`
    html += '</div>'
    return html
  },
}
