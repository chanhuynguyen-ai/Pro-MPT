'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CompatibilityTarget, Visibility } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { COMPATIBILITY_LABEL_TO_ENUM, DEMO_OWNER_USERNAME } from '@/lib/constants';
import { slugify, splitCommaSeparated } from '@/lib/utils';

async function buildUniqueSlug(ownerId: string, baseInput: string) {
  const baseSlug = slugify(baseInput) || 'prompt-repository';
  let candidate = baseSlug;
  let counter = 2;

  while (await prisma.repository.findFirst({ where: { ownerId, slug: candidate }, select: { id: true } })) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function createRepositoryAction(formData: FormData) {
  const ownerUsername = String(formData.get('ownerUsername') || DEMO_OWNER_USERNAME).trim();
  const name = String(formData.get('name') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const categorySlug = String(formData.get('categorySlug') || '').trim();
  const visibility: Visibility =
    String(formData.get('visibility') || 'PUBLIC').trim() === 'PRIVATE' ? Visibility.PRIVATE : Visibility.PUBLIC;
  const systemPrompt = String(formData.get('systemPrompt') || '').trim();
  const userPromptTemplate = String(formData.get('userPromptTemplate') || '').trim();
  const variables = splitCommaSeparated(String(formData.get('variables') || ''));
  const outputFormat = String(formData.get('outputFormat') || '').trim();
  const notes = String(formData.get('notes') || '').trim();
  const changelog = String(formData.get('changelog') || 'Initial release.').trim() || 'Initial release.';
  const tagNames = splitCommaSeparated(String(formData.get('tags') || ''));
  const supportedModelLabels = Array.from(new Set(formData.getAll('supportedModels').map((value) => String(value))));

  if (!name || !description || !categorySlug || !systemPrompt || !userPromptTemplate || !outputFormat) {
    redirect('/dashboard/repositories/new?error=missing-required-fields');
  }

  const owner = await prisma.user.findUnique({ where: { username: ownerUsername }, select: { id: true, username: true } });
  const category = await prisma.category.findUnique({ where: { slug: categorySlug }, select: { id: true } });

  if (!owner || !category) {
    redirect('/dashboard/repositories/new?error=invalid-owner-or-category');
  }

  const compatibilityTargets: CompatibilityTarget[] = (supportedModelLabels.length ? supportedModelLabels : ['All models'])
    .map((label) => COMPATIBILITY_LABEL_TO_ENUM[label as keyof typeof COMPATIBILITY_LABEL_TO_ENUM])
    .filter(Boolean) as CompatibilityTarget[];

  if (compatibilityTargets.includes(CompatibilityTarget.ALL_MODELS)) {
    compatibilityTargets.splice(0, compatibilityTargets.length, CompatibilityTarget.ALL_MODELS);
  }

  const slug = await buildUniqueSlug(owner.id, name);

  const result = await prisma.$transaction(async (tx) => {
    const repository = await tx.repository.create({
      data: {
        ownerId: owner.id,
        categoryId: category.id,
        name,
        slug,
        description,
        visibility,
      },
    });

    const version = await tx.repositoryVersion.create({
      data: {
        repositoryId: repository.id,
        createdById: owner.id,
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
      where: { id: repository.id },
      data: {
        latestVersionId: version.id,
      },
    });

    for (const tagName of tagNames) {
      const normalizedName = tagName.toLowerCase();
      const tag = await tx.tag.upsert({
        where: { slug: slugify(normalizedName) },
        update: { name: normalizedName },
        create: {
          name: normalizedName,
          slug: slugify(normalizedName),
        },
      });

      await tx.repositoryTag.create({
        data: {
          repositoryId: repository.id,
          tagId: tag.id,
        },
      });
    }

    for (const target of compatibilityTargets) {
      await tx.repositoryCompatibility.create({
        data: {
          repositoryId: repository.id,
          target,
        },
      });
    }

    return {
      ownerUsername: owner.username,
      slug: repository.slug,
    };
  });

  revalidatePath('/');
  revalidatePath('/explore');
  revalidatePath('/dashboard');
  revalidatePath(`/profile/${result.ownerUsername}`);
  revalidatePath(`/repositories/${result.ownerUsername}/${result.slug}`);
  redirect(`/repositories/${result.ownerUsername}/${result.slug}?created=1`);
}
