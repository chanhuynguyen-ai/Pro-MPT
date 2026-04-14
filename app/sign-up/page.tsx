import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { signUpAction } from '@/app/actions/auth-actions';
import { getCurrentUser } from '@/lib/auth';
import { SubmitButton } from '@/components/ui/submit-button';

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const resolved = (await searchParams) ?? {};
  const next = readParam(resolved.next) || '/dashboard';
  const error = readParam(resolved.error);

  if (user) {
    redirect(next);
  }

  return (
    <AuthShell
      title="Create your Prompt-Hub account"
      description="Start with a personal workspace, keep private repositories locked to you, and own the prompt skills you publish."
      altHref={`/sign-in?next=${encodeURIComponent(next)}`}
      altLabel="Already have an account?"
      altCta="Sign in"
    >
      <h2 className="text-2xl font-semibold text-white">Create account</h2>
      <p className="mt-2 text-sm text-zinc-400">Your username becomes your repository namespace.</p>

      {error ? (
        <div className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error === 'missing-fields' && 'Fill all required fields.'}
          {error === 'weak-password' && 'Password must be at least 8 characters.'}
          {error === 'invalid-username' && 'Username must contain letters or numbers.'}
          {error === 'email-taken' && 'This email is already in use.'}
          {error === 'username-taken' && 'This username is already in use.'}
        </div>
      ) : null}

      <form action={signUpAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="grid gap-2 text-sm text-zinc-300">
          Full name
          <input name="name" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="Nguyen Van A" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Username
          <input name="username" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="your-handle" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Email
          <input name="email" type="email" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="you@example.com" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Password
          <input name="password" type="password" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="At least 8 characters" />
        </label>
        <SubmitButton label="Create account" pendingLabel="Creating account..." className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70" />
      </form>

      <div className="mt-6 text-sm text-zinc-500">
        <Link href="/" className="text-blue-400 hover:underline">Back to home</Link>
      </div>
    </AuthShell>
  );
}
