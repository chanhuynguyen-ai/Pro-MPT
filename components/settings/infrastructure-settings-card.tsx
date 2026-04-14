import type { StorageStatus } from '@/lib/storage';
import type { EmbeddingProviderStatus } from '@/lib/vector';

export function InfrastructureSettingsCard({
  storage,
  embeddings,
}: {
  storage: StorageStatus;
  embeddings: EmbeddingProviderStatus;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Storage & retrieval</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Prompt-Hub can store repository assets on the local filesystem or in an S3-compatible object storage bucket, and it can build a vector-style repository index using OpenAI or Ollama embeddings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-black p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Storage provider</div>
          <div className="mt-2 text-base font-semibold text-white">{storage.driver === 's3' ? 'S3-compatible object storage' : 'Local filesystem'}</div>
          <div className="mt-2 text-sm text-zinc-400">
            {storage.available ? 'Configured' : 'Unavailable'}
            {storage.bucket ? ` • Bucket: ${storage.bucket}` : ''}
            {storage.rootDir ? ` • Root: ${storage.rootDir}` : ''}
          </div>
          {storage.endpoint ? <div className="mt-2 text-xs text-zinc-500">Endpoint: {storage.endpoint}</div> : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-black p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Retrieval embeddings</div>
          <div className="mt-2 text-base font-semibold text-white">
            {embeddings.provider === 'openai' ? 'OpenAI embeddings' : embeddings.provider === 'ollama' ? 'Ollama embeddings' : 'Lexical fallback only'}
          </div>
          <div className="mt-2 text-sm text-zinc-400">
            {embeddings.available ? 'Configured for vector retrieval' : 'Embeddings provider is not configured'}
            {embeddings.model ? ` • Model: ${embeddings.model}` : ''}
          </div>
        </div>
      </div>
    </section>
  );
}
