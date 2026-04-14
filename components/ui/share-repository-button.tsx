'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

type ShareRepositoryButtonProps = {
  title: string;
  text: string;
  url: string;
  className?: string;
};

export function ShareRepositoryButton({ title, text, url, className = '' }: ShareRepositoryButtonProps) {
  const [shared, setShared] = useState(false);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
      } else {
        await navigator.clipboard.writeText(url);
      }

      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      } catch {
        setShared(false);
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500 ${className}`.trim()}
      aria-label="Share repository"
      title="Share repository"
    >
      {shared ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
      {shared ? 'Shared' : 'Share'}
    </button>
  );
}
