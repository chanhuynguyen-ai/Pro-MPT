import { ReactNode } from 'react';

export function Badge({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        muted
          ? 'border-zinc-700 bg-zinc-900 text-zinc-300'
          : 'border-emerald-700 bg-emerald-950 text-emerald-300'
      }`}
    >
      {children}
    </span>
  );
}
