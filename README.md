# PromptForge

Enterprise AI Prompt Builder powered by Claude. Build, refine, save, and export production-grade AI prompts tailored to your role and context.

---

## Features

- **Streaming prompt generation** via Claude (SSE) with live token output
- **AI Enhance** — let Claude sharpen your task description before generating
- **Quality scoring** — automatic Clarity, Specificity, and Completeness metrics
- **9 built-in enterprise templates** across Engineering, Documentation, Security, and Reasoning categories
- **12 built-in role presets** (Application Developer, DBA, DevOps, Security Engineer, Solutions Architect, Technical Sales, and more) grouped by Engineering / Architecture / Business
- **Persona context** — select a Role or create a custom Persona; the context is injected into every generate call so prompts are tailored to your background and expertise
- **Save & load** — full prompt history in a local JSON store
- **Export** — file format (`.md`, `.txt`, `.json`) and MIME type driven by selected Output Format
- **Copy to clipboard** — works over both HTTPS and plain HTTP (Docker)
- **MongoDB-ready** — swap the JSON store for MongoDB with a single env variable

---

## Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY at minimum

# 3. Start the server
npm run dev          # development (nodemon watch)
# or
npm start            # production
```

Open [http://localhost:3000](http://localhost:3000).

On first startup the server seeds all built-in templates and role presets automatically.

---

## Environment Variables

Copy `.env.example` → `.env` and fill in the values. **Never commit `.env`.**

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Model used for generation & analysis |
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `APP_API_TOKEN` | No | — | Optional bearer token to protect write/AI routes |
| `DB_TYPE` | No | `json` | `json` (local file) or `mongodb` |
| `DATA_DIR` | No | `./data` | Path for JSON data files (JSON mode only) |
| `MONGODB_URI` | MongoDB only | — | e.g. `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | MongoDB only | `promptforge` | Database name |

---

## Running with Docker

### Using Docker Compose (recommended)

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env

docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Data is persisted in the `prompt-data` named volume across restarts and rebuilds.

### Single container

```bash
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env

docker build -t promptforge .

docker run -d \
  --name promptforge \
  -p 3000:3000 \
  --env-file .env \
  -v promptforge-data:/data \
  promptforge
```

### Rebuild after code changes

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Switching to MongoDB

PromptForge's database layer mirrors the MongoDB Node.js driver API. Swapping stores requires no code changes.

1. Update `.env`:

```dotenv
DB_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=promptforge
```

2. Install the driver:

```bash
npm install mongodb
```

3. Restart. Templates and role presets are re-seeded automatically (idempotent).

### With Docker Compose + MongoDB

Uncomment the `mongo` service and `mongo-data` volume in `docker-compose.yml`, then set `DB_TYPE=mongodb` and `MONGODB_URI=mongodb://mongo:27017` in `.env`.

---

## API Reference

### Prompts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/prompts` | List saved prompts (`?page=1&limit=20&sort=desc`) |
| `GET` | `/api/prompts/:id` | Get a single prompt |
| `POST` | `/api/prompts` | Save a prompt |
| `PUT` | `/api/prompts/:id` | Update a prompt |
| `DELETE` | `/api/prompts/:id` | Delete a prompt |

### Templates

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List templates (`?category=Engineering`) |
| `GET` | `/api/templates/:id` | Get a single template |
| `POST` | `/api/templates` | Create a custom template |
| `PUT` | `/api/templates/:id` | Update a custom template |
| `DELETE` | `/api/templates/:id` | Delete custom template (built-ins protected) |

### Roles

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/roles` | List role presets (`?category=Engineering`) |
| `GET` | `/api/roles/:id` | Get a single role |
| `POST` | `/api/roles` | Create a custom role |
| `DELETE` | `/api/roles/:id` | Delete custom role (built-ins protected) |

### Personas

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/personas` | List saved personas |
| `GET` | `/api/personas/:id` | Get a single persona |
| `POST` | `/api/personas` | Create a persona |
| `PUT` | `/api/personas/:id` | Update a persona |
| `DELETE` | `/api/personas/:id` | Delete a persona |

### AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/generate` | Generate prompt (SSE stream) |
| `POST` | `/api/ai/enhance` | AI-enhance a task description |

#### `POST /api/ai/generate` — Request body

```json
{
  "type": "system",
  "role": "You are a senior software architect…",
  "roleTraits": ["Security-focused", "Cloud-native expert"],
  "taskDescription": "Analyse the provided microservices diagram…",
  "tone": "Professional & Precise",
  "outputFormat": "Structured Markdown",
  "constraints": "Max 500 words",
  "targetModel": "claude-sonnet-4-6",
  "personaContext": "I am a senior platform engineer at a fintech SaaS company…"
}
```

`personaContext` is optional. When provided, the generator tailors the prompt's technical depth and assumptions to match that background.

#### SSE event types

```
data: {"type":"delta","text":"…"}
data: {"type":"complete","generatedPrompt":"…","qualityScore":94,"qualityMetrics":{"clarity":96,"specificity":91,"completeness":88}}
data: [DONE]
```

---

## Project Structure

```
prompt-builder/
├── src/
│   ├── app.js                  # Express app factory; registers all routes
│   ├── db/
│   │   ├── JsonStore.js        # Local JSON DB (MongoDB-compatible interface)
│   │   ├── MongoStore.js       # MongoDB adapter (swap-in, same interface)
│   │   └── index.js            # DB factory (reads DB_TYPE env var)
│   ├── middleware/
│   │   ├── apiSecurity.js      # Rate limiting + optional bearer token auth
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── ai.js               # /api/ai/generate (SSE) + /api/ai/enhance
│   │   ├── prompts.js          # /api/prompts/*
│   │   ├── templates.js        # /api/templates/*
│   │   ├── roles.js            # /api/roles/*
│   │   └── personas.js         # /api/personas/*
│   ├── services/
│   │   └── aiService.js        # Anthropic SDK — streaming generation, scoring, enhance
│   └── validation/
│       └── payloads.js         # Input sanitisation for all routes
├── seeds/
│   ├── templates.js            # 9 default enterprise prompt templates
│   └── roles.js                # 12 default role presets (Engineering/Architecture/Business)
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js              # Fetch wrappers (promptsApi, templatesApi, rolesApi, personasApi, aiApi)
│       └── main.js             # All UI logic, state management, SSE handling
├── data/                       # JSON data files (gitignored)
├── server.js                   # Entry point — connects DB, runs seeds, starts Express
├── Dockerfile
├── docker-compose.yml
├── .env.example                # Committed sample config
└── .env                        # NOT committed — real secrets
```

---

## Development Notes

- **JSON store** reads/writes on every mutation. Designed for single-user local use. Migrate to MongoDB for concurrent or high-volume deployments.
- **Seeding** runs on every startup but skips documents that already exist (fully idempotent). Safe to restart freely.
- **Frontend** uses ES modules with no build step. Assets are served directly by Express from `public/`.
- **Persona context** flows: UI state → `buildConfig()` → `POST /api/ai/generate` body → `validateAiGeneratePayload` → `buildGeneratorUserMessage` → Claude API. Removing a persona simply sends an empty string.
- **Export formats** map Output Format → file extension + MIME type: Structured Markdown → `.md`, Plain Text → `.txt`, JSON Schema → `.json`, Numbered List → `.txt`, Executive Report → `.md`.
