# Prompt-Hub

Prompt-Hub is a Git-inspired workspace for prompt repositories, prompt skill bundles, versioning, retrieval-backed chat, and prompt optimization.

This package is the **real-use clean build**:
- no demo users
- no seeded fake repositories
- no seeded workspaces
- sign up with your own account and store your own data

## What is included
- Real sign-up / sign-in with session cookies
- Repository create / edit / delete
- Manual prompt mode and uploaded bundle mode
- Stars, clone, downloads, share, copy buttons
- Crow-Chat with repo library grounding
- Workspace support
- Prompt Optimizer
- Retrieval/indexing pipeline
- Storage abstraction (`local` now, `s3` ready)

## Recommended use right now
For personal use, start with SQLite and local storage. This is already a real database and a real account flow for a single-user or small private setup.

For later production/public deployment, move to:
- PostgreSQL
- S3/R2/MinIO object storage
- proper monitoring and backups

## Quick start
```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:dbpush
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`

## First-time setup
1. Open `/sign-up`
2. Create your real account
3. Sign in
4. Open `/dashboard/repositories/new`
5. Create your first prompt repository
6. Open `/crow-chat` and choose your repo library

## Environment
See `.env.example`.

### Personal real-use default
```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STORAGE_DRIVER="local"
STORAGE_ROOT_DIR="./storage/repository-assets"
```

### Optional remote AI
```env
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

### Optional Ollama
```env
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
```

## Database bootstrap
`npm run prisma:seed` is now **safe for real use**.
It only creates base categories and does **not** wipe user data.

## Real project note
This build intentionally removes demo accounts and fake repositories so you can use Prompt-Hub with your own real data immediately.

## MVP status
- MVP1: functionally complete for private/personal use
- MVP2: in progress with Prompt Optimizer, Workspaces, and retrieval-backed Crow-Chat


## Clean reset for real use
If you previously tested demo/sample data, run:
```bash
npm run reset:local-data
npm run prisma:dbpush
npm run prisma:seed
```

Then sign up again with your own real account.
