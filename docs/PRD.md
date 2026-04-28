# Prompt-Hub MVP1 Product Requirements Document

## 1. Product name
Prompt-Hub

## Implementation note for this real-use build
This repository now implements a real subset of MVP1 with Prisma + SQLite for: create repository, create initial version, persist compatible AI targets, explore filters, dashboard reads, profile reads, and repository detail reads. Authentication, publish-new-version UI, clone, star, and download remain planned but not yet wired.

## 2. Product one-liner
A Git-inspired platform for storing, versioning, cloning, and sharing prompt repositories and prompt skills.

## 3. Product vision
Prompt-Hub turns prompts from scattered text snippets into reusable, versioned assets. Instead of losing prompts across chats, notes, and local files, users can keep them in structured repositories with metadata, release history, compatibility targets, and reuse workflows.

## 4. Product thesis
Prompts should be treated like product assets, not temporary text. A strong prompt often evolves through multiple iterations, needs a clear owner, and may be optimized for one or more AI systems. Prompt-Hub provides a repository model so users can store, update, publish, clone, and download prompt skills in a clean workflow.

## 5. MVP1 scope
MVP1 focuses on a single repository model with version history and public discovery.

### In scope
- authentication-ready repository structure
- create a prompt repository
- create the first version automatically
- publish new versions
- browse public repositories
- view repository detail
- clone public repositories
- download repositories
- classify repositories by category
- classify repositories by compatible AI targets
- track stars, clones, and downloads

### Out of scope
- branches and pull requests
- team workspaces and granular permissions
- AI prompt generation
- AI evaluation pipeline
- prompt testing inside the app
- billing and subscriptions
- multi-file repositories

## 6. Problem statement
Users who build with AI often have good prompts, but those prompts are hard to manage.

Pain points:
- prompts are stored in too many places
- prompt revisions overwrite older versions
- there is no clean way to know which version is stable
- useful prompts are hard to share and adapt
- prompt assets are often tuned for a specific AI model, but that compatibility is not documented

## 7. Target users
### Primary
- solo builders who use AI daily
- developers creating chatbot or automation workflows
- creators, consultants, and operators who maintain reusable prompts
- educators who want a cleaner way to organize prompt assets

### Secondary
- small AI teams who will later need collaboration features

## 8. Core JTBD
### Functional JTBD
- When I create a good prompt, I want to save it as a structured asset so I can reuse it later.
- When I improve a prompt, I want a new version so I can track what changed.
- When I find a useful public prompt, I want to clone it and customize it without losing the original.
- When I browse community prompts, I want to know which AI systems a prompt is designed for before I adopt it.

### Emotional JTBD
- I want my prompt workflow to feel professional, organized, and reliable.

## 9. Goals
### Business goals
- validate demand for prompt repositories
- identify whether users update prompts over time
- measure reuse through clones and downloads
- learn whether model compatibility filtering improves discovery

### Product goals
- let a new user understand the product in under 10 seconds
- let a user create a first repository in under 3 minutes
- make repository details and version history easy to scan
- make AI compatibility visible at a glance on repo cards and repo detail pages

## 10. Non-goals for MVP1
Prompt-Hub MVP1 does not include:
- branching and merging
- pull requests
- team permissions beyond a simple owner model
- comments and review workflows
- AI prompt generation or prompt optimization
- model-side prompt testing and evaluation
- paid plans and billing
- public API
- multi-file repositories

## 11. Key concepts
### Repository
A container for a prompt or prompt skill. It has metadata, visibility, stats, compatibility targets, and one or more versions.

### Version
A snapshot of the prompt skill at a point in time. Each version stores the full content and changelog.

### Prompt skill
A structured prompt asset consisting of:
- title
- short description
- system prompt
- user prompt template
- variables
- output format
- notes

### Compatible AI target
A repository-level classification that indicates which AI systems the prompt is optimized for.

Initial fixed values for MVP1:
- All models
- ChatGPT
- Claude
- Claude Code
- Gemini

## 12. Functional requirements
### FR-1 Authentication
Users can sign up, sign in, and sign out.

### FR-2 Create repository
Users can create a repository with:
- owner
- repository name
- description
- category
- tags
- visibility
- compatible AI targets
- initial version data

### FR-3 Create initial version
On repository creation, Prompt-Hub automatically creates version `1.0.0`.

### FR-4 Edit repository metadata
Repository owners can update description, tags, category, visibility, and compatible AI targets.

### FR-5 Publish new version
Owners can publish a new version with:
- version number
- changelog
- full prompt skill snapshot

### FR-6 View repository detail
Users can view:
- current version content
- repository metadata
- owner
- tags
- visibility
- compatible AI targets
- stats
- version history

### FR-7 Explore public repositories
Users can browse public repositories and filter by:
- search keyword
- category
- tags
- compatible AI target
- sort order

### FR-8 Clone repository
Authenticated users can clone a public repository into their own workspace.

### FR-9 Download repository
Users can download a repository in:
- Markdown
- JSON
- TXT

### FR-10 Track usage counters
The system records:
- stars
- clones
- downloads

## 13. UX requirements
The UI should feel GitHub-adjacent:
- dark theme first
- clean information hierarchy
- repository-first navigation
- metadata badges and stats near the title
- structured layout with header, content, and right sidebar
- stable typography and generous spacing
- compatible AI targets shown clearly with pill-style badges

## 14. Pages in MVP1
1. Landing page
2. Explore page
3. Sign in / Sign up pages
4. Dashboard
5. Create repository page
6. Repository detail page
7. Edit repository page
8. Profile page

## 15. Navigation model
Top navigation:
- Explore
- My Repositories
- New Repository
- Profile

Repository action row:
- Star
- Clone
- Download
- Edit

## 16. User flows
### Flow A: Create first repository
1. user signs in
2. user clicks New Repository
3. user enters repository metadata
4. user selects one or more compatible AI targets
5. user enters system prompt and user prompt template
6. user clicks Create Repository
7. system creates repository and version `1.0.0`
8. user is redirected to repository detail page

### Flow B: Publish a new version
1. owner opens repository
2. owner clicks Edit
3. owner changes prompt content
4. owner updates compatibility targets if needed
5. owner enters changelog
6. owner publishes a new version
7. system creates a new version snapshot and marks it as latest

### Flow C: Clone a public repository
1. user finds a public repository
2. user checks if the repository supports their target AI
3. user clicks Clone
4. system duplicates the repository under the user account
5. cloned repository starts with the same latest version snapshot

### Flow D: Download a prompt skill
1. user opens a repository
2. user clicks Download
3. user selects a file format
4. system exports current version to the chosen format

## 17. Data model summary
### User
Owns repositories, creates versions, stars repositories.

### Repository
Stores repository-level metadata, compatibility targets, and references latest version.

### RepositoryVersion
Stores a full snapshot of the prompt skill for that version.

### Category and Tag
Support organization and discovery.

### RepositoryCompatibility
Stores the AI systems the repository is intended for.

### Star, Clone, Download
Record engagement and reuse.

## 18. Success metrics
### Primary
- number of created repositories
- percentage of repositories with 2 or more versions
- number of clones per active user

### Secondary
- number of downloads
- star rate on public repositories
- time to first repository creation
- percentage of public repositories with at least one compatible AI target selected

## 19. MVP1 acceptance criteria
MVP1 is successful if a user can:
- create an account
- create a repository
- assign compatible AI targets
- view repository details
- publish a second version
- browse public repositories
- filter repositories by AI target
- clone a public repository
- download a repository file

## 20. Risks
1. Users may see the product as only a prompt gallery
   - mitigation: emphasize versioning and clone workflows
2. Users may not understand the value of versions
   - mitigation: make changelog and version history very visible
3. Users may not know whether a prompt fits their AI stack
   - mitigation: make compatible AI targets first-class metadata
4. Too much scope can delay launch
   - mitigation: keep single-repo single-skill model in MVP1


## MVP1 extension: bundle-backed repositories
- repository source mode: MANUAL or UPLOAD_BUNDLE
- create repo from text or uploaded files/folder bundle
- repository detail shows stored files and previews
- edit page supports slug rename, bundle replacement, and delete repository
