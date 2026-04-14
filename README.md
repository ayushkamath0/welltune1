# 🌿 WellTune

**WellTune** is a wellness-first social health application for building and sharing workout/mindfulness routines without toxic competitive pressure.

---

## ✨ Features

| Feature | Details |
|---|---|
| **JWT Auth** | Signup / Login with hashed passwords (`bcryptjs`) |
| **Onboarding Survey** | 3-step wizard — goal, experience, frequency |
| **Routine CRUD** | Create, edit, delete playlists with ordered steps |
| **Player** | Step-through interface with circular countdown timer |
| **Mood Journal** | Log how you felt post-session; no scores, only celebrations |
| **Recommendations** | SQL-based: your goal → matching playlist category |
| **Social** | Follow users, browse community routines |
| **Comments** | Keyword-moderated to keep interactions kind |

---

## 🗂 File Structure

```
welltune/
├── schema.sql            ← MySQL schema + seed
├── server.js             ← Express API (single file)
├── package.json          ← Backend dependencies
├── .env.example          ← Environment variable template
├── Dockerfile.api        ← API container
├── docker-compose.yml    ← MySQL + API + Client (optional)
├── .gitignore
└── client/
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── tsconfig.json
    ├── package.json       ← Frontend dependencies
    ├── Dockerfile.client
    └── src/
        ├── main.tsx
        ├── index.css
        └── App.tsx        ← Entire React UI (single file)
```

---

## 🚀 Quick Start — Local Development

### Prerequisites
- Node.js 18+
- MySQL 8 running locally **or** Docker Desktop

---

### Option A — Docker (recommended, easiest)

```bash
# 1. Clone and enter the project
git clone https://github.com/your-handle/welltune.git
cd welltune

# 2. Start everything (MySQL + API + client dev server)
docker-compose up --build
```

Open **http://localhost:5173** in your browser.

> ⚠️ The first run initialises the DB from `schema.sql` automatically.

---

### Option B — Manual (MySQL already running)

#### 1. Database

```bash
mysql -u root -p < schema.sql
```

This creates the `welltune` database, all tables, and a demo user:
- Email: `demo@welltune.app`
- Password: `demo1234`

#### 2. Backend

```bash
# Copy env template
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET

npm install
npm run dev          # uses node --watch for auto-reload
# API listening on http://localhost:4000
```

#### 3. Frontend

```bash
cd client

# Create frontend env
echo "VITE_API_URL=http://localhost:4000/api" > .env

npm install
npm run dev
# Opens http://localhost:5173
```

---

## 🌍 Production Build

```bash
# Build the React SPA
cd client && npm run build
# Serve /client/dist with any static host (Vercel, Netlify, nginx)

# The API is a plain Node process — deploy to Fly.io, Railway, Render, etc.
# Set all env vars from .env.example in your platform's dashboard.
```

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Express listen port |
| `JWT_SECRET` | *(required)* | Secret for signing JWTs — use a long random string in production |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `welltune` | MySQL user |
| `DB_PASS` | `welltune_pass` | MySQL password |
| `DB_NAME` | `welltune` | MySQL database name |
| `CLIENT_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `VITE_API_URL` | `http://localhost:4000/api` | API base URL (frontend) |

---

## 🗄 API Reference

### Auth
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/signup` | — | `{ username, email, password }` |
| POST | `/api/auth/login` | — | `{ email, password }` |
| GET | `/api/auth/me` | ✅ | — |

### Survey
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/survey` | ✅ | `{ goal, experience, days_per_week }` |
| GET | `/api/survey` | ✅ | — |

### Playlists
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/playlists` | ✅ | `?category=` optional |
| GET | `/api/playlists/mine` | ✅ | Current user's routines |
| GET | `/api/playlists/recommended` | ✅ | SQL-matched to user goal |
| GET | `/api/playlists/:id` | ✅ | Full detail with steps & comments |
| POST | `/api/playlists` | ✅ | `{ title, description, category, is_public, steps[] }` |
| PUT | `/api/playlists/:id` | ✅ | Same shape; replaces steps |
| DELETE | `/api/playlists/:id` | ✅ | Owner only |

### Mood Logs
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/mood` | ✅ | `{ playlist_id, mood, note }` |
| GET | `/api/mood` | ✅ | Last 30 logs |

### Social
| Method | Path | Auth |
|---|---|---|
| POST | `/api/follow/:id` | ✅ |
| DELETE | `/api/follow/:id` | ✅ |
| GET | `/api/follow/status/:id` | ✅ |
| GET | `/api/users/:id/followers` | ✅ |
| GET | `/api/users/:id/following` | ✅ |
| GET | `/api/users/:id/playlists` | ✅ |

### Comments
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/api/playlists/:id/comments` | ✅ | `{ body }` |
| DELETE | `/api/comments/:id` | ✅ | Own comment only |

---

## 💡 Design Philosophy

- **Non-competitive** — no points, no leaderboards. Completions are celebrated with a congratulations screen and mood log.
- **Community-driven** — public routines are discoverable and commentable. All comments pass through a keyword moderation filter before saving.
- **Recommendation engine** — pure SQL: `WHERE category = <user_goal>`. No external ML service needed.
- **Wellness-first UI** — calm emerald palette, generous white space, DM Sans typography, zero dark patterns.

---

## 🧩 Tech Stack

| Layer | Tech |
|---|---|
| Database | MySQL 8 (`mysql2`) |
| Backend | Node.js + Express |
| Auth | JWT (`jsonwebtoken`) + bcryptjs |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v3 |
| Icons | lucide-react |
| Container | Docker + docker-compose |

---

## 📄 License

MIT — use freely, stay well. 🌿
