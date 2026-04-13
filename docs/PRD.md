# Prompt-Hub MVP1 PRD

## 1. Product name
Prompt-Hub

## 2. Product statement
Prompt-Hub is a GitHub-inspired platform for prompts and prompt skills. It helps users create a repository for a prompt, publish versions over time, make the repository public or private, clone public repositories into their own workspace, and download prompts for reuse.

## 3. Problem statement
Prompt users currently manage prompts in a fragmented way:
- prompts are scattered across chat apps, notes, docs, and text files
- it is hard to find the latest trusted version
- it is difficult to compare changes over time
- reusing a prompt across projects is messy
- sharing a prompt with other people lacks structure and metadata
- prompt knowledge is not treated like a reusable asset

## 4. Opportunity
By turning a prompt into a repository with metadata and version history, Prompt-Hub can become the default place where individuals and early teams manage prompt assets in a structured, reusable way.

## 5. Product vision
Make prompt management feel as natural and professional as source control.

## 6. MVP1 scope summary
MVP1 focuses on one clear value proposition:
- create prompt repositories
- publish versions of a prompt skill
- browse public repositories
- clone a public repository into a personal workspace
- download a repository in simple formats

## 7. Target users
### Primary
1. AI power users
   - frequent ChatGPT, Claude, Gemini users
   - need reusable prompts
2. builders and developers
   - create chatbots, copilots, and automations
   - need version history and reuse
3. freelancers and operators
   - use prompts for content, education, support, or coding
   - want a cleaner way to organize prompt assets

### Secondary
- small AI teams who will later need collaboration features

## 8. Core JTBD
### Functional JTBD
- When I create a good prompt, I want to save it as a structured asset so I can reuse it later.
- When I improve a prompt, I want a new version so I can track what changed.
- When I find a useful public prompt, I want to clone it and customize it without losing the original.

### Emotional JTBD
- I want my prompt workflow to feel professional, organized, and reliable.

## 9. Goals
### Business goals
- validate demand for prompt repositories
- identify whether users update prompts over time
- measure reuse through clones and downloads

### Product goals
- let a new user understand the product in under 10 seconds
- let a user create a first repository in under 3 minutes
- make repository details and version history easy to scan

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
A container for a prompt or prompt skill. It has metadata, visibility, stats, and one or more versions.

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
- initial version data

### FR-3 Create initial version
On repository creation, Prompt-Hub automatically creates version `1.0.0`.

### FR-4 Edit repository metadata
Repository owners can update description, tags, category, and visibility.

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
- stats
- version history

### FR-7 Explore public repositories
Users can browse public repositories and filter by:
- search keyword
- category
- tags
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
4. user enters system prompt and user prompt template
5. user clicks Create Repository
6. system creates repository and version `1.0.0`
7. user is redirected to repository detail page

### Flow B: Publish a new version
1. owner opens repository
2. owner clicks Edit
3. owner changes prompt content
4. owner enters changelog
5. owner publishes a new version
6. system creates a new version snapshot and marks it as latest

### Flow C: Clone a public repository
1. user finds a public repository
2. user clicks Clone
3. system duplicates the repository under the user account
4. cloned repository starts with the same latest version snapshot

### Flow D: Download a prompt skill
1. user opens a repository
2. user clicks Download
3. user selects a file format
4. system exports current version to the chosen format

## 17. Data model summary
### User
Owns repositories, creates versions, stars repositories.

### Repository
Stores repository-level metadata and references latest version.

### RepositoryVersion
Stores a full snapshot of the prompt skill for that version.

### Category and Tag
Support organization and discovery.

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

## 19. MVP1 acceptance criteria
MVP1 is successful if a user can:
- create an account
- create a repository
- view repository details
- publish a second version
- browse public repositories
- clone a public repository
- download a repository file

## 20. Risks
1. Users may see the product as only a prompt gallery
   - mitigation: emphasize versioning and clone workflows
2. Users may not understand the value of versions
   - mitigation: make changelog and version history very visible
3. Too much scope can delay launch
   - mitigation: keep single-repo single-skill model in MVP1

## 21. Launch recommendation
Launch as a private beta with a small seed library of 20 to 50 strong prompt repositories across:
- development
- education
- cooking
- marketing
- customer support

## 22. Post-MVP roadmap
### MVP2
- live prompt testing
- AI prompt optimizer
- compare versions
- comments and discussions

### MVP3
- team workspaces
- branch and merge
- pull-request-like review
- prompt marketplace
