# Real setup guide

## Goal
Use Prompt-Hub with your own real account and your own real repositories.

## 1. Install and bootstrap
```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:dbpush
npm run prisma:seed
npm run dev
```

## 2. Create your first real account
Open `/sign-up` and create an account.

## 3. Create your first repository
Open `/dashboard/repositories/new`.
Choose either:
- Write prompts on the web
- Upload files or folder bundle

## 4. Use Crow-Chat
Open `/crow-chat` and select one of your repositories as the active library.

## 5. Important note about seed
The seed script now only bootstraps categories. It does not insert fake users or fake repositories.
