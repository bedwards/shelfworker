# Shelf Worker

[![CI](https://github.com/bedwards/shelfworker/actions/workflows/ci.yml/badge.svg)](https://github.com/bedwards/shelfworker/actions)
[![codecov](https://codecov.io/gh/bedwards/shelfworker/branch/main/graph/badge.svg)](https://codecov.io/gh/bedwards/shelfworker)

Public-domain ebook library using GraphQL (Neon/pg_graphql) and FerretDB. Explore and collect free ebooks from Project Gutenberg with dual database backends: PostgreSQL with GraphQL for reads and FerretDB (MongoDB-compatible) for writes. Static frontend on GitHub Pages, worker-based writes via Cloudflare.

**Live Demo:** https://bedwards.github.io/shelfworker

## Local Development

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm or compatible package manager
- Homebrew (Mac) for wrangler

### Quick Start

Install dependencies:
```bash
npm ci
```

### Checks

Run the full test suite (linting, tests, coverage) that matches the GitHub Actions workflow:
```bash
npm run check
```

Individual commands:
```bash
npm run lint           # ESLint
npm test              # Vitest tests
npm run test:coverage # Coverage report
npm run test:watch    # Watch mode
```

### Database

Start PostgreSQL and FerretDB in Docker:
```bash
docker-compose up -d
```

Import schema and seed data:
```bash
psql "postgresql://postgres:password@localhost:5432/shelfworker" < schema.sql
```

Connect to interactive psql client:
```bash
psql "postgresql://postgres:password@localhost:5432/shelfworker"
```

Verify tables and data:
```sql
shelfworker=# \d
                List of relations
 Schema |    Name     |   Type   |  Owner
--------+-------------+----------+----------
 public | books       | table    | postgres
 public | books_id_seq| sequence | postgres

shelfworker=# select gutenberg_id, title, author from books limit 3;
 gutenberg_id |               title                |           author
--------------+------------------------------------+-----------------------------
         1342 | Pride and Prejudice                | Jane Austen
           11 | Alice's Adventures in Wonderland   | Lewis Carroll
           84 | Frankenstein                       | Mary Wollstonecraft Shelley
```

Test FerretDB connection:
```bash
mongosh "mongodb://postgres:password@localhost:27017/shelfworker?authMechanism=PLAIN"
```

### Cloudflare Worker (API)

The `.dev.vars` file configures local development environment variables. Start the worker:
```bash
wrangler dev
```

Expected output:
```
Using vars defined in .dev.vars
Binding                            Resource                  Mode
env.DATABASE_URL ("(hidden)")      Environment Variable      local
env.FERRETDB_URL ("(hidden)")      Environment Variable      local
[wrangler:info] Ready on http://localhost:8787
```

### Frontend Server

Start HTTP server for the frontend:
```bash
npx http-server -p 8000
```

### Open in Browser

Navigate to http://localhost:8000/

The app automatically detects localhost and connects to the local worker at `http://localhost:8787`, which connects to your local PostgreSQL database (for GraphQL reads) and FerretDB (for library writes).

## Production Deployment

### Database

The application uses Neon PostgreSQL with the pg_graphql extension. Reuses the existing Neon database from bedwards/greetings-and-worlds with new tables for books.

Create tables in production:
```bash
psql "your-neon-connection-string" < schema.sql
```

### Cloudflare Worker

Install Wrangler globally:
```bash
npm install -g wrangler
```

Login and deploy:
```bash
wrangler login
wrangler secret put DATABASE_URL    # Neon connection string
wrangler secret put FERRETDB_URL    # FerretDB/MongoDB connection string
wrangler deploy --env production
```

The worker requires both connection strings:
- `DATABASE_URL`: Neon PostgreSQL connection string (for GraphQL reads)
- `FERRETDB_URL`: FerretDB connection string with `authMechanism=PLAIN`

### GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that automatically:
1. Runs tests and linting on every push
2. Generates coverage reports and uploads to Codecov
3. Deploys the frontend to GitHub Pages on main branch pushes

Enable GitHub Pages in repository settings with source set to "GitHub Actions".

## Architecture

**Database Schema**: Single `books` table with public domain ebook metadata from Project Gutenberg. Library data stored in FerretDB collections.

**Dual Database Strategy**:
- GraphQL reads: PostgreSQL with pg_graphql extension for efficient querying with filters (genre, decade)
- Library writes: FerretDB (MongoDB-compatible API on PostgreSQL) for flexible document storage

**Frontend**: Vanilla JavaScript, HTML5, CSS3 with no framework dependencies. Environment detection automatically routes requests to local worker during development or production worker URL when deployed.

**Backend**: Cloudflare Worker using both `pg` library (for GraphQL queries) and `mongodb` driver (for FerretDB writes) with `nodejs_compat` flag. Handles CORS, database connections, and all API endpoints.

**Testing**: Vitest with happy-dom environment. Coverage thresholds: 96% statements, branches, functions, and lines.

## API Endpoints

All endpoints served through the Cloudflare Worker:

- `GET /api/books` - List all books via GraphQL (PostgreSQL/pg_graphql)
- `GET /api/library` - Get user's library via FerretDB
- `POST /api/library` - Add book to library via FerretDB
- `DELETE /api/library/:id` - Remove book from library via FerretDB

## Technology Stack

- **Frontend**: HTML5, CSS3, vanilla JavaScript
- **Backend**: Cloudflare Workers (free tier: 100k requests/day)
- **Database**: 
  - PostgreSQL 17 with pg_graphql extension (Neon in production, Docker locally)
  - FerretDB 2.5.0 (MongoDB-compatible layer on PostgreSQL)
- **Data Source**: Project Gutenberg via Gutendex API
- **Testing**: Vitest 3.2, happy-dom 18.0
- **CI/CD**: GitHub Actions with Codecov integration
- **Deployment**: GitHub Pages (frontend), Cloudflare Workers (backend)

## Features

- Dual database backends: GraphQL for reads, FerretDB for writes
- Browse public domain ebooks from Project Gutenberg
- Filter by genre and publication decade
- Full-text search across titles and authors
- Personal library management (add/remove books)
- Preview and download books in EPUB and text formats
- No authentication required - single user demo
- Responsive design for mobile and desktop
- Fast GraphQL queries with edge caching

## Browser Support

Modern browsers with ES6 support (Chrome, Firefox, Safari).
