const { PrismaClient, Visibility, CompatibilityTarget, RepositorySourceMode } = require('@prisma/client');
const { randomUUID, scryptSync } = require('node:crypto');
const { rm, mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();
const STORAGE_DRIVER = process.env.STORAGE_DRIVER || 'local';
const STORAGE_ROOT = process.env.STORAGE_ROOT_DIR || path.join(process.cwd(), 'storage', 'repository-assets');
const S3_BUCKET = process.env.S3_BUCKET || '';
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === '1';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || '';

let s3Client = null;
function getS3Client() {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  return s3Client;
}

function hashPassword(password) {
  const salt = randomUUID().replace(/-/g, '');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function clearSeedStorage() {
  if (STORAGE_DRIVER === 'local') {
    await rm(STORAGE_ROOT, { recursive: true, force: true }).catch(() => {});
    return;
  }
  if (STORAGE_DRIVER === 's3' && S3_BUCKET) {
    const client = getS3Client();
    let token;
    while (true) {
      const listed = await client.send(new ListObjectsV2Command({ Bucket: S3_BUCKET, ContinuationToken: token }));
      const objects = (listed.Contents || []).map((item) => item.Key).filter(Boolean);
      if (objects.length) {
        await client.send(new DeleteObjectsCommand({ Bucket: S3_BUCKET, Delete: { Objects: objects.map((Key) => ({ Key })) } }));
      }
      if (!listed.IsTruncated) break;
      token = listed.NextContinuationToken;
    }
  }
}

async function attachSeedAsset(repositoryId, originalName, content, mimeType = 'text/plain') {
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${originalName}`;
  let storagePath;

  if (STORAGE_DRIVER === 'local') {
    const repoDir = path.join(STORAGE_ROOT, repositoryId);
    await mkdir(repoDir, { recursive: true });
    storagePath = path.join(repoDir, storedName);
    await writeFile(storagePath, content);
  } else {
    storagePath = `${repositoryId}/${storedName}`;
    const client = getS3Client();
    await client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: storagePath, Body: Buffer.from(content), ContentType: mimeType }));
  }

  await prisma.repositoryAsset.create({
    data: {
      repositoryId,
      originalName,
      relativePath: null,
      storagePath,
      mimeType,
      sizeBytes: Buffer.byteLength(content),
      isText: true,
      previewText: content.slice(0, 2000),
    },
  });
}

async function main() {
  await clearSeedStorage();

  await prisma.session.deleteMany();
  await prisma.download.deleteMany();
  await prisma.clone.deleteMany();
  await prisma.star.deleteMany();
  await prisma.workspaceRepository.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.repositoryCompatibility.deleteMany();
  await prisma.repositoryTag.deleteMany();
  await prisma.repositoryChunk.deleteMany();
  await prisma.repositoryAsset.deleteMany();
  await prisma.repositoryVersion.deleteMany();
  await prisma.repository.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const sharedPassword = hashPassword('prompt1234');

  const users = await Promise.all([
    prisma.user.create({ data: { name: 'Hung Nguyen', username: 'hungdev', email: 'hungdev@example.com', passwordHash: sharedPassword, bio: 'Backend-focused builder creating prompt repos for product and engineering workflows.' } }),
    prisma.user.create({ data: { name: 'Alina Tran', username: 'alina', email: 'alina@example.com', passwordHash: sharedPassword, bio: 'Education workflow designer sharing practical teaching prompt skills.' } }),
    prisma.user.create({ data: { name: 'Minh Le', username: 'chefminh', email: 'chefminh@example.com', passwordHash: sharedPassword, bio: 'Home cooking creator focused on fast and realistic meal-planning prompts.' } }),
    prisma.user.create({ data: { name: 'Mai Pham', username: 'maiops', email: 'maiops@example.com', passwordHash: sharedPassword, bio: 'Support operations lead experimenting with triage and QA prompt workflows.' } }),
  ]);

  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Development', slug: 'development' } }),
    prisma.category.create({ data: { name: 'Education', slug: 'education' } }),
    prisma.category.create({ data: { name: 'Cooking', slug: 'cooking' } }),
    prisma.category.create({ data: { name: 'Marketing', slug: 'marketing' } }),
    prisma.category.create({ data: { name: 'Customer Support', slug: 'customer-support' } }),
  ]);

  const getUser = (username) => users.find((user) => user.username === username);
  const getCategory = (slug) => categories.find((category) => category.slug === slug);

  const repositories = [
    {
      owner: 'alina', category: 'education', name: 'teacher-assistant-vn', slug: 'teacher-assistant-vn',
      description: 'Prompt skill cho trợ lý dạy học tiếng Việt với giọng điệu rõ ràng, có ví dụ và cấu trúc đầu ra ổn định.',
      tags: ['teaching', 'vietnamese', 'lesson-plan', 'kids'], compatibility: [CompatibilityTarget.CHATGPT, CompatibilityTarget.CLAUDE, CompatibilityTarget.GEMINI], visibility: Visibility.PUBLIC, sourceMode: RepositorySourceMode.MANUAL,
      stats: { starsCount: 128, clonesCount: 41, downloadsCount: 85 },
      versions: [
        { versionNumber: '1.1.0', changelog: 'Bổ sung hướng dẫn tạo bài tập và rubric chấm điểm.', systemPrompt: 'You are a supportive Vietnamese teaching assistant. Explain clearly, age-appropriately, and structure outputs with learning goals, examples, and practice tasks.', userPromptTemplate: 'Create a lesson for {{topic}} aimed at {{audience}}. Tone: {{tone}}. Duration: {{duration}} minutes.', variables: ['topic', 'audience', 'tone', 'duration'], outputFormat: 'Markdown with sections: Objectives, Explanation, Example, Practice, Homework.', notes: 'Designed for grade-school teachers and tutoring workflows.' },
        { versionNumber: '1.0.0', changelog: 'Initial public release.', systemPrompt: 'You are a Vietnamese teaching assistant that writes concise and friendly lessons for children.', userPromptTemplate: 'Create a short lesson about {{topic}} for {{audience}}.', variables: ['topic', 'audience'], outputFormat: 'Markdown.', notes: 'Starter version.' },
      ],
    },
    {
      owner: 'hungdev', category: 'development', name: 'api-architect', slug: 'api-architect',
      description: 'Prompt skill cho thiết kế backend, API contracts, task breakdown và chuẩn repo theo hơi hướng GitHub issues.',
      tags: ['backend', 'api', 'nodejs', 'architecture'], compatibility: [CompatibilityTarget.CLAUDE_CODE, CompatibilityTarget.CLAUDE, CompatibilityTarget.CHATGPT], visibility: Visibility.PUBLIC, sourceMode: RepositorySourceMode.MANUAL,
      stats: { starsCount: 264, clonesCount: 93, downloadsCount: 167 },
      versions: [
        { versionNumber: '2.0.0', changelog: 'Tái cấu trúc output thành Architecture, Endpoints, Risks, Delivery Plan.', systemPrompt: 'You are a senior backend architect. Respond like a practical tech lead. Optimize for maintainability, clarity, and incremental delivery.', userPromptTemplate: 'Design an API for {{product}} using {{stack}}. Constraints: {{constraints}}. Deadline: {{deadline}}.', variables: ['product', 'stack', 'constraints', 'deadline'], outputFormat: 'Markdown with sections and API tables.', notes: 'Works well for internal planning and project kickoffs.' },
        { versionNumber: '1.3.0', changelog: 'Added edge case and validation rules.', systemPrompt: 'You are a senior backend engineer specializing in REST APIs and scalable systems.', userPromptTemplate: 'Design API endpoints and project structure for {{product}} in {{stack}}.', variables: ['product', 'stack'], outputFormat: 'Markdown.', notes: 'Earlier stable version.' },
      ],
    },
    {
      owner: 'chefminh', category: 'cooking', name: 'meal-planner-fast', slug: 'meal-planner-fast', description: 'Bộ prompt hỗ trợ lên thực đơn, gợi ý nguyên liệu thay thế và tối ưu thời gian nấu ăn.',
      tags: ['meal-plan', 'cooking', 'budget', 'healthy'], compatibility: [CompatibilityTarget.ALL_MODELS], visibility: Visibility.PUBLIC, sourceMode: RepositorySourceMode.MANUAL,
      stats: { starsCount: 76, clonesCount: 20, downloadsCount: 38 },
      versions: [
        { versionNumber: '1.0.2', changelog: 'Tinh chỉnh output rõ nguyên liệu và thời gian hơn.', systemPrompt: 'You are a practical home cooking assistant focused on speed, affordability, and clear steps.', userPromptTemplate: 'Create a meal plan for {{people}} people with {{budget}} budget and {{time_limit}} minutes max.', variables: ['people', 'budget', 'time_limit'], outputFormat: 'Markdown bullet list plus shopping list.', notes: 'Great for short-form planning and daily cooking.' },
      ],
    },
    {
      owner: 'maiops', category: 'customer-support', name: 'support-triage-copilot', slug: 'support-triage-copilot', description: 'Prompt repo cho phân loại ticket, tạo response draft và escalation summary cho đội chăm sóc khách hàng.',
      tags: ['support', 'triage', 'tickets', 'operations'], compatibility: [CompatibilityTarget.CHATGPT, CompatibilityTarget.GEMINI], visibility: Visibility.PUBLIC, sourceMode: RepositorySourceMode.UPLOAD_BUNDLE,
      stats: { starsCount: 91, clonesCount: 27, downloadsCount: 54 },
      versions: [
        { versionNumber: '1.2.0', changelog: 'Bổ sung output schema cho escalation summary và CSAT recovery cases.', systemPrompt: 'You are a customer support operations assistant. Classify tickets, assess urgency, and draft calm, actionable responses using the uploaded support runbook bundle as your main context.', userPromptTemplate: 'Use the repository bundle to triage the following ticket for {{product}}. Customer message: {{ticket}}.', variables: ['product', 'ticket'], outputFormat: 'Markdown with sections: Severity, Root Cause Guess, Draft Reply, Escalation Recommendation.', notes: 'Optimized for support inbox review workflows and backed by uploaded policy files.' },
      ],
      assets: [
        { name: 'refund-policy.md', content: '# Refund policy\n\n- Full refund allowed within 7 days for accidental double charges.\n- Partial refund may be offered for service degradation.\n- Escalate enterprise contracts to finance.', mimeType: 'text/markdown' },
        { name: 'triage-severity.csv', content: 'issue_type,severity\nbilling_lockout,high\nfeature_request,low\nsecurity_report,critical\nlogin_issue,medium', mimeType: 'text/csv' },
      ],
    },
    {
      owner: 'hungdev', category: 'marketing', name: 'private-growth-notes', slug: 'private-growth-notes', description: 'Private repository for experimenting with founder-side marketing prompts before publishing.',
      tags: ['growth', 'private', 'draft'], compatibility: [CompatibilityTarget.CHATGPT], visibility: Visibility.PRIVATE, sourceMode: RepositorySourceMode.MANUAL,
      stats: { starsCount: 0, clonesCount: 0, downloadsCount: 0 },
      versions: [
        { versionNumber: '0.1.0', changelog: 'Initial private draft.', systemPrompt: 'You are a founder-side growth assistant focused on experiments, positioning, and concise execution notes.', userPromptTemplate: 'Draft a growth experiment for {{channel}} targeting {{segment}} with budget {{budget}}.', variables: ['channel', 'segment', 'budget'], outputFormat: 'Markdown with hypotheses and metrics.', notes: 'Private working draft.' },
      ],
    },
  ];

  const createdRepositories = [];

  for (const item of repositories) {
    const owner = getUser(item.owner);
    const category = getCategory(item.category);
    const repository = await prisma.repository.create({
      data: {
        ownerId: owner.id,
        categoryId: category.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        visibility: item.visibility,
        sourceMode: item.sourceMode,
        starsCount: item.stats.starsCount,
        clonesCount: item.stats.clonesCount,
        downloadsCount: item.stats.downloadsCount,
      },
    });

    let latestVersionId = null;
    for (const version of item.versions) {
      const createdVersion = await prisma.repositoryVersion.create({
        data: {
          repositoryId: repository.id,
          createdById: owner.id,
          versionNumber: version.versionNumber,
          title: item.name,
          shortDescription: item.description,
          systemPrompt: version.systemPrompt,
          userPromptTemplate: version.userPromptTemplate,
          variablesJson: JSON.stringify(version.variables),
          outputFormat: version.outputFormat,
          notes: version.notes,
          changelog: version.changelog,
          isLatest: version === item.versions[0],
        },
      });
      if (version === item.versions[0]) latestVersionId = createdVersion.id;
    }

    await prisma.repository.update({ where: { id: repository.id }, data: { latestVersionId } });

    for (const tagName of item.tags) {
      const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tag = await prisma.tag.upsert({ where: { slug }, update: { name: tagName.toLowerCase() }, create: { name: tagName.toLowerCase(), slug } });
      await prisma.repositoryTag.create({ data: { repositoryId: repository.id, tagId: tag.id } });
    }

    for (const target of item.compatibility) {
      await prisma.repositoryCompatibility.create({ data: { repositoryId: repository.id, target } });
    }

    if (item.assets?.length) {
      for (const asset of item.assets) {
        await attachSeedAsset(repository.id, asset.name, asset.content, asset.mimeType);
      }
    }

    createdRepositories.push({ id: repository.id, owner: item.owner, slug: item.slug, sourceMode: item.sourceMode });
  }

  const hungdev = getUser('hungdev');
  const workspace = await prisma.workspace.create({
    data: {
      ownerId: hungdev.id,
      name: 'Support + Growth Ops',
      description: 'Starter MVP2 workspace combining private growth notes with a starred support repo.',
    },
  });

  const workspaceRepoSlugs = ['private-growth-notes', 'support-triage-copilot'];
  for (const repo of createdRepositories.filter((item) => workspaceRepoSlugs.includes(item.slug))) {
    await prisma.workspaceRepository.create({
      data: { workspaceId: workspace.id, repositoryId: repo.id },
    });
  }

  const supportRepo = createdRepositories.find((item) => item.slug === 'support-triage-copilot');
  if (supportRepo) {
    await prisma.star.create({ data: { userId: hungdev.id, repositoryId: supportRepo.id } });
    await prisma.repository.update({ where: { id: supportRepo.id }, data: { starsCount: { increment: 1 } } });
  }

  console.log('Seed complete. Demo users: hungdev@example.com, alina@example.com, chefminh@example.com, maiops@example.com (password: prompt1234)');
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => prisma.$disconnect());
