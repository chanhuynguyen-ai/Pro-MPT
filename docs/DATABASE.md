# Database guide

## Current real-use database
The default setup uses SQLite through Prisma:

- fast local setup
- safe for personal/private real use
- no fake data required

## Main tables
- `User` — real accounts
- `Session` — login sessions
- `Category` — repository categories
- `Repository` — repository metadata
- `RepositoryVersion` — version snapshots
- `RepositoryAsset` — uploaded files/bundles
- `RepositoryChunk` — retrieval/indexing chunks
- `Tag` / `RepositoryTag` — tagging
- `RepositoryCompatibility` — target model compatibility
- `Star` / `Clone` / `Download` — user activity
- `Workspace` / `WorkspaceRepository` — multi-repo library groups

## Why this schema fits the project
It supports:
- real accounts and ownership
- private/public repositories
- manual prompts and uploaded bundles
- version history
- retrieval-backed chat
- prompt optimization
- multi-repo workspaces

## Reset local database for a clean real start
```bash
npm run reset:local-data
npm run prisma:dbpush
npm run prisma:seed
```

Then sign up with your own account and start using Prompt-Hub with your real data.
