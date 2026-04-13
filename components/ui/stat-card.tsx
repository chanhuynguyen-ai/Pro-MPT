import { ReactNode } from 'react';

export function StatCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 flex items-center justify-between text-zinc-400">{icon}<span className="text-xs">{label}</span></div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
