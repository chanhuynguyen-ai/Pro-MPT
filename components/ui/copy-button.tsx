'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyButtonProps = {
  text?: string;
  value?: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyButton({
  text,
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resolvedText = text ?? value ?? '';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(resolvedText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-white hover:border-zinc-500 ${className}`.trim()}
      aria-label={label}
      title={label}
    >
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
