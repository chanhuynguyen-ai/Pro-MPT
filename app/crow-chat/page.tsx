import { requireUser } from '@/lib/auth';
import { getDictionary } from '@/lib/i18n';
import { getOllamaStatus } from '@/lib/ollama';
import { prisma } from '@/lib/prisma';
import { CrowChatShell } from '@/components/chat/crow-chat-shell';
import { getWorkspaceOptionsForUser } from '@/lib/workspaces';

export default async function CrowChatPage() {
  const user = await requireUser('/crow-chat');
  const { dict } = await getDictionary();
  const ollama = await getOllamaStatus();

  const [repositories, starred, workspaces] = await Promise.all([
    prisma.repository.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, owner: { select: { username: true } }, slug: true, name: true, sourceMode: true },
      take: 20,
    }),
    prisma.star.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        repository: {
          select: { id: true, owner: { select: { username: true } }, slug: true, name: true, sourceMode: true },
        },
      },
    }),
    getWorkspaceOptionsForUser(user.id),
  ]);

  const repoMap = new Map<string, { id: string; label: string; sourceModeLabel: string; isStarred: boolean }>();

  for (const repo of repositories) {
    repoMap.set(repo.id, {
      id: repo.id,
      label: `${repo.owner.username}/${repo.slug}`,
      sourceModeLabel: repo.sourceMode === 'UPLOAD_BUNDLE' ? 'Uploaded bundle' : 'Web prompt',
      isStarred: false,
    });
  }

  for (const item of starred) {
    const repo = item.repository;
    const existing = repoMap.get(repo.id);
    if (existing) {
      existing.isStarred = true;
      continue;
    }
    repoMap.set(repo.id, {
      id: repo.id,
      label: `${repo.owner.username}/${repo.slug}`,
      sourceModeLabel: repo.sourceMode === 'UPLOAD_BUNDLE' ? 'Uploaded bundle' : 'Web prompt',
      isStarred: true,
    });
  }

  const repoOptions = Array.from(repoMap.values());

  const starredRepos = starred.map((item) => ({
    id: item.repository.id,
    href: `/repositories/${item.repository.owner.username}/${item.repository.slug}`,
    label: `${item.repository.owner.username}/${item.repository.slug}`,
    sourceModeLabel: item.repository.sourceMode === 'UPLOAD_BUNDLE' ? 'Uploaded bundle' : 'Web prompt',
  }));

  const installedModels = ollama.installedModels.map((model) => model.name);
  const defaultMode: 'local' | 'remote' | 'demo' = installedModels.length ? 'local' : process.env.OPENAI_API_KEY ? 'remote' : 'demo';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <CrowChatShell
        labels={{
          title: dict.crowChat.title,
          subtitle: dict.crowChat.subtitle,
          newChat: dict.crowChat.newChat,
          skillLibrary: dict.crowChat.skillLibrary,
          starred: dict.crowChat.starred,
          placeholder: dict.crowChat.inputPlaceholder,
          repoLibrary: dict.crowChat.repoLibrary,
          workspaceLibrary: dict.crowChat.workspaceLibrary,
          llmModel: dict.crowChat.llmModel,
          send: dict.crowChat.send,
          noRepo: dict.crowChat.noRepo,
          noWorkspace: dict.crowChat.noWorkspace,
          noModels: dict.crowChat.noModels,
          localMode: dict.crowChat.localMode,
          remoteMode: dict.crowChat.remoteMode,
          helper: dict.crowChat.helper,
          chooseRepo: dict.crowChat.chooseRepo,
          chooseWorkspace: dict.crowChat.chooseWorkspace,
          chooseModel: dict.crowChat.chooseModel,
          starredBadge: dict.crowChat.starredBadge,
          useInChat: dict.crowChat.useInChat,
          useWorkspace: dict.crowChat.useWorkspace,
          openRepo: dict.crowChat.openRepo,
          workspaces: dict.crowChat.workspaces,
        }}
        repoOptions={repoOptions}
        workspaceOptions={workspaces}
        starredRepos={starredRepos}
        installedModels={installedModels}
        defaultMode={defaultMode}
      />
    </div>
  );
}
