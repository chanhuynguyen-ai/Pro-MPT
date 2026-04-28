'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LANGUAGE_COOKIE, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { deleteLocalModel, pullLocalModels, RECOMMENDED_LOCAL_MODELS } from '@/lib/ollama';
import { requireUser } from '@/lib/auth';
import { deleteUserRemoteLlmConfig, saveUserRemoteLlmConfig } from '@/lib/remote-llm';

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

export async function deleteLocalModelAction(formData: FormData) {
  await requireUser('/settings');
  const model = String(formData.get('model') || '').trim();
  if (!model) redirect('/settings?error=missing-model');

  try {
    await deleteLocalModel(model);
    redirect('/settings?success=local-delete');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'delete-local-model-failed';
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
}

export async function saveRemoteApiKeyAction(formData: FormData) {
  const user = await requireUser('/settings');
  const provider = String(formData.get('provider') || '').trim().toUpperCase() as 'GEMINI' | 'OPENAI';
  const apiKey = String(formData.get('apiKey') || '').trim();
  const model = String(formData.get('model') || '').trim();
  const baseUrl = String(formData.get('baseUrl') || '').trim();
  const label = String(formData.get('label') || '').trim();

  if (!provider || !apiKey || !model) {
    redirect('/settings?error=missing-remote-api');
  }

  try {
    await saveUserRemoteLlmConfig({ userId: user.id, provider, apiKey, model, baseUrl, label });
    redirect('/settings?success=remote-api');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'save-remote-api-failed';
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
}

export async function deleteRemoteApiModelAction(formData: FormData) {
  const user = await requireUser('/settings');
  const configId = String(formData.get('configId') || '').trim();
  if (!configId) redirect('/settings?error=missing-remote-config');

  try {
    await deleteUserRemoteLlmConfig(user.id, configId);
    redirect('/settings?success=remote-delete');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'delete-remote-api-failed';
    redirect(`/settings?error=${encodeURIComponent(message)}`);
  }
}
