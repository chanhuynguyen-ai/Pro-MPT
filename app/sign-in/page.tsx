import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/auth-shell';
import { signInAction } from '@/app/actions/auth-actions';
import { getCurrentUser } from '@/lib/auth';
import { SubmitButton } from '@/components/ui/submit-button';

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignInPage({
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
      title="Sign in to Prompt-Hub"
      description="Access your private repositories, publish prompt versions, and manage ownership with a real account session."
      altHref={`/sign-up?next=${encodeURIComponent(next)}`}
      altLabel="Don't have an account?"
      altCta="Create one"
    >
      <h2 className="text-2xl font-semibold text-white">Welcome back</h2>
      <p className="mt-2 text-sm text-zinc-400">Use one of the demo seeded accounts or a new account you created here.</p>

      {error ? (
        <div className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/30 p-4 text-sm text-rose-200">
          {error === 'missing-fields' && 'Enter both email and password.'}
          {error === 'invalid-credentials' && 'Email or password is incorrect.'}
        </div>
      ) : null}

      <form action={signInAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="grid gap-2 text-sm text-zinc-300">
          Email
          <input name="email" type="email" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="hungdev@example.com" />
        </label>
        <label className="grid gap-2 text-sm text-zinc-300">
          Password
          <input name="password" type="password" required className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-white outline-none" placeholder="••••••••" />
        </label>
        <SubmitButton label="Sign in" pendingLabel="Signing in..." className="w-full rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70" />
      </form>

      <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
        <div className="font-medium text-zinc-200">Demo login</div>
        <div className="mt-2">Email: <span className="text-zinc-300">hungdev@example.com</span></div>
        <div>Password: <span className="text-zinc-300">prompt1234</span></div>
      </div>

      <div className="mt-6 text-sm text-zinc-500">
        <Link href="/" className="text-blue-400 hover:underline">Back to home</Link>
      </div>
    </AuthShell>
  );
}
