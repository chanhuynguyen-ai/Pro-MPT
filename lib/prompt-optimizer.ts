import type { GroundedRepositoryContext, RetrievalChunk } from '@/lib/retrieval';
import type { RepositoryDetailModel } from '@/lib/repositories';

export type PromptOptimizerResult = {
  mode: 'local' | 'remote' | 'demo';
  summary: string;
  analysis: string;
  strengths: string[];
  weaknesses: string[];
  optimizedSystemPrompt: string;
  optimizedUserTemplate: string;
  suggestedVariables: string[];
  suggestedOutputFormat: string;
  suggestedNotes: string;
  suggestedBundleDocs: string[];
  groundingChecklist: string[];
  citations: string[];
};

function normalizeVariable(token: string) {
  return token.replace(/[{}]/g, '').trim();
}

function parseTemplateVariables(template: string) {
  const matches = template.match(/{{\s*([^}]+?)\s*}}/g) || [];
  return matches.map((item) => normalizeVariable(item));
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function chunkTitles(chunks: RetrievalChunk[]) {
  return dedupe(chunks.map((chunk) => chunk.title));
}

function suggestVariables(detail: RepositoryDetailModel) {
  const existing = detail.versions[0]?.variables || [];
  const templateVars = parseTemplateVariables(detail.versions[0]?.userTemplate || '');
  const starter = ['goal', 'audience', 'tone'];
  return dedupe([...existing, ...templateVars, ...starter]).slice(0, 8);
}

function suggestOutputFormat(detail: RepositoryDetailModel) {
  const current = detail.versions[0]?.outputFormat?.trim() || '';
  if (/json/i.test(current)) {
    return [
      '{',
      '  "summary": "...",',
      '  "steps": ["..."],',
      '  "evidence_used": ["..."]',
      '}',
    ].join('\n');
  }

  return [
    'Markdown',
    '',
    '## Summary',
    '- Short answer',
    '',
    '## Steps',
    '1. ...',
    '2. ...',
    '',
    '## Evidence used',
    '- Cite which repo field or bundle file grounded the answer.',
    '',
    '## Missing information',
    '- Explicitly mention what the repo does not provide.',
  ].join('\n');
}

function buildOptimizedSystemPrompt(detail: RepositoryDetailModel, grounded: GroundedRepositoryContext, goal: string) {
  const current = detail.versions[0]?.systemPrompt?.trim() || '';
  const models = detail.supportedModels.length ? detail.supportedModels.join(', ') : 'All models';
  return [
    current || 'You are a repository-grounded assistant inside Prompt-Hub.',
    '',
    'Operating rules:',
    '- Stay within the scope of this repository and its uploaded bundle files.',
    '- Ground answers in repo evidence before making recommendations.',
    '- If evidence is missing, say so clearly instead of inventing details.',
    '- Prefer concise structure with explicit sections and numbered steps when helpful.',
    `- Compatible AI targets: ${models}.`,
    `- Optimization goal for this repo: ${goal}.`,
    `- Current retrieval mode available: ${grounded.retrievalMode}.`,
  ].join('\n');
}

function buildOptimizedUserTemplate(detail: RepositoryDetailModel, suggestedVariables: string[]) {
  const current = detail.versions[0]?.userTemplate?.trim();
  if (current && /{{\s*[^}]+\s*}}/.test(current)) {
    return [
      current,
      '',
      'Please answer with:',
      '- a concise summary',
      '- the main steps or recommendation',
      '- which repo evidence you used',
      '- any missing information or assumptions',
    ].join('\n');
  }

  const vars = suggestedVariables.slice(0, 4);
  const placeholders = vars.map((item) => `{{${item}}}`).join(', ');
  return [
    `Use this repository to help with ${placeholders}.`,
    'Return a grounded answer that includes:',
    '1. summary',
    '2. recommended response or steps',
    '3. evidence used from repo or bundle',
    '4. missing information',
  ].join('\n');
}

function buildSuggestedNotes(detail: RepositoryDetailModel) {
  const notes = detail.versions[0]?.notes?.trim();
  return [
    notes || 'No notes were provided before.',
    '',
    'Maintenance notes:',
    '- Keep one clear example in the bundle for the most common use case.',
    '- Add at least one failure-mode example showing how the assistant should respond when evidence is missing.',
    '- Review output format whenever you add new bundle documents.',
  ].join('\n');
}

function buildStrengths(detail: RepositoryDetailModel, grounded: GroundedRepositoryContext) {
  const strengths: string[] = [];
  if (detail.versions[0]?.systemPrompt?.trim()) strengths.push('The repository already has a dedicated system prompt.');
  if (detail.versions[0]?.userTemplate?.trim()) strengths.push('A user prompt template is present, which makes the repo reusable.');
  if (detail.versions[0]?.variables?.length) strengths.push('Variables are defined, so the prompt can be parameterized.');
  if (detail.assets.length) strengths.push(`The knowledge bundle includes ${detail.assets.length} file(s) that can ground answers.`);
  if (grounded.retrievalMode === 'vector') strengths.push('Vector retrieval is active for this repo, which improves grounding quality.');
  if (!strengths.length) strengths.push('The repo is lightweight and can still be shaped into a focused prompt skill quickly.');
  return strengths;
}

function buildWeaknesses(detail: RepositoryDetailModel, grounded: GroundedRepositoryContext) {
  const weaknesses: string[] = [];
  const latest = detail.versions[0];
  if (!latest?.userTemplate?.trim() || latest.userTemplate.trim().length < 20) weaknesses.push('The user prompt template is very short or missing important structure.');
  if (!latest?.notes?.trim()) weaknesses.push('Notes are sparse, so future maintainers may not know the intended behavior.');
  if (!detail.assets.length && detail.sourceMode === 'UPLOAD_BUNDLE') weaknesses.push('The repository is in upload mode but the bundle is empty.');
  if (grounded.retrievalMode === 'lexical') weaknesses.push('Retrieval is currently lexical fallback, so evidence ranking may be weaker than vector search.');
  if (!latest?.variables?.length) weaknesses.push('No clear variables are defined yet, which makes reuse harder.');
  if (!weaknesses.length) weaknesses.push('The main improvements now are quality polish and more representative examples.');
  return weaknesses;
}

function buildBundleDocSuggestions(detail: RepositoryDetailModel, grounded: GroundedRepositoryContext) {
  const existingTitles = chunkTitles(grounded.retrievedChunks).join(' | ');
  const suggestions = [
    'examples/good-answer.md — one strong example response using this repo',
    'examples/failure-mode.md — how the assistant should respond when evidence is missing',
    'rules/output-contract.md — required headings, JSON keys, or formatting constraints',
  ];
  if (!existingTitles.toLowerCase().includes('faq')) {
    suggestions.push('reference/faq.md — common questions and accepted answer patterns');
  }
  return suggestions.slice(0, 4);
}

function buildGroundingChecklist() {
  return [
    'Check the retrieved repo chunks before answering.',
    'Mention which repo field or bundle file grounded the answer.',
    'State what is missing if the repo does not contain enough evidence.',
    'Keep answers aligned with the declared output format.',
  ];
}

export function buildDemoOptimizerResult(detail: RepositoryDetailModel, grounded: GroundedRepositoryContext, goal: string): PromptOptimizerResult {
  const suggestedVariables = suggestVariables(detail);
  const optimizedSystemPrompt = buildOptimizedSystemPrompt(detail, grounded, goal);
  const optimizedUserTemplate = buildOptimizedUserTemplate(detail, suggestedVariables);
  return {
    mode: 'demo',
    summary: `Prompt Optimizer reviewed ${detail.owner}/${detail.slug} and prepared a stronger prompt pack aimed at ${goal.toLowerCase()}.`,
    analysis: [
      `This repo currently runs in ${detail.sourceModeLabel.toLowerCase()} mode with ${detail.bundleSummary.totalFiles} bundle file(s).`,
      `The optimizer used ${grounded.retrievalMode} retrieval and looked at ${grounded.retrievedChunks.length} grounded chunk(s).`,
      'The strongest next move is to tighten the system prompt, make the user template more explicit, and add at least one representative example document.',
    ].join(' '),
    strengths: buildStrengths(detail, grounded),
    weaknesses: buildWeaknesses(detail, grounded),
    optimizedSystemPrompt,
    optimizedUserTemplate,
    suggestedVariables,
    suggestedOutputFormat: suggestOutputFormat(detail),
    suggestedNotes: buildSuggestedNotes(detail),
    suggestedBundleDocs: buildBundleDocSuggestions(detail, grounded),
    groundingChecklist: buildGroundingChecklist(),
    citations: grounded.citations,
  };
}

export function buildOptimizationPackText(result: PromptOptimizerResult) {
  return [
    '# Prompt Optimizer Pack',
    '',
    `Summary: ${result.summary}`,
    '',
    '## Optimized system prompt',
    result.optimizedSystemPrompt,
    '',
    '## Optimized user template',
    result.optimizedUserTemplate,
    '',
    '## Suggested variables',
    result.suggestedVariables.join(', '),
    '',
    '## Suggested output format',
    result.suggestedOutputFormat,
    '',
    '## Suggested notes',
    result.suggestedNotes,
    '',
    '## Suggested bundle docs',
    ...result.suggestedBundleDocs.map((item) => `- ${item}`),
    '',
    '## Grounding checklist',
    ...result.groundingChecklist.map((item) => `- ${item}`),
  ].join('\n');
}

export function parseOptimizerJsonCandidate(text: string): Omit<PromptOptimizerResult, 'mode' | 'citations'> | null {
  const trimmed = text.trim();
  const withoutFences = trimmed.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(withoutFences.slice(start, end + 1));
    const requiredString = (value: unknown, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);
    const requiredArray = (value: unknown) => Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
    return {
      summary: requiredString(parsed.summary, 'Optimizer response was parsed without a summary.'),
      analysis: requiredString(parsed.analysis, ''),
      strengths: requiredArray(parsed.strengths),
      weaknesses: requiredArray(parsed.weaknesses),
      optimizedSystemPrompt: requiredString(parsed.optimizedSystemPrompt, ''),
      optimizedUserTemplate: requiredString(parsed.optimizedUserTemplate, ''),
      suggestedVariables: requiredArray(parsed.suggestedVariables),
      suggestedOutputFormat: requiredString(parsed.suggestedOutputFormat, ''),
      suggestedNotes: requiredString(parsed.suggestedNotes, ''),
      suggestedBundleDocs: requiredArray(parsed.suggestedBundleDocs),
      groundingChecklist: requiredArray(parsed.groundingChecklist),
    };
  } catch {
    return null;
  }
}

export function buildOptimizerInstruction(detail: RepositoryDetailModel, grounded: GroundedRepositoryContext, goal: string) {
  const latest = detail.versions[0];
  const fields = [
    `Repository: ${detail.owner}/${detail.slug}`,
    `Description: ${detail.description}`,
    `Category: ${detail.category}`,
    `Source mode: ${detail.sourceModeLabel}`,
    `Latest version: ${latest?.version || 'unknown'}`,
    `Current variables: ${(latest?.variables || []).join(', ') || 'none'}`,
    `Current output format: ${latest?.outputFormat || 'none'}`,
    `Bundle files: ${detail.bundleSummary.totalFiles}`,
    `Goal: ${goal}`,
    `Retrieval mode: ${grounded.retrievalMode}`,
  ].join('\n');

  const evidence = grounded.retrievedChunks.slice(0, 8).map((chunk, index) => `[Evidence ${index + 1}] ${chunk.title}\n${chunk.content}`).join('\n\n');

  return [
    'You are Prompt Optimizer inside Prompt-Hub.',
    'Produce a stronger prompt pack for this repository.',
    'Return STRICT JSON only.',
    'JSON schema:',
    '{',
    '  "summary": string,',
    '  "analysis": string,',
    '  "strengths": string[],',
    '  "weaknesses": string[],',
    '  "optimizedSystemPrompt": string,',
    '  "optimizedUserTemplate": string,',
    '  "suggestedVariables": string[],',
    '  "suggestedOutputFormat": string,',
    '  "suggestedNotes": string,',
    '  "suggestedBundleDocs": string[],',
    '  "groundingChecklist": string[]',
    '}',
    '',
    fields,
    '',
    'Current prompt fields:',
    `System prompt:\n${latest?.systemPrompt || ''}`,
    '',
    `User prompt template:\n${latest?.userTemplate || ''}`,
    '',
    `Notes:\n${latest?.notes || ''}`,
    '',
    'Grounded evidence:',
    evidence,
  ].join('\n');
}
