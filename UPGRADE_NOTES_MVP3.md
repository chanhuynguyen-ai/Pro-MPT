# Prompt-Hub MVP3 upgrade notes

## 1) Security / safety review upgrade
- Added stronger repository safety review with weighted risk scoring.
- Detects:
  - prompt injection / instruction override patterns
  - requests for secrets (API key, password, OTP, token, private key)
  - requests for sensitive personal data (CV, bank account, CCCD, credit card)
  - suspicious exfiltration / sending data to URL, webhook, email
  - suspicious financial transfer instructions
- New review statuses:
  - `REVIEWED`
  - `WARNING`
  - `BLOCKED`
- Saved extra fields in repository:
  - `reviewScore`
  - `reviewDetailsJson`
- Repository detail now shows:
  - green banner = reviewed
  - amber banner = needs attention
  - blue warning banner = blocked / caution notice
- Blocked repositories cannot open the chat sandbox and the repo chat API returns 403.

## 2) Explore split into 3 areas
- Added repository type (`kind`) with 3 tabs:
  - `PROMPT_TEXT`
  - `PROMPT_IMAGE`
  - `SKILL`
- Explore page now has dedicated tabs and keeps filters while switching.

## 3) Prompt image support
- Added `imageStyle` field.
- Prompt image repos can show preview images.
- Added inline image preview route:
  - `/repositories/[owner]/[slug]/preview/[assetId]`
- Repository cards and detail pages show image preview gallery for prompt image repos.

## 4) Create / edit flow updates
- Create repository and edit repository screens now include:
  - repository type selection
  - image style field
- Clone operation preserves repository type and image style.

## 5) Prisma changes
Run these after pulling the upgraded code:

```bash
npm install
npx prisma generate
npx prisma db push
```

Then start the app normally.
