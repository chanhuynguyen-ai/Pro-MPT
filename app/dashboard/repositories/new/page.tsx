export default function NewRepositoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white">Create a new repository</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This starter mirrors a GitHub-style creation flow for a prompt repository and first version.
        </p>
      </div>

      <form className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Repository details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-zinc-300">
              Owner
              <input className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" defaultValue="your-username" />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              Repository name
              <input className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="teacher-assistant-vn" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm text-zinc-300">
            Description
            <textarea className="min-h-24 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Describe the purpose, audience, and value of this prompt skill." />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm text-zinc-300">
              Category
              <select className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none">
                <option>Development</option>
                <option>Education</option>
                <option>Cooking</option>
                <option>Marketing</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-zinc-300 md:col-span-2">
              Tags
              <input className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="backend, api, nodejs" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-white">Initial version (v1.0.0)</h2>
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-zinc-300">
              System prompt
              <textarea className="min-h-36 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="You are a..." />
            </label>
            <label className="grid gap-2 text-sm text-zinc-300">
              User prompt template
              <textarea className="min-h-28 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Create a lesson for {{topic}} aimed at {{audience}}..." />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-zinc-300">
                Variables (comma-separated)
                <input className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="topic, audience, tone, duration" />
              </label>
              <label className="grid gap-2 text-sm text-zinc-300">
                Output format
                <input className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Markdown with sections" />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-zinc-300">
              Notes
              <textarea className="min-h-24 rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Use case, boundaries, prompt tips, and caveats." />
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 pt-5">
          <div className="text-sm text-zinc-500">Starter UI only. Wire this form to Prisma in the next build step.</div>
          <button type="button" className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500">
            Create repository
          </button>
        </div>
      </form>
    </div>
  );
}
