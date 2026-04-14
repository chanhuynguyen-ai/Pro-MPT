'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LANGUAGE_COOKIE, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { pullLocalModels, RECOMMENDED_LOCAL_MODELS } from '@/lib/ollama';
import { requireUser } from '@/lib/auth';

export async function setLanguageAction(formData: FormData) {
  await requireUser('/settings');
  const lang = String(formData.get('language') || 'en');
  const nextLang = SUPPORTED_LANGUAGES.includes(lang as any) ? lang : 'en';
  const cookieStore = await cookies();
  cookieStore.set(LANGUAGE_COOKIE, nextLang, {
    httpOnly: false,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/settings?success=language');
}

export async function downloadLocalModelsAction(formData: FormData) {
  await requireUser('/settings');
  const selected = formData.getAll('models').map((value) => String(value)).filter(Boolean);
  const supported = new Set(RECOMMENDED_LOCAL_MODELS.map((item) => item.name));
  const models = selected.filter((name) => supported.has(name));

  if (!models.length) {
    redirect('/settings?error=no-models');
  }

  try {
    await pullLocalModels(models);
    redirect('/settings?success=models');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'download-failed';
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
}
