# 🐉 NagaStream - Deploy ke Render

## Step-by-Step Guide

---

## STEP 1 — Upload Code ke GitHub

Kalau belum ada GitHub account, daftar dulu di [github.com](https://github.com)

### Install Git (kalau belum ada):
```bash
# Termux
pkg install git

# Ubuntu/Debian
sudo apt install git
```

### Init repo dan push:
```bash
cd nagastream-web

git init
git add .
git commit -m "🐉 NagaStream initial commit"

# Pergi github.com → New Repository → nama: nagastream
# Copy URL repo (contoh: https://github.com/USERNAME/nagastream.git)

git remote add origin https://github.com/USERNAME/nagastream.git
git branch -M main
git push -u origin main
```

---

## STEP 2 — Daftar Render

1. Pergi ke **[render.com](https://render.com)**
2. Klik **"Get Started for Free"**
3. Sign up dengan GitHub (lebih mudah)

---

## STEP 3 — Deploy dari Render Dashboard

1. Klik **"New +"** → **"Web Service"**
2. Connect GitHub repo **nagastream**
3. Render auto detect settings dari `render.yaml`

**Kalau nak set manual:**
| Setting | Value |
|---|---|
| Environment | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Plan | Free |

4. Klik **"Create Web Service"**

---

## STEP 4 — Set Environment Variables

Dalam Render dashboard → **Environment** tab:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (generate random string panjang) |
| `DB_PATH` | `/data/nagastream.db` |

---

## STEP 5 — Setup Persistent Disk (untuk Database)

1. Dashboard → **Disks** tab
2. Klik **"Add Disk"**
3. Setting:
   - Name: `nagastream-data`
   - Mount Path: `/data`
   - Size: 1 GB

---

## STEP 6 — Deploy!

- Klik **"Manual Deploy"** → **"Deploy latest commit"**
- Tunggu 2-3 minit...
- URL keluar macam: `https://nagastream.onrender.com`

---

## STEP 7 — Import Drama Data

Selepas deploy, pergi terminal Render atau run locally:

```bash
DB_PATH=/data/nagastream.db node scripts/import.js
```

Atau kalau nak import dari Render Shell:
1. Dashboard → **Shell** tab
2. Run: `node scripts/import.js`

---

## Login Selepas Deploy

| | |
|---|---|
| URL | `https://nagastream.onrender.com` |
| Username | `master` |
| Password | `NagaStream@2026` |

⚠️ **Tukar password selepas first login!**

---

## ⚠️ Nota Penting - Free Tier

- Free tier **sleep selepas 15 minit** idle
- First request selepas sleep ~30 saat lambat (cold start)
- Nak 24/7? Upgrade ke **Starter ($7/bulan)** atau guna UptimeRobot untuk ping setiap 10 minit

---

## Troubleshoot

**Build fail?**
- Check `npm install` log
- Pastikan `package.json` ada `"start": "node server.js"`

**DB error?**
- Pastikan persistent disk dah setup
- Check `DB_PATH` environment variable

**Can't login?**
- DB baru — SUPERADMIN auto create masa first run
- Username: `master`, Password: `NagaStream@2026`
