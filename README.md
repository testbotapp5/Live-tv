# 📺 Telegram Live TV Bot

Professional production-ready Telegram bot that allows users to watch Live TV channels from any country directly inside Telegram via Web App.

## ✨ Features

- **Live TV** — Opens [famelack.com](https://famelack.com) as a Telegram Web App (with automatic URL fallback)
- **Multi-language** — 15+ languages, auto-detected from user's country
- **Country selection** — Paginated country list with search, 100+ countries
- **Admin Panel** — Full inline keyboard admin panel with all management features
- **Broadcast** — Send any message type to all users with progress tracking
- **Statistics** — Detailed user & system analytics
- **Security** — Rate limiting, flood protection, ban system, SQL injection protection
- **Caching** — In-memory cache with configurable TTL
- **Logging** — Winston with daily rotating log files (console + file)
- **Health Check** — Express HTTP server for uptime monitoring

## 🗂 Project Structure

```
telegram-bot/
├── bot.js                   # Main entry point
├── package.json
├── .env.example
├── config/
│   └── index.js             # Centralized configuration
├── database/
│   └── index.js             # SQLite (better-sqlite3) + all DB helpers
├── locales/                 # Translation files (JSON)
│   ├── en.json              # English
│   ├── ru.json              # Russian
│   ├── uz.json              # Uzbek
│   ├── tr.json              # Turkish
│   ├── ar.json              # Arabic
│   ├── fr.json              # French
│   ├── de.json              # German
│   ├── es.json              # Spanish
│   ├── pt.json              # Portuguese
│   ├── it.json              # Italian
│   ├── ja.json              # Japanese
│   ├── ko.json              # Korean
│   ├── zh.json              # Chinese
│   ├── hi.json              # Hindi
│   └── fa.json              # Persian
├── handlers/
│   ├── start.js             # /start + country selection + main menu
│   ├── help.js              # /help
│   ├── about.js             # /about
│   ├── language.js          # /language
│   ├── ping.js              # /ping
│   ├── panel.js             # Admin panel (/panel)
│   ├── broadcast.js         # Broadcast system
│   ├── users.js             # User search & messaging
│   └── ban.js               # Ban/unban
├── middlewares/
│   ├── auth.js              # User auth, ban check, admin check
│   ├── rateLimit.js         # Rate limiting + flood protection
│   ├── language.js          # Auto language resolution
│   └── errorHandler.js      # Global error handler
├── services/
│   ├── logger.js            # Winston logger
│   ├── cache.js             # node-cache wrapper
│   ├── analytics.js         # Analytics tracking
│   └── health.js            # Express health server
├── utils/
│   ├── i18n.js              # Translation helper (dynamic locale loading)
│   ├── countries.js         # 100+ countries with flags & language codes
│   ├── keyboard.js          # All inline keyboard builders
│   └── helpers.js           # Utility functions
└── logs/                    # Auto-created log directory
```

## 🚀 Quick Start

### 1. Install dependencies

```bash
cd telegram-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start the bot

```bash
# Production
npm start

# Development (with auto-restart)
npm run dev
```

## ⚙️ Environment Variables

| Variable           | Description                        | Default          |
|--------------------|------------------------------------|------------------|
| `TOKEN`            | Telegram bot token (required)      | —                |
| `ADMIN_IDS`        | Comma-separated admin user IDs     | —                |
| `WEB_APP_URL`      | Web App URL                        | https://famelack.com |
| `BOT_NAME`         | Bot display name                   | WATCH TV/RADIO   |
| `PORT`             | Health check server port           | 3000             |
| `DB_PATH`          | SQLite database path               | ./database/bot.db |
| `LOG_LEVEL`        | Logging level                      | info             |
| `LOG_DIR`          | Log files directory                | ./logs           |
| `CACHE_TTL`        | Cache TTL in seconds               | 300              |
| `RATE_LIMIT_MAX`   | Max requests per window            | 30               |
| `RATE_LIMIT_WINDOW`| Rate limit window in seconds       | 60               |
| `NODE_ENV`         | Environment                        | production       |

## 🌐 Adding a New Language

1. Create a new file in `locales/` (e.g., `locales/nl.json`)
2. Copy the structure from `locales/en.json` and translate all values
3. Add the language mapping in `utils/countries.js` if needed
4. **No code changes required** — locales are loaded dynamically

## 👮 Admin Commands

- `/panel` — Open admin panel (admins only)

### Admin Panel Sections

| Section       | Description                                    |
|---------------|------------------------------------------------|
| 📊 Statistics  | User counts, system info, DB size, uptime      |
| 📢 Broadcast   | Send any message type to all users             |
| 👥 Users       | Paginated user list with details               |
| 📈 Analytics   | Activity analytics                             |
| 🚫 Ban         | Ban user by ID with optional reason            |
| ✅ Unban        | Unban user by ID                               |
| 🔍 Search User | Search by ID, username, or name                |
| 📨 Send Message| Send direct message to specific user           |
| ⚙️ Settings    | View current bot configuration                 |
| 📂 Database    | Database info and size                         |
| 📝 Logs        | List log files                                 |
| ♻️ Restart     | Graceful bot restart                           |
| 💾 Backup      | Database backup info                           |
| 📤 Export      | Export all users as CSV                        |
| 🔄 Cache       | Flush cache and reload locales                 |

## 📡 Health Check Endpoints

| Endpoint  | Description          |
|-----------|----------------------|
| `/health` | Bot health & uptime  |
| `/stats`  | User & system stats  |
| `/ping`   | Simple ping          |

## 🔒 Security Features

- **Rate limiting**: Configurable requests per window per user
- **Flood protection**: Burst detection (5 messages in 3 seconds)
- **Ban system**: Permanent user ban with reason tracking
- **Admin-only routes**: All admin functions check `ADMIN_IDS`
- **SQL injection protection**: Parameterized queries via better-sqlite3
- **Error isolation**: All handlers wrapped in try/catch

## 📦 Tech Stack

- **Runtime**: Node.js 18+ (ESM)
- **Bot framework**: grammY
- **Database**: SQLite via better-sqlite3 (WAL mode)
- **Cache**: node-cache
- **Logging**: winston + winston-daily-rotate-file
- **HTTP**: Express (health check)
- **HTTP client**: axios
- **Config**: dotenv

## 🗃 Database Tables

| Table            | Purpose                        |
|------------------|--------------------------------|
| `users`          | User profiles, language, stats |
| `settings`       | Key-value bot settings         |
| `admins`         | Admin user registry            |
| `broadcast_logs` | Broadcast history & results    |
| `banned_users`   | Ban records with reasons       |
| `analytics`      | User action tracking           |
| `cache`          | Persistent cache (reserved)    |

## 📋 Broadcast Support

Supports all Telegram message types via `copyMessage`:
- Text, Photo, Video, Audio, Voice, Animation, Sticker
- Document, Contact, Location, Venue, Poll, Invoice
- Caption, Markdown, HTML formatting
- Inline keyboards, Reply keyboards
- Progress tracking with cancel option
- Failed user logging

## 📄 License

MIT
