'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileArchive, FolderUp, UploadCloud } from 'lucide-react';

type UploadBundleDropzoneProps = {
  rootLabel?: string;
  hint?: string;
};

type ListedFile = { name: string; size: number };

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function UploadBundleDropzone({
  rootLabel = 'prompt--hub-project-/',
  hint = 'Drag files here to add them to your repository, or choose files/folders from your computer.',
}: UploadBundleDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [listedFiles, setListedFiles] = useState<ListedFile[]>([]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const totals = useMemo(() => {
    const totalBytes = listedFiles.reduce((sum, file) => sum + file.size, 0);
    return {
      count: listedFiles.length,
      totalBytes,
      totalSizeLabel: formatBytes(totalBytes),
    };
  }, [listedFiles]);

  function applyFiles(files: FileList | null, target: HTMLInputElement | null) {
    if (!files || !target) return;
    const transfer = new DataTransfer();
    const nextFiles: ListedFile[] = [];
    Array.from(files).forEach((file) => {
      transfer.items.add(file);
      nextFiles.push({ name: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name, size: file.size });
    });
    target.files = transfer.files;
    setListedFiles(nextFiles);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-800 bg-black p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Knowledge bundle root</div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-emerald-300">{rootLabel}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            <UploadCloud className="h-4 w-4" />
            Upload files
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500"
          >
            <FolderUp className="h-4 w-4" />
            Add folder
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        name="uploadedFiles"
        multiple
        className="hidden"
        onChange={(event) => applyFiles(event.target.files, fileInputRef.current)}
      />
      <input
        ref={folderInputRef}
        type="file"
        name="uploadedFiles"
        multiple
        className="hidden"
        onChange={(event) => applyFiles(event.target.files, folderInputRef.current)}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          applyFiles(event.dataTransfer.files, fileInputRef.current);
        }}
        className={`rounded-2xl border border-dashed p-6 transition ${
          isDragging ? 'border-emerald-500 bg-emerald-950/20' : 'border-zinc-700 bg-zinc-950'
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-3 rounded-full border border-zinc-700 bg-black p-3 text-zinc-300">
            <FileArchive className="h-5 w-5" />
          </div>
          <div className="text-sm font-semibold text-white">Drag files here to add them to your repository</div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{hint}</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="text-zinc-300">Selected bundle items</div>
          <div className="text-zinc-500">
            {totals.count ? `${totals.count} files • ${totals.totalSizeLabel}` : 'No files selected yet'}
          </div>
        </div>
        {listedFiles.length ? (
          <div className="max-h-56 space-y-2 overflow-auto pr-1">
            {listedFiles.map((file) => (
              <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">
                <div className="truncate">{file.name}</div>
                <div className="shrink-0 text-xs text-zinc-500">{formatBytes(file.size)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-black px-3 py-4 text-sm text-zinc-500">
            Upload files, drag them into the dropzone, or choose a folder to prepare the repository bundle.
          </div>
        )}
      </div>
    </div>
  );
}
