import { CompatibilityTarget, Prisma, RepositorySourceMode, Visibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COMPATIBILITY_ENUM_TO_LABEL } from '@/lib/constants';
import { formatBytes, formatDate, getSourceModeLabel } from '@/lib/utils';

export type RepositoryAssetModel = {
  id: string;
  originalName: string;
  relativePath: string | null;
  mimeType: string | null;
  sizeBytes: number;
  sizeLabel: string;
  isText: boolean;
  previewText: string | null;
};

export type RepositoryCardModel = {
  id: string;
  owner: string;
  ownerDisplayName: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  supportedModels: string[];
  customSupportedModels: string[];
  tags: string[];
  visibility: 'public' | 'private';
  sourceMode: 'MANUAL' | 'UPLOAD_BUNDLE';
  sourceModeLabel: string;
  assetCount: number;
  stars: number;
  clones: number;
  downloads: number;
  updatedAt: string;
};

export type RepositoryDetailModel = RepositoryCardModel & {
  viewerHasStarred: boolean;
  viewerCanEdit: boolean;
  assets: RepositoryAssetModel[];
  bundleSummary: {
    totalFiles: number;
    textFiles: number;
    totalBytes: number;
    totalSizeLabel: string;
  };
  versions: {
    version: string;
    changelog: string;
    updatedAt: string;
    systemPrompt: string;
    userTemplate: string;
    variables: string[];
    outputFormat: string;
    notes: string;
  }[];
};

export type RepositoryEditorModel = {
  id: string;
  ownerUsername: string;
  ownerDisplayName: string;
  name: string;
  slug: string;
  description: string;
  categorySlug: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  sourceMode: 'MANUAL' | 'UPLOAD_BUNDLE';
  tags: string[];
  supportedModels: string[];
  customSupportedModels: string[];
  assets: RepositoryAssetModel[];
  latestVersion: {
    version: string;
    systemPrompt: string;
    userTemplate: string;
    variables: string[];
    outputFormat: string;
    notes: string;
  };
};

export type RepositoryCollectionFilters = {
  q?: string;
  category?: string;
  ai?: CompatibilityTarget | 'All models';
  visibility?: 'public' | 'all';
  sourceMode?: RepositorySourceMode | 'ALL';
  viewerUserId?: string;
};

function toVisibilityLabel(visibility: Visibility) {
  return visibility === Visibility.PUBLIC ? 'public' : 'private';
}

function toSupportedModels(targets: { target: CompatibilityTarget }[]) {
  if (!targets.length) {
    return ['All models'];
  }

  return targets.map((item) => COMPATIBILITY_ENUM_TO_LABEL[item.target]).sort((a, b) => a.localeCompare(b));
}

function mapAsset(asset: {
  id: string;
  originalName: string;
  relativePath: string | null;
  mimeType: string | null;
  sizeBytes: number;
  isText: boolean;
  previewText: string | null;
}): RepositoryAssetModel {
  return {
    id: asset.id,
    originalName: asset.originalName,
    relativePath: asset.relativePath,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    sizeLabel: formatBytes(asset.sizeBytes),
    isText: asset.isText,
    previewText: asset.previewText,
  };
}

function parseCustomModelNames(raw?: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function mapRepositoryBase(repository: {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: Visibility;
  sourceMode: RepositorySourceMode;
  starsCount: number;
  clonesCount: number;
  downloadsCount: number;
  updatedAt: Date;
  owner: { username: string; name: string };
  category: { name: string };
  tags: { tag: { name: string } }[];
  compatibility: { target: CompatibilityTarget }[];
  customModelNamesJson?: string | null;
  assets?: { id: string }[];
}): RepositoryCardModel {
  return {
    id: repository.id,
    owner: repository.owner.username,
    ownerDisplayName: repository.owner.name,
    name: repository.name,
    slug: repository.slug,
    description: repository.description,
    category: repository.category.name,
    supportedModels: [...toSupportedModels(repository.compatibility), ...parseCustomModelNames(repository.customModelNamesJson)],
    customSupportedModels: parseCustomModelNames(repository.customModelNamesJson),
    tags: repository.tags.map((item) => item.tag.name),
    visibility: toVisibilityLabel(repository.visibility),
    sourceMode: repository.sourceMode,
    sourceModeLabel: getSourceModeLabel(repository.sourceMode),
    assetCount: repository.assets?.length ?? 0,
    stars: repository.starsCount,
    clones: repository.clonesCount,
    downloads: repository.downloadsCount,
    updatedAt: formatDate(repository.updatedAt),
  };
}

const baseInclude = {
  owner: { select: { username: true, name: true } },
  category: { select: { name: true } },
  tags: { include: { tag: { select: { name: true } } } },
  compatibility: { select: { target: true } },
  assets: { select: { id: true } },
} satisfies Prisma.RepositoryInclude;

function buildRepositorySearchWhere(q?: string): Prisma.RepositoryWhereInput | undefined {
  const query = q?.trim();
  if (!query) return undefined;

  return {
    OR: [
      { name: { contains: query } },
      { description: { contains: query } },
      { slug: { contains: query } },
      { owner: { username: { contains: query } } },
      { owner: { name: { contains: query } } },
      { tags: { some: { tag: { name: { contains: query } } } } },
      { customModelNamesJson: { contains: query } },
      { assets: { some: { originalName: { contains: query } } } },
      { assets: { some: { relativePath: { contains: query } } } },
      { assets: { some: { previewText: { contains: query } } } },
      {
        latestVersion: {
          is: {
            OR: [
              { systemPrompt: { contains: query } },
              { userPromptTemplate: { contains: query } },
              { outputFormat: { contains: query } },
              { notes: { contains: query } },
              { changelog: { contains: query } },
              { variablesJson: { contains: query } },
            ],
          },
        },
      },
    ],
  };
}

function buildCollectionWhere(filters: RepositoryCollectionFilters): Prisma.RepositoryWhereInput {
  const canSeeAll = filters.visibility === 'all' && Boolean(filters.viewerUserId);
  const andClauses: Prisma.RepositoryWhereInput[] = [
    canSeeAll
      ? { OR: [{ visibility: Visibility.PUBLIC }, { ownerId: filters.viewerUserId }] }
      : { visibility: Visibility.PUBLIC },
  ];

  if (filters.category && filters.category !== 'All') {
    andClauses.push({ category: { name: filters.category } });
  }

  if (filters.sourceMode && filters.sourceMode !== 'ALL') {
    andClauses.push({ sourceMode: filters.sourceMode });
  }

  if (filters.ai && filters.ai !== 'All models') {
    andClauses.push({
      compatibility: {
        some: {
          target: {
            in: [filters.ai, CompatibilityTarget.ALL_MODELS],
          },
        },
      },
    });
  }

  const searchWhere = buildRepositorySearchWhere(filters.q);
  if (searchWhere) {
    andClauses.push(searchWhere);
  }

  return andClauses.length === 1 ? andClauses[0] : { AND: andClauses };
}

export async function getFeaturedRepositories(limit = 3) {
  const rows = await prisma.repository.findMany({
    where: { visibility: Visibility.PUBLIC },
    orderBy: [{ starsCount: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    include: baseInclude,
  });

  return rows.map(mapRepositoryBase);
}

export async function getDashboardData(
  userId: string,
  filters?: { q?: string; sourceMode?: RepositorySourceMode | 'ALL' },
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true },
  });

  if (!user) return null;

  const repositories = await prisma.repository.findMany({
    where: {
      ownerId: user.id,
      ...(filters?.sourceMode && filters.sourceMode !== 'ALL' ? { sourceMode: filters.sourceMode } : {}),
      ...(buildRepositorySearchWhere(filters?.q) ?? {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: baseInclude,
  });

  const repositoryCards = repositories.map(mapRepositoryBase);
  const stats = {
    repositories: repositoryCards.length,
    publishedVersions: await prisma.repositoryVersion.count({ where: { repository: { ownerId: user.id } } }),
    totalDownloads: repositoryCards.reduce((sum, repository) => sum + repository.downloads, 0),
    starsReceived: repositoryCards.reduce((sum, repository) => sum + repository.stars, 0),
    bundleRepositories: repositoryCards.filter((repository) => repository.sourceMode === 'UPLOAD_BUNDLE').length,
    webPromptRepositories: repositoryCards.filter((repository) => repository.sourceMode === 'MANUAL').length,
  };

  return { user, repositories: repositoryCards, stats };
}

export async function getProfileData(username: string, viewerUserId?: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, username: true, bio: true },
  });

  if (!user) return null;

  const isOwner = viewerUserId === user.id;
  const repositories = await prisma.repository.findMany({
    where: {
      ownerId: user.id,
      ...(isOwner ? {} : { visibility: Visibility.PUBLIC }),
    },
    orderBy: { updatedAt: 'desc' },
    include: baseInclude,
  });

  return {
    user,
    isOwner,
    repositories: repositories.map(mapRepositoryBase),
  };
}

export async function getRepositoryDetail(owner: string, slug: string, viewerUserId?: string): Promise<RepositoryDetailModel | null> {
  const repository = await prisma.repository.findFirst({
    where: {
      slug,
      owner: { username: owner },
    },
    include: {
      owner: { select: { id: true, username: true, name: true } },
      category: { select: { name: true } },
      tags: { include: { tag: { select: { name: true } } } },
      compatibility: { select: { target: true } },
          assets: {
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true, originalName: true, relativePath: true, mimeType: true, sizeBytes: true, isText: true, previewText: true },
      },
      versions: {
        orderBy: [{ createdAt: 'desc' }],
        select: {
          versionNumber: true,
          changelog: true,
          createdAt: true,
          systemPrompt: true,
          userPromptTemplate: true,
          variablesJson: true,
          outputFormat: true,
          notes: true,
        },
      },
    },
  });

  if (!repository) return null;
  if (repository.visibility === Visibility.PRIVATE && repository.owner.id !== viewerUserId) return null;

  const viewerHasStarred = viewerUserId
    ? Boolean(await prisma.star.findFirst({ where: { repositoryId: repository.id, userId: viewerUserId }, select: { id: true } }))
    : false;

  const totalBytes = repository.assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);

  return {
    ...mapRepositoryBase(repository),
    viewerHasStarred,
    viewerCanEdit: viewerUserId ? repository.owner.id === viewerUserId : false,
    assets: repository.assets.map(mapAsset),
    bundleSummary: {
      totalFiles: repository.assets.length,
      textFiles: repository.assets.filter((asset) => asset.isText).length,
      totalBytes,
      totalSizeLabel: formatBytes(totalBytes),
    },
    versions: repository.versions.map((version) => ({
      version: version.versionNumber,
      changelog: version.changelog,
      updatedAt: formatDate(version.createdAt),
      systemPrompt: version.systemPrompt,
      userTemplate: version.userPromptTemplate,
      variables: JSON.parse(version.variablesJson || '[]'),
      outputFormat: version.outputFormat,
      notes: version.notes ?? 'No notes provided yet.',
    })),
  };
}

export async function getRepositoryEditorData(repositoryId: string, viewerUserId: string): Promise<RepositoryEditorModel | null> {
  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, ownerId: viewerUserId },
    include: {
      owner: { select: { username: true, name: true } },
      category: { select: { slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
      compatibility: { select: { target: true } },
      assets: {
        orderBy: [{ createdAt: 'asc' }],
        select: { id: true, originalName: true, relativePath: true, mimeType: true, sizeBytes: true, isText: true, previewText: true },
      },
      latestVersion: {
        select: {
          versionNumber: true,
          systemPrompt: true,
          userPromptTemplate: true,
          variablesJson: true,
          outputFormat: true,
          notes: true,
        },
      },
    },
  });

  if (!repository || !repository.latestVersion) return null;

  return {
    id: repository.id,
    ownerUsername: repository.owner.username,
    ownerDisplayName: repository.owner.name,
    name: repository.name,
    slug: repository.slug,
    description: repository.description,
    categorySlug: repository.category.slug,
    visibility: repository.visibility,
    sourceMode: repository.sourceMode,
    tags: repository.tags.map((item) => item.tag.name),
    supportedModels: [...toSupportedModels(repository.compatibility), ...parseCustomModelNames(repository.customModelNamesJson)],
    customSupportedModels: parseCustomModelNames(repository.customModelNamesJson),
    assets: repository.assets.map(mapAsset),
    latestVersion: {
      version: repository.latestVersion.versionNumber,
      systemPrompt: repository.latestVersion.systemPrompt,
      userTemplate: repository.latestVersion.userPromptTemplate,
      variables: JSON.parse(repository.latestVersion.variablesJson || '[]'),
      outputFormat: repository.latestVersion.outputFormat,
      notes: repository.latestVersion.notes ?? '',
    },
  };
}

export async function getCreateRepositoryFormData() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return { categories };
}

export async function getExploreRepositories(filters: RepositoryCollectionFilters) {
  const rows = await prisma.repository.findMany({
    where: buildCollectionWhere(filters),
    orderBy: [{ starsCount: 'desc' }, { updatedAt: 'desc' }],
    include: baseInclude,
  });

  return rows.map(mapRepositoryBase);
}


export type RepositoryCompareData = {
  id: string;
  owner: string;
  name: string;
  slug: string;
  description: string;
  versions: {
    version: string;
    createdAt: string;
    changelog: string;
    systemPrompt: string;
    userTemplate: string;
    variables: string[];
    outputFormat: string;
    notes: string;
  }[];
};

export async function getRepositoryCompareData(owner: string, slug: string, viewerUserId?: string) : Promise<RepositoryCompareData | null> {
  const repository = await prisma.repository.findFirst({
    where: { slug, owner: { username: owner } },
    include: {
      owner: { select: { id: true, username: true } },
      versions: {
        orderBy: [{ createdAt: 'desc' }],
        select: {
          versionNumber: true,
          createdAt: true,
          changelog: true,
          systemPrompt: true,
          userPromptTemplate: true,
          variablesJson: true,
          outputFormat: true,
          notes: true,
        },
      },
    },
  });

  if (!repository) return null;
  if (repository.visibility === Visibility.PRIVATE && repository.owner.id !== viewerUserId) return null;

  return {
    id: repository.id,
    owner: repository.owner.username,
    name: repository.name,
    slug: repository.slug,
    description: repository.description,
    versions: repository.versions.map((version) => ({
      version: version.versionNumber,
      createdAt: formatDate(version.createdAt),
      changelog: version.changelog,
      systemPrompt: version.systemPrompt,
      userTemplate: version.userPromptTemplate,
      variables: JSON.parse(version.variablesJson || '[]'),
      outputFormat: version.outputFormat,
      notes: version.notes ?? '',
    })),
  };
}
