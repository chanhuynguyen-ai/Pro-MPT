import { CopyButton } from '@/components/ui/copy-button';

type CopyablePromptBlockProps = {
  title?: string;
  content?: string | null;
  label?: string;
  value?: string | null;
  copyLabel: string;
  copiedLabel?: string;
};

export function CopyablePromptBlock({
  title,
  content,
  label,
  value,
  copyLabel,
  copiedLabel = 'Copied',
}: CopyablePromptBlockProps) {
  const resolvedTitle = title ?? label ?? 'Prompt';
  const resolvedValue = (content ?? value ?? '').trim();
  const displayValue = resolvedValue || 'No content provided.';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-zinc-500">{resolvedTitle}</div>
        <CopyButton
          text={resolvedValue}
          label={copyLabel}
          copiedLabel={copiedLabel}
          className="px-2.5 py-1.5 text-xs"
        />
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-200">
        {displayValue}
      </pre>
    </div>
  );
}
