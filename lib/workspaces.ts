import { prisma } from '@/lib/prisma';
import { getSourceModeLabel } from '@/lib/utils';

type PrismaWithWorkspace = typeof prisma & {
  workspace?: {
    findMany: Function;
    findFirst: Function;
  };
};

const prismaWithWorkspace = prisma as PrismaWithWorkspace;

export function hasWorkspaceSupport() {
  return Boolean(prismaWithWorkspace.workspace);
}

export type WorkspaceOption = {
  id: string;
  name: string;
  description: string;
  repositoryCount: number;
  label: string;
};

export type WorkspaceDetail = {
  id: string;
  name: string;
  description: string;
  repositories: Array<{
    id: string;
    label: string;
    sourceModeLabel: string;
    visibility: 'public' | 'private';
  }>;
  availableRepositories: Array<{
    id: string;
    label: string;
    sourceModeLabel: string;
    visibility: 'public' | 'private';
    selected: boolean;
    isStarred: boolean;
  }>;
};

export async function getWorkspaceOptionsForUser(userId: string): Promise<WorkspaceOption[]> {
  if (!hasWorkspaceSupport()) return [];

  const rows = await prismaWithWorkspace.workspace!.findMany({
    where: { ownerId: userId },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { items: true } } },
  });

  return rows.map((workspace: any) => ({
    id: workspace.id,
    name: workspace.name,
    description: workspace.description || 'Multi-repository workspace for Crow-Chat grounding.',
    repositoryCount: workspace._count.items,
    label: `${workspace.name} • ${workspace._count.items} repos`,
  }));
}

export async function getWorkspaceDetailForUser(workspaceId: string, userId: string): Promise<WorkspaceDetail | null> {
  if (!hasWorkspaceSupport()) return null;

  const workspace = await prismaWithWorkspace.workspace!.findFirst({
    where: { id: workspaceId, ownerId: userId },
    include: {
      items: {
        orderBy: { addedAt: 'asc' },
        include: {
          repository: {
            select: {
              id: true,
              slug: true,
              visibility: true,
              sourceMode: true,
              owner: { select: { username: true } },
            },
          },
        },
      },
    },
  });

  if (!workspace) return null;

  const [ownedRepos, starredRepos] = await Promise.all([
    prisma.repository.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        visibility: true,
        sourceMode: true,
        owner: { select: { username: true } },
      },
    }),
    prisma.star.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        repositoryId: true,
        repository: {
          select: {
            id: true,
            slug: true,
            visibility: true,
            sourceMode: true,
            owner: { select: { username: true } },
          },
        },
      },
    }),
  ]);

  const selectedIds = new Set(workspace.items.map((item: any) => item.repository.id));
  const starredIds = new Set(starredRepos.map((item) => item.repositoryId));
  const repoMap = new Map<string, WorkspaceDetail['availableRepositories'][number]>();

  for (const repo of ownedRepos) {
    repoMap.set(repo.id, {
      id: repo.id,
      label: `${repo.owner.username}/${repo.slug}`,
      sourceModeLabel: getSourceModeLabel(repo.sourceMode),
      visibility: repo.visibility === 'PUBLIC' ? 'public' : 'private',
      selected: selectedIds.has(repo.id),
      isStarred: starredIds.has(repo.id),
    });
  }

  for (const star of starredRepos) {
    const repo = star.repository;
    if (!repoMap.has(repo.id)) {
      repoMap.set(repo.id, {
        id: repo.id,
        label: `${repo.owner.username}/${repo.slug}`,
        sourceModeLabel: getSourceModeLabel(repo.sourceMode),
        visibility: repo.visibility === 'PUBLIC' ? 'public' : 'private',
        selected: selectedIds.has(repo.id),
        isStarred: true,
      });
    }
  }

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description || 'Multi-repository workspace for Crow-Chat grounding.',
    repositories: workspace.items.map((item: any) => ({
      id: item.repository.id,
      label: `${item.repository.owner.username}/${item.repository.slug}`,
      sourceModeLabel: getSourceModeLabel(item.repository.sourceMode),
      visibility: item.repository.visibility === 'PUBLIC' ? 'public' : 'private',
    })),
    availableRepositories: Array.from(repoMap.values()).sort((a, b) => Number(b.selected) - Number(a.selected) || a.label.localeCompare(b.label)),
  };
}
