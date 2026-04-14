import Link from 'next/link';
import { CATEGORY_OPTIONS } from '@/lib/constants';
import { requireUser } from '@/lib/auth';
import { getCreateRepositoryFormData } from '@/lib/repositories';
import { createRepositoryAction } from '@/app/actions/repository-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { RepositorySourceModeFields } from '@/components/repository/repository-source-mode-fields';
import { ModelCompatibilitySelector } from '@/components/repository/model-compatibility-selector';

function getErrorMessage(error?: string) {
  if (!error) return null;

  const messages: Record<string, string> = {
    'missing-required-fields': 'Fill the basic repository fields before creating the repository.',
    'missing-manual-prompt-fields': 'Manual mode needs a system prompt, user template, and output format.',
    'invalid-category': 'The selected category no longer exists.',
    'missing-upload-files': 'Upload bundle mode needs at least one file or folder selection.',
    'too-many-upload-files': 'The uploaded bundle contains too many files for MVP1. Keep it under 100 files.',
    'bundle-too-large': 'The uploaded bundle is too large for local MVP1 storage. Keep it under 25 MB total.',
  };

  return messages[error] ?? 'Something went wrong while creating the repository.';
}

export default async function NewRepositoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser('/dashboard/repositories/new');
  const resolved = (await searchParams) ?? {};
  const error = Array.isArray(resolved.error) ? resolved.error[0] : resolved.error;
  const { categories } = await getCreateRepositoryFormData();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Create a new repository</h1>
        <p className="mt-2 text-sm text-zinc-400">Signed in as @{user.username}. This repository will belong to your workspace.</p>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          {getErrorMessage(error)}
        </div>
      ) : null}

      <form action={createRepositoryAction} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Repository details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-zinc-300">
              Owner
              <input value={`${user.username} (${user.name})`} readOnly className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-zinc-400 outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Repository name
              <input name="name" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="teacher-assistant-vn" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm text-zinc-300">
            Description
            <textarea name="description" required className="min-h-24 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Describe the purpose, audience, and value of this prompt skill or uploaded bundle." />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-zinc-300">
              Category
              <select name="categorySlug" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
                {categories.length ? categories.map((category) => (
                  <option key={category.id} value={category.slug}>{category.name}</option>
                )) : CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>{category}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Visibility
              <select name="visibility" defaultValue="PUBLIC" className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Tags
              <input name="tags" className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="backend, api, bundle, docs" />
            </label>
          </div>
        </section>

        <RepositorySourceModeFields />

        <ModelCompatibilitySelector />

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Initial version (v1.0.0)</h2>
          <p className="mb-4 text-sm text-zinc-500">For upload mode, these prompt fields can be left blank and Prompt-Hub will generate a grounded starter prompt from the uploaded bundle.</p>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-zinc-300">
              System prompt
              <textarea name="systemPrompt" className="min-h-36 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="You are a..." />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              User prompt template
              <textarea name="userPromptTemplate" className="min-h-28 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Create a lesson for {{topic}} aimed at {{audience}}..." />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-300">
                Variables (comma-separated)
                <input name="variables" className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="topic, audience, tone, duration" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Output format
                <input name="outputFormat" className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Markdown with sections" />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-zinc-300">
              Notes
              <textarea name="notes" className="min-h-24 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Use case, boundaries, prompt tips, and caveats." />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Changelog
              <input name="changelog" defaultValue="Initial release." className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-5">
          <div className="text-sm text-zinc-500">Mode 1 writes prompts directly on the web. Mode 2 stores prompt files or folders from your computer as a knowledge bundle.</div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500">Back to dashboard</Link>
            <SubmitButton
              label="Create repository"
              pendingLabel="Creating repository..."
              className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
