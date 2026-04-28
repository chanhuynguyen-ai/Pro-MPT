# Deployment Guide

## MVP1 closeout
This real-use build now includes:
- pluggable storage abstraction (`lib/storage.ts`)
- health endpoint (`/api/health`)
- Dockerfile and docker-compose for local production-like runs

## Environment variables
- `DATABASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `STORAGE_DRIVER` (`local` for this real-use build)
- `STORAGE_ROOT_DIR`
- `OLLAMA_BASE_URL`
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional)

## Local container run
```bash
npm install
npm run prisma:generate
npm run prisma:dbpush
npm run prisma:seed
npm run build
npm run start
```

## Docker compose
```bash
docker compose up --build
```

## Health check
Open:
- `/api/health`

## Production note
This codebase now abstracts storage, but the bundled implementation is still `local`. To move to true production storage, replace the implementation inside `lib/storage.ts` with S3 / R2 / Supabase Storage while preserving the same interface.


## S3-compatible storage and vector retrieval

- Set `STORAGE_DRIVER="s3"` plus the `S3_*` environment variables to store repository bundle files in S3 / R2 / MinIO.
- Set `OPENAI_API_KEY` + `OPENAI_EMBEDDING_MODEL` or `OLLAMA_EMBEDDING_MODEL` to enable embedding-backed repository indexing.
- Repo and Crow-Chat retrieval will automatically rebuild or reuse repository chunks from the `RepositoryChunk` table.
- Owners can rebuild a repo index manually with `POST /api/repositories/[owner]/[slug]/index`.
