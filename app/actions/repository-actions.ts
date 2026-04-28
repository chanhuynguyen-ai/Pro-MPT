'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CompatibilityTarget, Prisma, RepositoryKind, RepositorySourceMode, Visibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import {
  COMPATIBILITY_LABEL_TO_ENUM,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
} from '@/lib/constants';
import {
  incrementVersionNumber,
  slugify,
  splitCommaSeparated,
} from '@/lib/utils';
import { clearRepositoryStorage, readStoredFile, storeUploadedFile } from '@/lib/storage';
import { rebuildRepositoryIndex } from '@/lib/indexing';
import { persistRepositorySafetyReview } from '@/lib/safety-review';


async function buildUniqueSlug(ownerId: string, baseInput: string, excludeRepositoryId?: string) {
  const baseSlug = slugify(baseInput) || 'prompt-repository';
  let candidate = baseSlug;
  let counter = 2;

  while (
    await prisma.repository.findFirst({
      where: { ownerId, slug: candidate, ...(excludeRepositoryId ? { NOT: { id: excludeRepositoryId } } : {}) },
      select: { id: true },
    })
  ) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}


function resolveCustomModelNames(raw: string) {
  return Array.from(new Set(splitCommaSeparated(raw).filter((item) => !Object.prototype.hasOwnProperty.call(COMPATIBILITY_LABEL_TO_ENUM, item))));
}

function resolveCompatibilityTargets(labels: string[]) {
  const mapped = (labels.length ? labels : ['All models'])
    .map((label) => COMPATIBILITY_LABEL_TO_ENUM[label as keyof typeof COMPATIBILITY_LABEL_TO_ENUM])
    .filter(Boolean) as CompatibilityTarget[];

  if (mapped.includes(CompatibilityTarget.ALL_MODELS)) {
    return [CompatibilityTarget.ALL_MODELS];
  }

  return Array.from(new Set(mapped));
}

function resolveSourceMode(raw: string) {
  return raw === 'UPLOAD_BUNDLE' ? RepositorySourceMode.UPLOAD_BUNDLE : RepositorySourceMode.MANUAL;
}

function resolveRepositoryKind(raw: string) {
  if (raw === 'PROMPT_IMAGE') return RepositoryKind.PROMPT_IMAGE;
  if (raw === 'SKILL') return RepositoryKind.SKILL;
  return RepositoryKind.PROMPT_TEXT;
}

function getUploadedFiles(formData: FormData) {
  return formData
    .getAll('uploadedFiles')
    .filter((file): file is File => file instanceof File && file.size > 0);
}

function validateUploadBundle(files: File[]) {
  if (!files.length) return 'missing-upload-files';
  if (files.length > MAX_UPLOAD_FILES) return 'too-many-upload-files';
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) return 'bundle-too-large';
  return null;
}

function buildBundleDefaults(name: string, files: File[]) {
  const listedFiles = files.slice(0, 8).map((file) => file.name).join(', ');
  return {
    systemPrompt:
      `You are a grounded repository assistant for the Prompt-Hub bundle "${name}". Use the uploaded files as the primary source of truth, cite the most relevant files by name when helpful, and avoid inventing details that are not supported by the bundle.`,
    userPromptTemplate:
      `Answer the user's question using the uploaded repository bundle. Question: {{question}}. Focus on the files most relevant to the request and explain any uncertainty clearly.`,
    outputFormat: 'Markdown with answer, referenced files, and next actions.',
    notes:
      listedFiles
        ? `Uploaded bundle starter. Initial file sample: ${listedFiles}.`
        : 'Uploaded bundle starter.',
  };
}

async function replaceRepositoryTags(tx: Prisma.TransactionClient, repositoryId: string, tagNames: string[]) {
  await tx.repositoryTag.deleteMany({ where: { repositoryId } });

  for (const tagName of tagNames) {
    const normalizedName = tagName.toLowerCase();
    const slug = slugify(normalizedName);
    if (!slug) continue;
    const tag = await tx.tag.upsert({
      where: { slug },
      update: { name: normalizedName },
      create: {
        name: normalizedName,
        slug,
      },
    });

    await tx.repositoryTag.create({
      data: {
        repositoryId,
        tagId: tag.id,
      },
    });
  }
}

async function replaceRepositoryCompatibility(
  tx: Prisma.TransactionClient,
  repositoryId: string,
  compatibilityTargets: CompatibilityTarget[],
) {
  await tx.repositoryCompatibility.deleteMany({ where: { repositoryId } });

  for (const target of compatibilityTargets) {
    await tx.repositoryCompatibility.create({
      data: {
        repositoryId,
        target,
      },
    });
  }
}

async function clearRepositoryAssets(repositoryId: string) {
  await prisma.repositoryAsset.deleteMany({ where: { repositoryId } });
  await clearRepositoryStorage(repositoryId);
}

async function storeRepositoryAssets(repositoryId: string, files: File[]) {
  if (!files.length) return;
  for (const file of files) {
    const stored = await storeUploadedFile({ repositoryId, file });
    await prisma.repositoryAsset.create({
      data: {
        repositoryId,
        originalName: stored.originalName,
        relativePath: stored.relativePath,
        storagePath: stored.storagePath,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        isText: stored.isText,
        previewText: stored.previewText,
      },
    });
  }
}

function repositoryCreateErrorUrl(code: string) {
  return `/dashboard/repositories/new?error=${code}`;
}

function repositoryEditErrorUrl(repositoryId: string, code: string) {
  return `/dashboard/repositories/${repositoryId}/edit?error=${code}`;
}

export async function createRepositoryAction(formData: FormData) {
  const user = await requireUser('/dashboard/repositories/new');
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const categorySlug = String(formData.get('categorySlug') || '').trim();
  const visibility = String(formData.get('visibility') || 'PUBLIC').trim() === 'PRIVATE' ? Visibility.PRIVATE : Visibility.PUBLIC;
  const kind = resolveRepositoryKind(String(formData.get('kind') || 'PROMPT_TEXT'));
  const imageStyle = String(formData.get('imageStyle') || '').trim();
  const sourceMode = resolveSourceMode(String(formData.get('sourceMode') || 'MANUAL'));
  const tags = splitCommaSeparated(String(formData.get('tags') || ''));
  const supportedModels = formData.getAll('supportedModels').map((value) => String(value));
  const compatibilityTargets = resolveCompatibilityTargets(supportedModels);
  const customModelNames = resolveCustomModelNames(String(formData.get('customSupportedModels') || ''));
  const uploadedFiles = getUploadedFiles(formData);
  const bundleDefaults = buildBundleDefaults(name || 'uploaded-bundle', uploadedFiles);
  const systemPromptRaw = String(formData.get('systemPrompt') || '').trim();
  const userPromptTemplateRaw = String(formData.get('userPromptTemplate') || '').trim();
  const variables = splitCommaSeparated(String(formData.get('variables') || ''));
  const outputFormatRaw = String(formData.get('outputFormat') || '').trim();
  const notesRaw = String(formData.get('notes') || '').trim();
  const changelog = String(formData.get('changelog') || 'Initial release.').trim();

  if (!name || !description || !categorySlug) {
    redirect(repositoryCreateErrorUrl('missing-required-fields'));
  }

  if (sourceMode === RepositorySourceMode.MANUAL && (!systemPromptRaw || !userPromptTemplateRaw || !outputFormatRaw)) {
    redirect(repositoryCreateErrorUrl('missing-manual-prompt-fields'));
  }

  if (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE) {
    const uploadError = validateUploadBundle(uploadedFiles);
    if (uploadError) {
      redirect(repositoryCreateErrorUrl(uploadError));
    }
  }

  const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });
  if (!category) {
    redirect(repositoryCreateErrorUrl('invalid-category'));
  }

  const systemPrompt = systemPromptRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.systemPrompt : '');
  const userPromptTemplate = userPromptTemplateRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.userPromptTemplate : '');
  const outputFormat = outputFormatRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.outputFormat : '');
  const notes = notesRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.notes : '');

  const slug = await buildUniqueSlug(user.id, name);

  const repository = await prisma.$transaction(async (tx) => {
    const createdRepository = await tx.repository.create({
      data: {
        ownerId: user.id,
        categoryId: category.id,
        name,
        slug,
        description,
        kind,
        imageStyle: imageStyle || null,
        customModelNamesJson: JSON.stringify(customModelNames),
        visibility,
        sourceMode,
      },
    });

    const createdVersion = await tx.repositoryVersion.create({
      data: {
        repositoryId: createdRepository.id,
        createdById: user.id,
        versionNumber: '1.0.0',
        title: name,
        shortDescription: description,
        systemPrompt,
        userPromptTemplate,
        variablesJson: JSON.stringify(variables),
        outputFormat,
        notes: notes || null,
        changelog,
        isLatest: true,
      },
    });

    await tx.repository.update({
      where: { id: createdRepository.id },
      data: { latestVersionId: createdVersion.id },
    });

    await replaceRepositoryTags(tx, createdRepository.id, tags);
    await replaceRepositoryCompatibility(tx, createdRepository.id, compatibilityTargets);

    return createdRepository;
  });

  if (uploadedFiles.length) {
    await storeRepositoryAssets(repository.id, uploadedFiles);
  }
  await rebuildRepositoryIndex(repository.id);
  await persistRepositorySafetyReview(repository.id);

  revalidatePath('/');
  revalidatePath('/explore');
  revalidatePath('/dashboard');
  revalidatePath(`/profile/${user.username}`);
  redirect(`/repositories/${user.username}/${repository.slug}?created=1`);
}

export async function publishRepositoryVersionAction(formData: FormData) {
  const repositoryId = String(formData.get('repositoryId') || '').trim();
  const user = await requireUser(repositoryId ? `/dashboard/repositories/${repositoryId}/edit` : '/dashboard');
  const name = String(formData.get('name') || '').trim();
  const slugInput = String(formData.get('slug') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const categorySlug = String(formData.get('categorySlug') || '').trim();
  const visibility = String(formData.get('visibility') || 'PUBLIC').trim() === 'PRIVATE' ? Visibility.PRIVATE : Visibility.PUBLIC;
  const kind = resolveRepositoryKind(String(formData.get('kind') || 'PROMPT_TEXT'));
  const imageStyle = String(formData.get('imageStyle') || '').trim();
  const sourceMode = resolveSourceMode(String(formData.get('sourceMode') || 'MANUAL'));
  const tags = splitCommaSeparated(String(formData.get('tags') || ''));
  const supportedModels = formData.getAll('supportedModels').map((value) => String(value));
  const compatibilityTargets = resolveCompatibilityTargets(supportedModels);
  const customModelNames = resolveCustomModelNames(String(formData.get('customSupportedModels') || ''));
  const bumpTypeRaw = String(formData.get('bumpType') || 'patch').trim();
  const bumpType = bumpTypeRaw === 'major' || bumpTypeRaw === 'minor' ? bumpTypeRaw : 'patch';
  const changelog = String(formData.get('changelog') || '').trim();
  const uploadedFiles = getUploadedFiles(formData);
  const replaceAssets = String(formData.get('replaceAssets') || '') === '1';
  const bundleDefaults = buildBundleDefaults(name || 'uploaded-bundle', uploadedFiles);
  const systemPromptRaw = String(formData.get('systemPrompt') || '').trim();
  const userPromptTemplateRaw = String(formData.get('userPromptTemplate') || '').trim();
  const variables = splitCommaSeparated(String(formData.get('variables') || ''));
  const outputFormatRaw = String(formData.get('outputFormat') || '').trim();
  const notesRaw = String(formData.get('notes') || '').trim();

  if (!repositoryId || !name || !description || !categorySlug || !changelog) {
    redirect(repositoryEditErrorUrl(repositoryId, 'missing-required-fields'));
  }

  if (sourceMode === RepositorySourceMode.MANUAL && (!systemPromptRaw || !userPromptTemplateRaw || !outputFormatRaw)) {
    redirect(repositoryEditErrorUrl(repositoryId, 'missing-manual-prompt-fields'));
  }

  if (uploadedFiles.length) {
    const uploadError = validateUploadBundle(uploadedFiles);
    if (uploadError) {
      redirect(repositoryEditErrorUrl(repositoryId, uploadError));
    }
  }

  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, ownerId: user.id },
    include: { latestVersion: true, owner: { select: { username: true } }, assets: { select: { id: true } } },
  });
  const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });

  if (!repository || !repository.latestVersion || !category) {
    redirect(repositoryEditErrorUrl(repositoryId, 'invalid-repository'));
  }

  if (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE && !uploadedFiles.length && !repository.assets.length) {
    redirect(repositoryEditErrorUrl(repositoryId, 'missing-upload-files'));
  }

  const resolvedSlug = await buildUniqueSlug(user.id, slugInput || name, repository.id);
  const nextVersion = incrementVersionNumber(repository.latestVersion.versionNumber, bumpType);
  const systemPrompt = systemPromptRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.systemPrompt : '');
  const userPromptTemplate = userPromptTemplateRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.userPromptTemplate : '');
  const outputFormat = outputFormatRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.outputFormat : '');
  const notes = notesRaw || (sourceMode === RepositorySourceMode.UPLOAD_BUNDLE ? bundleDefaults.notes : '');

  await prisma.$transaction(async (tx) => {
    await tx.repositoryVersion.updateMany({
      where: { repositoryId: repository.id, isLatest: true },
      data: { isLatest: false },
    });

    const createdVersion = await tx.repositoryVersion.create({
      data: {
        repositoryId: repository.id,
        createdById: user.id,
        versionNumber: nextVersion,
        title: name,
        shortDescription: description,
        systemPrompt,
        userPromptTemplate,
        variablesJson: JSON.stringify(variables),
        outputFormat,
        notes: notes || null,
        changelog,
        isLatest: true,
      },
    });

    await tx.repository.update({
      where: { id: repository.id },
      data: {
        name,
        slug: resolvedSlug,
        description,
        kind,
        imageStyle: imageStyle || null,
        customModelNamesJson: JSON.stringify(customModelNames),
        categoryId: category.id,
        visibility,
        sourceMode,
        latestVersionId: createdVersion.id,
      },
    });

    await replaceRepositoryTags(tx, repository.id, tags);
    await replaceRepositoryCompatibility(tx, repository.id, compatibilityTargets);
  });

  if (replaceAssets) {
    await clearRepositoryAssets(repository.id);
  }
  if (uploadedFiles.length) {
    await storeRepositoryAssets(repository.id, uploadedFiles);
  }
  await rebuildRepositoryIndex(repository.id);
  await persistRepositorySafetyReview(repository.id);

  revalidatePath('/');
  revalidatePath('/explore');
  revalidatePath('/dashboard');
  revalidatePath(`/profile/${repository.owner.username}`);
  revalidatePath(`/repositories/${repository.owner.username}/${repository.slug}`);
  redirect(`/repositories/${repository.owner.username}/${resolvedSlug}?updated=1`);
}

export async function deleteRepositoryAction(formData: FormData) {
  const repositoryId = String(formData.get('repositoryId') || '').trim();
  const confirmation = String(formData.get('confirmation') || '').trim();
  const user = await requireUser(repositoryId ? `/dashboard/repositories/${repositoryId}/edit` : '/dashboard');

  const repository = await prisma.repository.findFirst({
    where: { id: repositoryId, ownerId: user.id },
    select: { id: true, name: true, slug: true, owner: { select: { username: true } } },
  });

  if (!repository) {
    redirect('/dashboard?error=repository-not-found');
  }

  if (confirmation !== repository.name) {
    redirect(repositoryEditErrorUrl(repository.id, 'delete-confirmation-mismatch'));
  }

  await clearRepositoryAssets(repository.id);
  await prisma.repository.delete({ where: { id: repository.id } });

  revalidatePath('/');
  revalidatePath('/explore');
  revalidatePath('/dashboard');
  revalidatePath(`/profile/${user.username}`);
  redirect('/dashboard?deleted=1');
}

export async function toggleStarRepositoryAction(formData: FormData) {
  const repositoryId = String(formData.get('repositoryId') || '').trim();
  const owner = String(formData.get('owner') || '').trim();
  const slug = String(formData.get('slug') || '').trim();
  const user = await requireUser(`/repositories/${owner}/${slug}`);

  const existing = await prisma.star.findUnique({
    where: { userId_repositoryId: { userId: user.id, repositoryId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.star.delete({ where: { userId_repositoryId: { userId: user.id, repositoryId } } }),
      prisma.repository.update({ where: { id: repositoryId }, data: { starsCount: { decrement: 1 } } }),
    ]);
    revalidatePath(`/repositories/${owner}/${slug}`);
    redirect(`/repositories/${owner}/${slug}?starred=0`);
  }

  await prisma.$transaction([
    prisma.star.create({ data: { userId: user.id, repositoryId } }),
    prisma.repository.update({ where: { id: repositoryId }, data: { starsCount: { increment: 1 } } }),
  ]);
  revalidatePath(`/repositories/${owner}/${slug}`);
  redirect(`/repositories/${owner}/${slug}?starred=1`);
}

export async function cloneRepositoryAction(formData: FormData) {
  const sourceRepositoryId = String(formData.get('sourceRepositoryId') || '').trim();
  const sourceOwner = String(formData.get('sourceOwner') || '').trim();
  const sourceSlug = String(formData.get('sourceSlug') || '').trim();
  const user = await requireUser(`/repositories/${sourceOwner}/${sourceSlug}`);

  const source = await prisma.repository.findFirst({
    where: {
      id: sourceRepositoryId,
      owner: { username: sourceOwner },
    },
    include: {
      owner: { select: { username: true } },
      latestVersion: true,
      tags: { include: { tag: true } },
      compatibility: { select: { target: true } },
      assets: { select: { originalName: true, mimeType: true, sizeBytes: true, isText: true, previewText: true, storagePath: true, relativePath: true } },
    },
  });

  if (!source || !source.latestVersion) {
    redirect(`/repositories/${sourceOwner}/${sourceSlug}`);
  }

  if (source.visibility === Visibility.PRIVATE && source.ownerId !== user.id) {
    redirect(`/repositories/${sourceOwner}/${sourceSlug}`);
  }

  const cloneName = `${source.name}-clone`;
  const cloneSlug = await buildUniqueSlug(user.id, cloneName);

  const clonedRepository = await prisma.$transaction(async (tx) => {
    const createdRepository = await tx.repository.create({
      data: {
        ownerId: user.id,
        categoryId: source.categoryId,
        name: cloneName,
        slug: cloneSlug,
        description: `${source.description} (cloned from ${source.owner.username}/${source.slug})`,
        kind: source.kind,
        imageStyle: source.imageStyle,
        customModelNamesJson: source.customModelNamesJson,
        visibility: Visibility.PRIVATE,
        sourceMode: source.sourceMode,
      },
    });

    const createdVersion = await tx.repositoryVersion.create({
      data: {
        repositoryId: createdRepository.id,
        createdById: user.id,
        versionNumber: '1.0.0',
        title: cloneName,
        shortDescription: source.description,
        systemPrompt: source.latestVersion.systemPrompt,
        userPromptTemplate: source.latestVersion.userPromptTemplate,
        variablesJson: source.latestVersion.variablesJson,
        outputFormat: source.latestVersion.outputFormat,
        notes: source.latestVersion.notes,
        changelog: `Cloned from ${source.owner.username}/${source.slug}`,
        isLatest: true,
      },
    });

    await tx.repository.update({
      where: { id: createdRepository.id },
      data: { latestVersionId: createdVersion.id },
    });

    await tx.clone.create({
      data: {
        sourceRepositoryId: source.id,
        clonedRepositoryId: createdRepository.id,
        userId: user.id,
      },
    });

    await tx.repository.update({
      where: { id: source.id },
      data: { clonesCount: { increment: 1 } },
    });

    await replaceRepositoryTags(tx, createdRepository.id, source.tags.map((item) => item.tag.name));
    await replaceRepositoryCompatibility(tx, createdRepository.id, source.compatibility.map((item) => item.target));

    return createdRepository;
  });

  if (source.assets.length) {
    const recreatedFiles = await Promise.all(
      source.assets.map(async (asset) => {
        const data = await readStoredFile(asset.storagePath);
        return new File([data], asset.originalName, { type: asset.mimeType || 'application/octet-stream' });
      }),
    );
    await storeRepositoryAssets(clonedRepository.id, recreatedFiles);
  }
  await rebuildRepositoryIndex(clonedRepository.id);
  await persistRepositorySafetyReview(clonedRepository.id);

  revalidatePath('/dashboard');
  revalidatePath(`/profile/${user.username}`);
  revalidatePath(`/repositories/${sourceOwner}/${sourceSlug}`);
  redirect(`/repositories/${user.username}/${clonedRepository.slug}?cloned=1`);
}
