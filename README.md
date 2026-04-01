# PromptForge

Enterprise AI Prompt Builder powered by Claude. Build, refine, save, and export production-grade prompts for AI-powered applications.

---

## Features

- **Streaming prompt generation** via Claude (SSE)
- **AI Enhance** — let Claude sharpen your task description before generating
- **Quality scoring** — automatic Clarity, Specificity, and Completeness metrics
- **6 built-in enterprise templates** (Code Review, Architecture Analysis, Security Audit, and more)
- **Save & load** — full prompt history in a local JSON store
- **One-click export** to `.md`
- **MongoDB-ready** — swap the JSON store for MongoDB with a single env variable

---

## Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and set your ANTHROPIC_API_KEY

# 3. Start the server
npm run dev          # development (nodemon watch)
# or
npm start            # production
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` → `.env` and fill in the values. **Never commit `.env`.**

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-6` | Model used for generation & analysis |
| `PORT` | No | `3000` | HTTP port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DB_TYPE` | No | `json` | `json` (local) or `mongodb` |
| `DATA_DIR` | No | `./data` | Path for JSON data files (JSON mode only) |
| `MONGODB_URI` | MongoDB only | — | e.g. `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | MongoDB only | `promptforge` | Database name |

---

## Running with Docker

### Build and run (single container)

```bash
# Copy and configure your env file
cp .env.example .env
# Set ANTHROPIC_API_KEY in .env

# Build the image
docker build -t promptforge .

# Run with a named volume so JSON data persists
docker run -d \
  --name promptforge \
  -p 3000:3000 \
  --env-file .env \
  -v promptforge-data:/data \
  promptforge
```

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

Data is persisted in the `prompt-data` named volume across restarts.

---

## Switching to MongoDB

PromptForge's database layer is a thin abstraction that mirrors the MongoDB Node.js driver API. To migrate:

1. Set the following in `.env`:

```dotenv
DB_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=promptforge
```

2. Install the MongoDB driver:

```bash
npm install mongodb
```

3. Restart the server. Templates will be re-seeded automatically.

The `data/` directory and `MongoStore.js` are designed so that all document schemas (`_id` as UUID strings, `createdAt`/`updatedAt` ISO timestamps, array/nested fields) are directly compatible with MongoDB without any migration script.

### With Docker Compose + MongoDB

Uncomment the `mongo` service and `mongo-data` volume in `docker-compose.yml`, then update your `.env` to `DB_TYPE=mongodb` and `MONGODB_URI=mongodb://mongo:27017`.

---

## API Reference

### Prompts

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/prompts` | List saved prompts (`?page=1&limit=20&sort=desc`) |
| `GET` | `/api/prompts/:id` | Get a single prompt |
| `POST` | `/api/prompts` | Create a prompt |
| `PUT` | `/api/prompts/:id` | Update a prompt |
| `DELETE` | `/api/prompts/:id` | Delete a prompt |

### Templates

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/templates` | List templates (`?category=Engineering`) |
| `GET` | `/api/templates/:id` | Get a single template |
| `POST` | `/api/templates` | Create a custom template |
| `PUT` | `/api/templates/:id` | Update a custom template |
| `DELETE` | `/api/templates/:id` | Delete a custom template (built-ins protected) |

### AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/generate` | Generate prompt (SSE stream) |
| `POST` | `/api/ai/enhance` | AI-enhance a task description |

#### POST `/api/ai/generate` — Request body

```json
{
  "type": "system",
  "role": "You are a senior software architect…",
  "roleTraits": ["Security-focused", "Cloud-native expert"],
  "taskDescription": "Analyse the provided microservices diagram…",
  "tone": "Professional & Precise",
  "outputFormat": "Structured Markdown",
  "constraints": "Max 500 words",
  "targetModel": "claude-sonnet-4-6"
}
```

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
│   ├── app.js                  # Express app factory
│   ├── db/
│   │   ├── JsonStore.js        # Local JSON DB (MongoDB-compatible interface)
│   │   ├── MongoStore.js       # MongoDB adapter (swap-in)
│   │   └── index.js            # DB factory (reads DB_TYPE from env)
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── ai.js               # /api/ai/*
│   │   ├── prompts.js          # /api/prompts/*
│   │   └── templates.js        # /api/templates/*
│   └── services/
│       └── aiService.js        # Anthropic SDK integration
├── seeds/
│   └── templates.js            # Default enterprise templates
├── public/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── api.js              # Fetch wrappers
│       └── main.js             # UI logic & state
├── data/                       # JSON data files (gitignored)
├── server.js                   # Entry point
├── Dockerfile
├── docker-compose.yml
├── .env.example                # Committed — sample config
└── .env                        # NOT committed — real secrets
```

---

## Development Notes

- The JSON store reads/writes synchronously on every mutation. It is designed for a single-user local tool. For concurrent or high-volume use, migrate to MongoDB.
- Template seeding runs on every startup but skips documents that already exist (idempotent).
- The frontend uses ES modules (no build step required). All assets are served directly by Express from `public/`.
