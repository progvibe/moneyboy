# 🌙 **Moneyboy**

### _Financial Intelligence Dashboard_

A beautifully dark, Tokyo Night–themed dashboard and AI-driven financial intelligence tool built with **Next.js 15**, **Drizzle ORM**, **PlanetScale Postgres**, and modern UI components.

---

## 🌐 Overview

**Moneyboy** is a public, no-auth financial intelligence application.
It provides:

- A sleek **market overview dashboard**
- **Breaking news** with sentiment badges
- A customizable **watchlist**
- Macro **economic indicators**
- Sector-level **AI sentiment analysis**
- (Coming soon) A full **search + GPT-style financial analysis engine** powered by embeddings and LLM summarization

Inspired by Bloomberg and powered by a modern, serverless stack — Moneyboy aims to make financial insights accessible, beautiful, and fast.

---

## 🎨 Tokyo Night Theme

The entire application uses the Tokyo Night palette for a cohesive dark aesthetic:

| Purpose       | Color     |
| ------------- | --------- |
| Background    | `#1a1b26` |
| Surfaces      | `#24283b` |
| Panels        | `#1f2335` |
| Accent Blue   | `#7aa2f7` |
| Accent Cyan   | `#2ac3de` |
| Accent Purple | `#bb9af7` |
| Accent Green  | `#9ece6a` |
| Accent Red    | `#f7768e` |
| Text Primary  | `#c0caf5` |
| Text Muted    | `#a9b1d6` |
| Borders       | `#414868` |

The theme is fully integrated into the Tailwind config and shadcn/ui components.

---

## 🏗️ Tech Stack

### **Frontend**

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** components
- Fully responsive Tokyo Night interface

### **Backend**

- **Drizzle ORM** (PostgreSQL dialect)
- **postgres.js** DB driver
- **PlanetScale Postgres** single-node cluster

### **AI / Data Pipeline**

_(coming soon)_

- Embedding generation (OpenAI / other)
- Document chunking
- Vector search via pgvector
- LLM-based summarization
- Background ingestion pipeline

---

## 🗄️ Database Schema (Drizzle)

Moneyboy uses a simple, scalable schema designed for retrieval-augmented generation:

### `documents`

| Column      | Type        | Description                        |
| ----------- | ----------- | ---------------------------------- |
| id          | uuid PK     | Unique document ID                 |
| source      | text        | e.g. `"newsapi"`, `"sec"`, `"fed"` |
| title       | text        | Article headline                   |
| body        | text        | Full article text                  |
| url         | text        | Source URL                         |
| tickers     | text[]      | Associated tickers                 |
| publishedAt | timestamptz | Publication time                   |
| ingestedAt  | timestamptz | When ingestion ran                 |

### `document_chunks`

Chunks enable embedding-based search and sentiment scoring.

| Column         | Type                   | Description                                    |
| -------------- | ---------------------- | ---------------------------------------------- |
| id             | uuid PK                |                                                |
| documentId     | uuid FK → documents.id |                                                |
| chunkIndex     | int                    | Order of chunk in doc                          |
| text           | text                   | Chunk content                                  |
| embedding      | text                   | JSON stringified vector (pgvector coming soon) |
| sentiment      | real                   | -1 to +1                                       |
| topicClusterId | uuid                   | Optional topic                                 |
| publishedAt    | timestamptz            | Denormalized from document                     |

---

## 🧪 Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Add `.env.local`:

```
DATABASE_URL="postgres://<user>:<password>@<host>/<db>?sslmode=require"
```

### 3. Run Drizzle migrations

```bash
npm run db:generate
npm run db:migrate
```

### 4. Seed development data

Includes several realistic news articles for testing.

```bash
npm run seed:dev
```

### 5. Run the dev server

```bash
npm run dev
```

Visit:
**[http://localhost:3000](http://localhost:3000)**

---

## 🚀 Deployment

### **Frontend + API**

Deploy directly to **Vercel**.
The built-in App Router API routes handle search and dashboard data.

### **Database**

PlanetScale Postgres (PS-5 single node)

- Reliable
- Cheap
- No maintenance
- Drizzle migrations supported
- Easy upgrade path to HA cluster

---

## 🔍 Search & AI Roadmap

The search experience is being developed as a separate `/search` page:

### Phase 1 (current)

- Mocked summary + relational filtering
- Seed documents
- Basic snippet + sentiment UI

### Phase 2

- Real ingestion pipeline
- Embedding generation
- Vector search (pgvector or external vector DB)
- LLM summarization and reasoning

### Phase 3

- Topic clustering
- Alerts (“notify me when NVDA sentiment turns sour”)
- Dashboard widgets powered by embeddings
- Multi-source ingestion (news + SEC + Fed + transcripts)

---

## 🧱 Repository Structure

```
moneyboy/
  src/
    app/                     # Next.js routes + pages
    components/              # UI pieces
    db/
      client.ts              # drizzle(db)
      schema.ts              # documents + document_chunks
    ingest/                  # future: fetchers, chunker, embedder
    lib/
      utils.ts
      types.ts
  scripts/
    seed-dev.ts              # seeds DB with fake articles
    ingest-once.ts           # (coming soon) real ingestion
  drizzle/
    migrations/              # auto-generated migrations
  README.md
```

---

## 🧑‍💻 Contributing

Contributions are welcome!
Planned open areas include:

- Building the `/search` query UI
- Improving ingestion pipeline
- Adding real embeddings + pgvector
- Dashboard components for market data
- New themes based on Tokyo Night Storm / Moon

---

## 📄 License

MIT License — free to use and modify.

---

If you'd like, I can also generate:

- A **CONTRIBUTING.md**
- A **docs/architecture.md**
- A **PR template**
- A **Figma-style design spec** for the dashboard and search page

Just tell me!
