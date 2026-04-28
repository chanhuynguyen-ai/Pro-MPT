import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORY_OPTIONS, REPOSITORY_KIND_OPTIONS } from '@/lib/constants';
import { requireUser } from '@/lib/auth';
import { getCreateRepositoryFormData, getRepositoryEditorData } from '@/lib/repositories';
import { deleteRepositoryAction, publishRepositoryVersionAction } from '@/app/actions/repository-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { RepositorySourceModeFields } from '@/components/repository/repository-source-mode-fields';
import { UploadBundleDropzone } from '@/components/repository/upload-bundle-dropzone';
import { ModelCompatibilitySelector } from '@/components/repository/model-compatibility-selector';

function getErrorMessage(error?: string) {
  if (!error) return null;

  const messages: Record<string, string> = {
    'missing-required-fields': 'Fill the repository basics and changelog before publishing a new version.',
    'missing-manual-prompt-fields': 'Manual mode needs a system prompt, user template, and output format.',
    'invalid-repository': 'Repository not found or you do not have access.',
    'missing-upload-files': 'Upload bundle mode needs at least one file when the repository has no stored bundle yet.',
    'too-many-upload-files': 'The uploaded bundle contains too many files for MVP1. Keep it under 100 files.',
    'bundle-too-large': 'The uploaded bundle is too large for local MVP1 storage. Keep it under 25 MB total.',
    'delete-confirmation-mismatch': 'The confirmation text did not match the repository name.',
  };

  return messages[error] ?? 'Something went wrong while publishing the repository.';
}

export default async function EditRepositoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser('/dashboard');
  const { id } = await params;
  const resolved = (await searchParams) ?? {};
  const error = Array.isArray(resolved.error) ? resolved.error[0] : resolved.error;
  const repository = await getRepositoryEditorData(id, user.id);
  const { categories } = await getCreateRepositoryFormData();

  if (!repository) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-6">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Manage repository</h1>
          <p className="mt-2 text-sm text-zinc-400">Rename, republish, upload bundle files, or delete the repository. Only the owner can access this page.</p>
        </div>
        <Link href={`/repositories/${repository.ownerUsername}/${repository.slug}`} className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:border-zinc-500">Back to repository</Link>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          {getErrorMessage(error)}
        </div>
      ) : null}

      <form action={publishRepositoryVersionAction} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <input type="hidden" name="repositoryId" value={repository.id} />
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Repository details</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-zinc-300"><span>Owner</span><input value={`${repository.ownerUsername} (${repository.ownerDisplayName})`} readOnly className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-zinc-400 outline-none" /></label>
            <label className="grid gap-2 text-sm text-zinc-300"><span>Repository name</span><input name="name" defaultValue={repository.name} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
            <label className="grid gap-2 text-sm text-zinc-300"><span>Slug</span><input name="slug" defaultValue={repository.slug} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Changing the slug will change the public repository URL. Prompt-Hub keeps slugs unique within your account automatically.</p>
          <label className="mt-4 grid gap-2 text-sm text-zinc-300"><span>Description</span><textarea name="description" required defaultValue={repository.description} className="min-h-24 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-zinc-300"><span>Category</span><select name="categorySlug" defaultValue={repository.categorySlug} required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">{categories.length ? categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>) : CATEGORY_OPTIONS.map((category) => <option key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>{category}</option>)}</select></label>
            <label className="grid gap-2 text-sm text-zinc-300"><span>Visibility</span><select name="visibility" defaultValue={repository.visibility} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none"><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></select></label>
            <label className="grid gap-2 text-sm text-zinc-300"><span>Tags</span><input name="tags" defaultValue={repository.tags.join(', ')} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-black p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Explore type</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {REPOSITORY_KIND_OPTIONS.map((option) => (
              <label key={option.value} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                <div className="flex items-start gap-3">
                  <input type="radio" name="kind" value={option.value} defaultChecked={repository.kind === option.value} className="mt-1 h-4 w-4" />
                  <div>
                    <div className="font-medium text-white">{option.label}</div>
                    <div className="mt-1 text-xs leading-5 text-zinc-500">{option.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <label className="mt-4 grid gap-2 text-sm text-zinc-300">
            <span>Image style</span>
            <input name="imageStyle" defaultValue={repository.imageStyle} className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none" placeholder="Anime, food photography, flat illustration..." />
          </label>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Prompt image repos sẽ dùng trường style này ở thẻ repo, Explore tab và gallery ảnh preview.</p>
        </section>

        <RepositorySourceModeFields defaultMode={repository.sourceMode} helpText="You can keep this as a web-authored prompt repo or evolve it into an uploaded bundle repository." />

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Publish settings</h2>
              <p className="mt-1 text-sm text-zinc-500">Current latest version is {repository.latestVersion.version}.</p>
            </div>
            <label className="grid gap-2 text-sm text-zinc-300"><span>Version bump</span><select name="bumpType" defaultValue="patch" className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none"><option value="patch">Patch</option><option value="minor">Minor</option><option value="major">Major</option></select></label>
          </div>
          <label className="grid gap-2 text-sm text-zinc-300"><span>Changelog</span><input name="changelog" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Explain what changed in this version." /></label>
        </section>

        <ModelCompatibilitySelector defaultSelected={repository.supportedModels} defaultCustom={repository.customSupportedModels} />

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Prompt content</h2>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-zinc-300"><span>System prompt</span><textarea name="systemPrompt" defaultValue={repository.latestVersion.systemPrompt} className="min-h-36 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
            <label className="grid gap-2 text-sm text-zinc-300"><span>User prompt template</span><textarea name="userPromptTemplate" defaultValue={repository.latestVersion.userTemplate} className="min-h-28 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-300"><span>Variables (comma-separated)</span><input name="variables" defaultValue={repository.latestVersion.variables.join(', ')} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
              <label className="grid gap-2 text-sm text-zinc-300"><span>Output format</span><input name="outputFormat" defaultValue={repository.latestVersion.outputFormat} className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
            </div>
            <label className="grid gap-2 text-sm text-zinc-300"><span>Notes</span><textarea name="notes" defaultValue={repository.latestVersion.notes} className="min-h-24 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-black p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Knowledge bundle files</h2>
          <UploadBundleDropzone hint="Drop files here to append them to the repository bundle, or choose files/folders from your computer." />
          <label className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <input type="checkbox" name="replaceAssets" value="1" className="h-4 w-4 rounded border-zinc-700 bg-black text-emerald-500" />
            Replace existing files with this upload
          </label>
          <p className="mt-3 text-xs leading-5 text-zinc-500">If you upload new files without checking replace, Prompt-Hub will append them to the current bundle.</p>
          <div className="mt-4 grid gap-3">
            {repository.assets.length ? repository.assets.map((asset) => (
              <div key={asset.id} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                <div className="font-medium text-white">{asset.relativePath || asset.originalName}</div>
                <div className="mt-1 text-xs text-zinc-500">{asset.sizeLabel}{asset.mimeType ? ` • ${asset.mimeType}` : ''}{asset.isImage ? ' • image preview candidate' : ''}</div>
              </div>
            )) : <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">No stored files yet. You can upload files here to turn this repo into a bundle-backed repository.</div>}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-5"><div className="text-sm text-zinc-500">Publishing creates a new version snapshot, updates metadata, and can also add or replace bundle files.</div><SubmitButton label="Publish new version" pendingLabel="Publishing version..." className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70" /></div>
      </form>

      <section className="mt-8 rounded-2xl border border-rose-900/50 bg-rose-950/20 p-6">
        <h2 className="text-lg font-semibold text-rose-100">Delete repository</h2>
        <p className="mt-2 text-sm leading-6 text-rose-200/80">This permanently removes the repository, its versions, stars, clones, downloads, and any uploaded bundle files from local storage.</p>
        <form action={deleteRepositoryAction} className="mt-5 space-y-4">
          <input type="hidden" name="repositoryId" value={repository.id} />
          <label className="grid gap-2 text-sm text-rose-100">
            Type <span className="font-semibold">{repository.name}</span> to confirm deletion
            <input name="confirmation" className="rounded-md border border-rose-900/60 bg-black px-3 py-2 text-white outline-none" placeholder={repository.name} />
          </label>
          <SubmitButton label="Delete repository" pendingLabel="Deleting repository..." className="rounded-md bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-70" />
        </form>
      </section>
    </div>
  );
}
