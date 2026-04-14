'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { slugify } from '@/lib/utils';

function getRedirectTarget(formData: FormData) {
  const next = String(formData.get('next') || '').trim();
  return next && next.startsWith('/') ? next : '/dashboard';
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = getRedirectTarget(formData);

  if (!email || !password) {
    redirect(`/sign-in?error=missing-fields&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(`/sign-in?error=invalid-credentials&next=${encodeURIComponent(next)}`);
  }

  await createSession(user.id);
  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const name = String(formData.get('name') || '').trim();
  const usernameInput = String(formData.get('username') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = getRedirectTarget(formData);

  if (!name || !usernameInput || !email || !password) {
    redirect(`/sign-up?error=missing-fields&next=${encodeURIComponent(next)}`);
  }

  if (password.length < 8) {
    redirect(`/sign-up?error=weak-password&next=${encodeURIComponent(next)}`);
  }

  const username = slugify(usernameInput);
  if (!username) {
    redirect(`/sign-up?error=invalid-username&next=${encodeURIComponent(next)}`);
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true, email: true, username: true },
  });

  if (existing) {
    const code = existing.email === email ? 'email-taken' : 'username-taken';
    redirect(`/sign-up?error=${code}&next=${encodeURIComponent(next)}`);
  }

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email,
      passwordHash: hashPassword(password),
      bio: 'New Prompt-Hub member.',
    },
  });

  await createSession(user.id);
  redirect(next);
}

export async function signOutAction() {
  await destroySession();
  redirect('/');
}
