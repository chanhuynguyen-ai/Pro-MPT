# Pro-MPT / Prompt-Hub Demo Runbook (Windows 11)

This runbook is for a clean local demo on Windows 11 using SQLite.

## 1. Clone and switch to the demo branch

```powershell
git clone https://github.com/chanhuynguyen-ai/Pro-MPT.git
cd Pro-MPT
git checkout demo-ready
```

## 2. Check prerequisites

```powershell
node -v
npm -v
git --version
```

Recommended: Node.js 20.x.

## 3. Create the local environment file

```powershell
Copy-Item .env.example .env
```

The default local configuration is enough for the core demo:

```env
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STORAGE_DRIVER="local"
STORAGE_ROOT_DIR="./storage/repository-assets"
```

Do not commit `.env` or local database files.

## 4. Install dependencies and initialize Prisma

```powershell
npm install
npm run prisma:generate
npm run prisma:dbpush
npm run prisma:seed
```

## 5. Start the application

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## 6. Recommended demo flow

1. Open the landing page.
2. Go to `/sign-up` and create a real local demo account.
3. Sign in.
4. Open `/dashboard/repositories/new`.
5. Create a prompt repository.
6. Show repository editing/versioning capabilities.
7. Show stars, clone, download/share/copy actions if available for the created repository.
8. Open Crow-Chat and select the repository library.
9. Show workspace support.
10. Show Prompt Optimizer.

## 7. Optional AI setup

### OpenAI

Set these values in `.env`:

```env
OPENAI_API_KEY="YOUR_KEY"
OPENAI_MODEL="gpt-5-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

### Ollama

Start Ollama locally and ensure the configured embedding model is available.

```env
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
```

## 8. Production-style build check before recording

Run this once before recording the final video:

```powershell
npm run build
npm run start
```

Then confirm `http://localhost:3000` works in production mode.

## 9. Git workflow while polishing the demo

Before changing code:

```powershell
git checkout demo-ready
git pull origin demo-ready
git status
```

After each meaningful fix:

```powershell
git add .
git commit -m "fix: improve demo reliability"
git push origin demo-ready
```

Use small focused commits rather than one large final commit.

## 10. Troubleshooting commands

Reset only local demo data when necessary:

```powershell
npm run reset:local-data
npm run prisma:dbpush
npm run prisma:seed
```

If Prisma client is stale:

```powershell
npm run prisma:generate
```

If dependencies become inconsistent:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

## Demo safety notes

- `.env` is ignored by Git.
- `prisma/dev.db` is ignored by Git.
- `storage` is ignored by Git.
- Never show API keys in the recording.
- Use a dedicated demo account and non-sensitive prompt content.
