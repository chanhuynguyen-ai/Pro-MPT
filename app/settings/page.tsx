import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getOllamaStatus, RECOMMENDED_LOCAL_MODELS } from '@/lib/ollama';
import { getStorageStatus } from '@/lib/storage';
import { getEmbeddingProviderStatus } from '@/lib/vector';
import { getRemoteProviderStatus } from '@/lib/remote-llm';
import { LanguageSettingsCard } from '@/components/settings/language-settings-card';
import { InfrastructureSettingsCard } from '@/components/settings/infrastructure-settings-card';
import { ChatbotSettingsTabs } from '@/components/settings/chatbot-settings-tabs';

function getBanner(params: Record<string, string | string[] | undefined>, dict: Awaited<ReturnType<typeof getDictionary>>['dict']) {
  const success = Array.isArray(params.success) ? params.success[0] : params.success;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  if (success) {
    if (success === 'language') return { tone: 'success' as const, message: dict.settings.success };
    if (success === 'models') return { tone: 'success' as const, message: dict.settings.installSuccess };
    if (success === 'local-delete') return { tone: 'success' as const, message: 'Local model deleted successfully.' };
    if (success === 'remote-api') return { tone: 'success' as const, message: 'Remote chatbot API saved successfully.' };
    if (success === 'remote-delete') return { tone: 'success' as const, message: 'Remote API model removed successfully.' };
  }

  if (error) {
    if (error === 'no-models') return { tone: 'error' as const, message: dict.settings.noModelsSelected };
    if (error === 'missing-remote-api') return { tone: 'error' as const, message: 'Provider, API key, and model are required.' };
    if (error === 'missing-model') return { tone: 'error' as const, message: 'Choose a local model to delete.' };
    if (error === 'missing-remote-config') return { tone: 'error' as const, message: 'Choose a saved remote API model to delete.' };
    return { tone: 'error' as const, message: decodeURIComponent(error) || dict.settings.installError };
  }

  return null;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser('/settings');
  const { language, dict } = await getDictionary();
  const ollamaStatus = await getOllamaStatus();
  const storageStatus = await getStorageStatus();
  const embeddingStatus = getEmbeddingProviderStatus();
  const remoteStatus = await getRemoteProviderStatus(user.id);
  const resolved = (await searchParams) ?? {};
  const banner = getBanner(resolved, dict);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white">{dict.settings.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">{dict.settings.subtitle}</p>
      </div>

      {banner ? (
        <div className={`mb-6 rounded-xl border p-4 text-sm ${banner.tone === 'success' ? 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200' : 'border-rose-900/60 bg-rose-950/30 text-rose-200'}`}>
          {banner.message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <LanguageSettingsCard
            language={language}
            labels={{
              title: dict.settings.languageTitle,
              description: dict.settings.languageDescription,
              english: dict.settings.english,
              vietnamese: dict.settings.vietnamese,
              save: dict.settings.saveLanguage,
            }}
          />
          <InfrastructureSettingsCard storage={storageStatus} embeddings={embeddingStatus} />
        </div>

        <div className="space-y-6">
          <ChatbotSettingsTabs
            status={ollamaStatus}
            recommendations={RECOMMENDED_LOCAL_MODELS}
            remote={remoteStatus}
            labels={{
              title: dict.settings.chatbotTitle,
              description: dict.settings.chatbotDescription,
              recommended: dict.settings.recommendedModels,
              installed: dict.settings.installedModels,
              running: dict.settings.runningModels,
              online: dict.settings.ollamaOnline,
              offline: dict.settings.ollamaOffline,
              download: dict.settings.downloadSelected,
            }}
          />
        </div>
      </div>
    </div>
  );
}
