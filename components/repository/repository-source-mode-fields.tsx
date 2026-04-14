'use client';

import { useState } from 'react';
import { REPOSITORY_SOURCE_MODES } from '@/lib/constants';
import { UploadBundleDropzone } from '@/components/repository/upload-bundle-dropzone';

type RepositorySourceModeFieldsProps = {
  defaultMode?: 'MANUAL' | 'UPLOAD_BUNDLE';
  helpText?: string;
};

export function RepositorySourceModeFields({
  defaultMode = 'MANUAL',
  helpText = 'Choose whether this repository is prompt-first or bundle-first.',
}: RepositorySourceModeFieldsProps) {
  const [mode, setMode] = useState<'MANUAL' | 'UPLOAD_BUNDLE'>(defaultMode);

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-white">Repository source</h2>
      <p className="mb-4 text-sm text-zinc-500">{helpText}</p>
      <input type="hidden" name="sourceMode" value={mode} />

      <div className="grid gap-3 md:grid-cols-2">
        {REPOSITORY_SOURCE_MODES.map((item) => {
          const active = item.value === mode;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-emerald-700 bg-emerald-950/30'
                  : 'border-zinc-800 bg-black hover:border-zinc-700'
              }`}
            >
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-800 bg-black p-4">
        {mode === 'MANUAL' ? (
          <div>
            <div className="text-sm font-medium text-white">Manual prompt mode</div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fill system prompt, user template, variables, and notes directly below. This is best for prompt repos that are authored entirely inside Prompt-Hub.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-white">Upload bundle mode</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Upload individual files, a zipped skill bundle, or choose a whole folder from your machine. Prompt-Hub will store the files on the web and attach them as repository knowledge files.
              </p>
            </div>
            <UploadBundleDropzone />
            <p className="text-xs leading-5 text-zinc-500">
              Folder upload support depends on the browser. If your browser does not preserve the folder selection cleanly, zip the folder first and upload the zip file instead.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
