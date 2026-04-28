## Implementation note for this real-use build
The current codebase already wires US-3, US-4, most of US-5, most of US-6, and most of US-12/US-13 to Prisma + SQLite in real mode. Authentication, clone, star, download, and publish-new-version remain future build steps.

# Prompt-Hub MVP1 User Stories

## Epic 1: Authentication
### US-1 Sign up
As a new user, I want to create an account so that I can create and manage repositories.

**Acceptance criteria**
- user can sign up with email and password
- user gets a unique username
- user lands on dashboard after sign-up

### US-2 Sign in
As a returning user, I want to sign in so that I can access my repositories.

**Acceptance criteria**
- invalid credentials show an error state
- valid sign-in redirects to dashboard

## Epic 2: Repository creation
### US-3 Create repository
As a user, I want to create a prompt repository so that I can store a prompt skill in a structured way.

**Acceptance criteria**
- user can enter repository name, description, category, tags, visibility
- user can select one or more compatible AI targets
- repository name is unique per owner
- repository creation generates a slug
- repository is visible on the repository detail page after creation

### US-4 Create initial version
As a user, I want my repository to start with version 1.0.0 so that I have a stable first release.

**Acceptance criteria**
- repository creation also creates version 1.0.0
- version contains system prompt, user template, variables, output format, notes
- latest version points to the initial version

## Epic 3: Repository detail and browsing
### US-5 View repository detail
As a user, I want to view a repository page so that I can understand what the prompt skill does.

**Acceptance criteria**
- detail page shows repository title, owner, description, category, tags, visibility
- compatible AI targets are visible near the top of the page
- latest version content is visible
- version list is visible
- usage stats are visible

### US-6 Explore public repositories
As a user, I want to browse public repositories so that I can discover useful prompts.

**Acceptance criteria**
- explore page lists public repositories only
- user can search by name, description, owner, tag, or compatible AI target
- user can filter by category
- user can filter by compatible AI target
- user can sort by latest, most starred, most cloned

## Epic 4: Versioning
### US-7 Publish a new version
As a repository owner, I want to publish a new version so that I can track prompt improvements over time.

**Acceptance criteria**
- owner can edit prompt skill content
- owner can update compatible AI targets when needed
- owner must provide a changelog
- new version is saved as a full snapshot
- latest version is updated
- version history keeps prior versions intact

### US-8 View version history
As a user, I want to read version history so that I can understand how the prompt has evolved.

**Acceptance criteria**
- version list shows version number, date, and changelog
- newest version appears first
- old versions remain accessible

## Epic 5: Reuse
### US-9 Clone a public repository
As a user, I want to clone a public repository so that I can adapt it in my own workspace.

**Acceptance criteria**
- clone action is available on public repositories
- cloned repository belongs to the current user
- cloned repository preserves latest version content
- cloned repository preserves compatible AI targets
- system records a clone event

### US-10 Download a repository
As a user, I want to download a repository so that I can use the prompt skill outside the app.

**Acceptance criteria**
- download is available from repository detail page
- user can choose Markdown, JSON, or TXT
- export includes compatible AI targets in metadata
- system records a download event

## Epic 6: Social proof
### US-11 Star a repository
As a user, I want to star a repository so that I can save or endorse useful prompt skills.

**Acceptance criteria**
- authenticated user can star a public repository
- star count updates after action
- user cannot star the same repository twice

## Epic 7: Profile and dashboard
### US-12 View my dashboard
As a signed-in user, I want a dashboard so that I can quickly see my repositories and activity.

**Acceptance criteria**
- dashboard shows repository count
- dashboard shows recent repositories
- dashboard shows basic usage stats
- dashboard surfaces the compatible AI standard for repositories

### US-13 View public profile
As a user, I want a public profile page so that I can view a creator’s repositories.

**Acceptance criteria**
- public profile lists public repositories for a username
- repository cards link to repository detail pages
- cards display compatible AI targets

## Prioritization
### Must have
- US-1 to US-10

### Nice to have for MVP1 polish
- US-11
- US-12
- US-13

## Notes for implementation
- all write actions should be protected by authentication
- use full snapshot versioning in MVP1 instead of diffs
- compatible AI targets should use fixed values in MVP1 for clean filtering and consistent metadata
- use server-side validation for repository name and slug uniqueness


## Share and copy additions
- repository detail supports share by direct link
- system prompt and user prompt template each have one-click copy controls
- full prompt pack can be copied in one action for faster paste into AI tools


## Added stories
- As a user, I can choose web-authored prompt mode or upload-bundle mode when creating a repository.
- As a user, I can upload prompt files or a zipped skill folder from my machine and store them in the repository.
- As an owner, I can rename my repository and manage its slug safely.
- As an owner, I can delete a repository and remove its stored files.
