import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatWithOllama } from '@/lib/ollama';
import { callRemoteLlm, getUserRemoteLlmConfigById } from '@/lib/remote-llm';
import { getRepositoryCompareData, getRepositoryDetail } from '@/lib/repositories';
import { evaluateOutput, pickWinningVersion } from '@/lib/output-evaluator';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function buildVersionExecutionPrompt(input: {
  owner: string;
  slug: string;
  description: string;
  version: {
    version: string;
    systemPrompt: string;
    userTemplate: string;
    variables: string[];
    outputFormat: string;
    notes: string;
  };
  assets: { relativePath: string | null; originalName: string; isText: boolean; previewText: string | null }[];
  testInput: string;
}) {
  const assetContext = input.assets.length
    ? input.assets
        .map((asset) => {
          const preview = asset.isText && asset.previewText ? `\nPreview:\n${asset.previewText.slice(0, 1500)}` : '';
          return `- ${asset.relativePath || asset.originalName}${preview}`;
        })
        .join('\n\n')
    : 'No bundle files available.';

  return [
    'You are running an A/B prompt output test inside Prompt-Hub.',
    `Repository: ${input.owner}/${input.slug}`,
    `Repository description: ${input.description}`,
    `Version under test: ${input.version.version}`,
    '',
    'System prompt for this version:',
    input.version.systemPrompt || 'No system prompt provided.',
    '',
    'User prompt template for this version:',
    input.version.userTemplate || 'No user template provided.',
    '',
    `Variables: ${input.version.variables.join(', ') || 'none'}`,
    `Requested output format: ${input.version.outputFormat || 'plain text'}`,
    `Version notes: ${input.version.notes || 'No notes provided.'}`,
    '',
    'Current repository bundle context:',
    assetContext,
    '',
    'Rules:',
    '- Answer only as this version would answer.',
    '- Use the system prompt, template, notes, and bundle context as grounding.',
    '- Do not mention that you are in a benchmark unless the user asks.',
    '- Return only the answer content, not analysis about the prompt version.',
    '',
    `User input to answer:\n${input.testInput}`,
  ].join('\n');
}

function buildDemoAnswer(version: { version: string; systemPrompt: string; userTemplate: string; variables: string[]; outputFormat: string; notes: string }, testInput: string) {
  return [
    `Demo output for version ${version.version}`,
    '',
    `User input: ${testInput}`,
    '',
    'How this version would likely respond:',
    version.systemPrompt ? `- It follows a system prompt focused on: ${version.systemPrompt.slice(0, 180)}` : '- No system prompt is defined.',
    version.userTemplate ? `- It uses a template structure like: ${version.userTemplate.slice(0, 180)}` : '- No user template is defined.',
    version.variables.length ? `- It expects variables: ${version.variables.join(', ')}` : '- It does not declare reusable variables.',
    version.outputFormat ? `- It aims for output format: ${version.outputFormat}` : '- No output format is defined.',
    version.notes ? `- Notes influencing the answer: ${version.notes.slice(0, 180)}` : '- No repo notes are defined.',
  ].join('\n');
}


async function persistCompareRun(args: {
  repositoryId: string;
  userId?: string | null;
  fromVersion: string;
  toVersion: string;
  testInput: string;
  modelLabel: string;
  mode: string;
  retrievalMode: string;
  outputs: { version: string; changelog: string; answer: string }[];
  evaluations: { version: string; overall: number; dimensions: { key: string; label: string; score: number; rationale: string }[]; strengths: string[]; risks: string[] }[];
  citations: string[];
  verdict: { winnerVersion: string; margin: number; summary: string } | null;
}) {
  await prisma.repositoryCompareRun.create({
    data: {
      repositoryId: args.repositoryId,
      userId: args.userId ?? null,
      fromVersion: args.fromVersion,
      toVersion: args.toVersion,
      testInput: args.testInput,
      modelLabel: args.modelLabel,
      mode: args.mode,
      retrievalMode: args.retrievalMode,
      outputsJson: JSON.stringify(args.outputs),
      evaluationsJson: JSON.stringify(args.evaluations),
      citationsJson: JSON.stringify(args.citations),
      winnerVersion: args.verdict?.winnerVersion ?? null,
      winnerMargin: args.verdict?.margin ?? null,
      winnerSummary: args.verdict?.summary ?? null,
    },
  });
}
export async function POST(request: Request, { params }: { params: Promise<{ owner: string; slug: string }> }) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const body = await request.json().catch(() => null);
  const fromVersionParam = typeof body?.fromVersion === 'string' ? body.fromVersion : '';
  const toVersionParam = typeof body?.toVersion === 'string' ? body.toVersion : '';
  const testInput = typeof body?.testInput === 'string' ? body.testInput.trim() : '';
  const modelKind = body?.modelKind === 'local' || body?.modelKind === 'api' ? body.modelKind : null;
  const modelValue = typeof body?.modelValue === 'string' ? body.modelValue : null;

  if (!fromVersionParam || !toVersionParam || !testInput) {
    return NextResponse.json({ error: 'fromVersion, toVersion, and testInput are required.' }, { status: 400 });
  }

  const [compareData, detail] = await Promise.all([
    getRepositoryCompareData(owner, slug, viewer?.id),
    getRepositoryDetail(owner, slug, viewer?.id),
  ]);

  if (!compareData || !detail) {
    return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
  }

  const fromVersion = compareData.versions.find((version) => version.version === fromVersionParam);
  const toVersion = compareData.versions.find((version) => version.version === toVersionParam);
  if (!fromVersion || !toVersion) {
    return NextResponse.json({ error: 'Selected versions were not found.' }, { status: 404 });
  }

  const citations = [
    `version:${fromVersion.version} field:System prompt`,
    `version:${toVersion.version} field:System prompt`,
    ...detail.assets.slice(0, 4).map((asset) => `file:${asset.relativePath || asset.originalName}`),
  ];

  const prompts = [fromVersion, toVersion].map((version) =>
    buildVersionExecutionPrompt({
      owner,
      slug,
      description: compareData.description,
      version,
      assets: detail.assets,
      testInput,
    }),
  );

  try {
    if (modelKind === 'local' && modelValue) {
      const outputs = await Promise.all(
        [fromVersion, toVersion].map(async (version, index) => ({
          version: version.version,
          changelog: version.changelog,
          answer: (await chatWithOllama(modelValue, [
            { role: 'system', content: prompts[index] },
            { role: 'user', content: testInput },
          ])) || buildDemoAnswer(version, testInput),
        })),
      );
      const evaluations = [fromVersion, toVersion].map((version, index) => evaluateOutput({ version: version.version, answer: outputs[index].answer, testInput, outputFormat: version.outputFormat, notes: version.notes }));
      const verdict = pickWinningVersion(evaluations);
      await persistCompareRun({ repositoryId: compareData.id, userId: viewer?.id, fromVersion: fromVersion.version, toVersion: toVersion.version, testInput, modelLabel: modelValue || 'Local model', mode: 'local', retrievalMode: 'lexical', outputs, evaluations, citations, verdict });
      return NextResponse.json({ mode: 'local', retrievalMode: 'lexical', promptUsed: testInput, outputs, citations, evaluations, verdict });
    }

    if (modelKind === 'api' && modelValue && viewer) {
      const config = await getUserRemoteLlmConfigById(viewer.id, modelValue);
      if (!config) return NextResponse.json({ error: 'Selected API model is unavailable.' }, { status: 404 });
      const outputs = await Promise.all(
        [fromVersion, toVersion].map(async (version, index) => ({
          version: version.version,
          changelog: version.changelog,
          answer: await callRemoteLlm(config, prompts[index]),
        })),
      );
      const evaluations = [fromVersion, toVersion].map((version, index) => evaluateOutput({ version: version.version, answer: outputs[index].answer, testInput, outputFormat: version.outputFormat, notes: version.notes }));
      const verdict = pickWinningVersion(evaluations);
      await persistCompareRun({ repositoryId: compareData.id, userId: viewer?.id, fromVersion: fromVersion.version, toVersion: toVersion.version, testInput, modelLabel: config.label?.trim() || config.model, mode: 'remote', retrievalMode: 'lexical', outputs, evaluations, citations, verdict });
      return NextResponse.json({ mode: 'remote', retrievalMode: 'lexical', promptUsed: testInput, outputs, citations, evaluations, verdict });
    }

    const outputs = [fromVersion, toVersion].map((version) => ({
      version: version.version,
      changelog: version.changelog,
      answer: buildDemoAnswer(version, testInput),
    }));

    const evaluations = [fromVersion, toVersion].map((version, index) => evaluateOutput({ version: version.version, answer: outputs[index].answer, testInput, outputFormat: version.outputFormat, notes: version.notes }));
    const verdict = pickWinningVersion(evaluations);
    await persistCompareRun({ repositoryId: compareData.id, userId: viewer?.id, fromVersion: fromVersion.version, toVersion: toVersion.version, testInput, modelLabel: 'Demo mode', mode: 'demo', retrievalMode: 'lexical', outputs, evaluations, citations, verdict });
    return NextResponse.json({ mode: 'demo', retrievalMode: 'lexical', promptUsed: testInput, outputs, citations, evaluations, verdict });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Output compare failed.' }, { status: 500 });
  }
}
