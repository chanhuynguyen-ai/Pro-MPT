import { setLanguageAction } from '@/app/actions/settings-actions';
import { SubmitButton } from '@/components/ui/submit-button';
import type { AppLanguage } from '@/lib/i18n';

export function LanguageSettingsCard({
  language,
  labels,
}: {
  language: AppLanguage;
  labels: {
    title: string;
    description: string;
    english: string;
    vietnamese: string;
    save: string;
  };
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{labels.title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">{labels.description}</p>
      </div>

      <form action={setLanguageAction} className="space-y-4">
        <label className="grid gap-2 text-sm text-zinc-300">
          <span>{labels.title}</span>
          <select
            name="language"
            defaultValue={language}
            className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none"
          >
            <option value="en">{labels.english}</option>
            <option value="vi">{labels.vietnamese}</option>
          </select>
        </label>
        <SubmitButton
          label={labels.save}
          pendingLabel={labels.save}
          className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        />
      </form>
    </section>
  );
}
