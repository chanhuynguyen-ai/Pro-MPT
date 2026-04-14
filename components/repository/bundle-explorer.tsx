'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronDown, FileSearch, FileText, Filter, FolderTree } from 'lucide-react';
import type { RepositoryAssetModel } from '@/lib/repositories';
import { CopyButton } from '@/components/ui/copy-button';

type BundleExplorerProps = {
  owner: string;
  slug: string;
  assets: RepositoryAssetModel[];
  bundleSummary: {
    totalFiles: number;
    textFiles: number;
    totalSizeLabel: string;
  };
};

export function BundleExplorer({ owner, slug, assets, bundleSummary }: BundleExplorerProps) {
  const [query, setQuery] = useState('');
  const [textOnly, setTextOnly] = useState(false);
  const [openIds, setOpenIds] = useState<string[]>([]);

  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (textOnly && !asset.isText) return false;
      if (!normalized) return true;
      const haystack = [asset.originalName, asset.relativePath ?? '', asset.mimeType ?? '', asset.previewText ?? '']
        .join('\n')
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [assets, query, textOnly]);

  function toggle(assetId: string) {
    setOpenIds((current) => current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId]);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
            <FolderTree className="h-5 w-5" />
            Knowledge bundle
          </div>
          <p className="text-sm leading-6 text-zinc-400">
            Browse uploaded files, search by filename or preview text, and expand the files you want to inspect.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-sm">
          <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Files</div>
            <div className="mt-1 font-semibold text-white">{bundleSummary.totalFiles}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Text</div>
            <div className="mt-1 font-semibold text-white">{bundleSummary.textFiles}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Size</div>
            <div className="mt-1 font-semibold text-white">{bundleSummary.totalSizeLabel}</div>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-xl border border-zinc-800 bg-black p-4 md:grid-cols-[1fr_auto] md:items-center">
        <label className="grid gap-2 text-sm text-zinc-300">
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
            <FileSearch className="h-3.5 w-3.5" /> Search bundle
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500"
            placeholder="Search file name, preview text, or mime type"
          />
        </label>
        <label className="inline-flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
          <Filter className="h-4 w-4 text-zinc-500" />
          <input
            type="checkbox"
            checked={textOnly}
            onChange={(event) => setTextOnly(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-700 bg-black text-emerald-500"
          />
          Text previews only
        </label>
      </div>

      <div className="mb-4 text-sm text-zinc-400">
        Showing <span className="font-semibold text-white">{filteredAssets.length}</span> of {assets.length} files.
      </div>

      <div className="space-y-4">
        {filteredAssets.length ? filteredAssets.map((asset) => {
          const isOpen = openIds.includes(asset.id);
          return (
            <div key={asset.id} className="rounded-xl border border-zinc-800 bg-black p-4">
              <button
                type="button"
                onClick={() => toggle(asset.id)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    <span>{asset.relativePath || asset.originalName}</span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {asset.sizeLabel}{asset.mimeType ? ` • ${asset.mimeType}` : ''}{asset.relativePath ? ` • ${asset.originalName}` : ''}
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-300">
                  {isOpen ? 'Hide preview' : 'Show preview'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen ? (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {asset.previewText ? <CopyButton value={asset.previewText} label="Copy preview" copiedLabel="Copied preview" /> : null}
                    <Link href={`/repositories/${owner}/${slug}/files/${asset.id}`} className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:border-zinc-500">Download file</Link>
                  </div>
                  {asset.isText && asset.previewText ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs leading-6 text-zinc-300">
                      {asset.previewText}
                    </pre>
                  ) : (
                    <p className="text-sm text-zinc-500">Binary or non-text file preview is not shown in MVP1.</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        }) : (
          <div className="rounded-xl border border-dashed border-zinc-800 bg-black p-8 text-sm text-zinc-400">
            No files matched this bundle search. Try a shorter keyword or disable the text-only filter.
          </div>
        )}
      </div>
    </section>
  );
}
