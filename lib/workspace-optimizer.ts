import type { GroundedWorkspaceContext } from '@/lib/retrieval';
import type { WorkspaceDetail } from '@/lib/workspaces';

export type WorkspaceOptimizerResult = {
  mode: 'local' | 'remote' | 'demo';
  summary: string;
  analysis: string;
  strengths: string[];
  risks: string[];
  optimizedWorkspacePrompt: string;
  suggestedOutputStyle: string;
  suggestedNotes: string;
  suggestedRepositoryGaps: string[];
  groundingChecklist: string[];
  citations: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function buildStrengths(detail: WorkspaceDetail, grounded: GroundedWorkspaceContext) {
  const strengths: string[] = [];
  if (detail.repositories.length > 1) strengths.push(`The workspace combines ${detail.repositories.length} repositories, which is useful for cross-repo reasoning.`);
  if (grounded.retrievedChunks.length >= 3) strengths.push('Enough grounded evidence was retrieved to shape a focused workspace prompt.');
  if (grounded.retrievalMode === 'vector') strengths.push('Vector retrieval is active, improving the quality of cross-repo evidence ranking.');
  if (!strengths.length) strengths.push('The workspace is lightweight and can be shaped quickly into a reusable multi-repo assistant.');
  return strengths;
}

function buildRisks(detail: WorkspaceDetail, grounded: GroundedWorkspaceContext) {
  const risks: string[] = [];
  if (detail.repositories.length < 2) risks.push('The workspace currently has fewer than two repositories, so its cross-repo value is still limited.');
  if (grounded.retrievalMode === 'lexical') risks.push('Retrieval is currently lexical fallback, so evidence ordering may be weaker than vector retrieval.');
  if (!grounded.retrievedChunks.length) risks.push('No grounded chunks were retrieved for the current optimization goal.');
  if (!risks.length) risks.push('The main remaining risks are governance and keeping repository scopes consistent over time.');
  return risks;
}

function buildWorkspacePrompt(detail: WorkspaceDetail, grounded: GroundedWorkspaceContext, goal: string) {
  return [
    'You are a workspace-level assistant inside Prompt-Hub.',
    'Operate across all repositories in the selected workspace, and synthesize their instructions into one coherent answer.',
    'Prefer grounded answers. When two repositories disagree, point out the conflict instead of guessing.',
    'State when evidence is missing.',
    '',
    `Workspace name: ${detail.name}`,
    `Workspace description: ${detail.description || 'No workspace description yet.'}`,
    `Repositories in scope: ${detail.repositories.map((repo) => repo.label).join(', ') || 'No repositories yet.'}`,
    `Optimization goal: ${goal}`,
    `Retrieval mode: ${grounded.retrievalMode}`,
    '',
    'Answer policy:',
    '- summarize the relevant repo knowledge',
    '- propose a unified response strategy',
    '- cite which repository or file grounded the answer',
    '- mention missing data and conflicts explicitly',
  ].join('\n');
}

function buildSuggestedOutputStyle() {
  return [
    'Markdown',
    '',
    '## Workspace summary',
    '- What this workspace is for',
    '',
    '## Repository roles',
    '- Repo A: ...',
    '- Repo B: ...',
    '',
    '## Recommended response',
    '1. ...',
    '2. ...',
    '',
    '## Evidence used',
    '- cite repo or file names',
    '',
    '## Conflicts or missing information',
    '- explicitly list gaps',
  ].join('\n');
}

function buildSuggestedNotes(detail: WorkspaceDetail) {
  return [
    detail.description || 'No workspace notes were provided before.',
    '',
    'Maintenance notes:',
    '- Keep repositories in this workspace focused on one shared business process or domain.',
    '- Add at least one bundle example per repository for the most common cross-repo question.',
    '- Review the workspace prompt whenever a repository is added or removed.',
  ].join('\n');
}

function buildRepositoryGaps(detail: WorkspaceDetail, grounded: GroundedWorkspaceContext) {
  const titles = grounded.retrievedChunks.map((chunk) => chunk.title).join(' | ').toLowerCase();
  const suggestions: string[] = [];
  if (!titles.includes('faq')) suggestions.push('Add one FAQ or examples document to at least one repository in this workspace.');
  if (!titles.includes('policy')) suggestions.push('Add a policy or rules document so the workspace can answer edge cases more safely.');
  if (detail.repositories.length >= 2) suggestions.push('Add one coordination note that explains how the included repositories should work together.');
  return unique(suggestions).slice(0, 4);
}

function buildGroundingChecklist() {
  return [
    'Check the top retrieved chunks before answering.',
    'Mention which repository or bundle file grounded the answer.',
    'Call out conflicts between repositories explicitly.',
    'Say what is missing if the workspace does not contain enough evidence.',
  ];
}

export function buildDemoWorkspaceOptimizerResult(detail: WorkspaceDetail, grounded: GroundedWorkspaceContext, goal: string): WorkspaceOptimizerResult {
  return {
    mode: 'demo',
    summary: `Workspace Optimizer reviewed ${detail.name} and prepared a stronger multi-repo assistant plan for ${goal.toLowerCase()}.`,
    analysis: [
      `This workspace currently includes ${detail.repositories.length} repositories.`,
      `The optimizer used ${grounded.retrievalMode} retrieval and inspected ${grounded.retrievedChunks.length} grounded chunk(s).`,
      'The main next step is to create one workspace-level system prompt that unifies repo roles and clarifies conflict handling.',
    ].join(' '),
    strengths: buildStrengths(detail, grounded),
    risks: buildRisks(detail, grounded),
    optimizedWorkspacePrompt: buildWorkspacePrompt(detail, grounded, goal),
    suggestedOutputStyle: buildSuggestedOutputStyle(),
    suggestedNotes: buildSuggestedNotes(detail),
    suggestedRepositoryGaps: buildRepositoryGaps(detail, grounded),
    groundingChecklist: buildGroundingChecklist(),
    citations: grounded.citations,
  };
}

export function buildWorkspaceOptimizerInstruction(detail: WorkspaceDetail, grounded: GroundedWorkspaceContext, goal: string) {
  const evidence = grounded.retrievedChunks
    .map((chunk, index) => [`[Chunk ${index + 1}] ${chunk.title}`, chunk.content].join('\n'))
    .join('\n\n');

  return [
    'You are an expert AI workspace optimizer.',
    'Analyze the selected Prompt-Hub workspace and return JSON only.',
    'Your job is to improve how a multi-repository chatbot should use this workspace.',
    '',
    `Workspace: ${detail.name}`,
    `Description: ${detail.description || 'No description provided.'}`,
    `Repositories: ${detail.repositories.map((repo) => repo.label).join(', ') || 'No repositories yet.'}`,
    `Goal: ${goal}`,
    `Retrieval mode: ${grounded.retrievalMode}`,
    '',
    'Grounded evidence:',
    evidence || 'No grounded chunks available.',
    '',
    'Return valid JSON with exactly these keys:',
    '{',
    '  "summary": string,',
    '  "analysis": string,',
    '  "strengths": string[],',
    '  "risks": string[],',
    '  "optimizedWorkspacePrompt": string,',
    '  "suggestedOutputStyle": string,',
    '  "suggestedNotes": string,',
    '  "suggestedRepositoryGaps": string[],',
    '  "groundingChecklist": string[]',
    '}',
    '',
    'Do not wrap the JSON in markdown fences.',
  ].join('\n');
}

export function parseWorkspaceOptimizerJsonCandidate(text: string): Omit<WorkspaceOptimizerResult, 'mode' | 'citations'> | null {
  const trimmed = text.trim();
  const withoutFences = trimmed.replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(withoutFences.slice(start, end + 1));
    const str = (value: unknown, fallback = '') => (typeof value === 'string' ? value.trim() : fallback);
    const arr = (value: unknown) => (Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []);
    return {
      summary: str(parsed.summary, 'Workspace Optimizer returned no summary.'),
      analysis: str(parsed.analysis),
      strengths: arr(parsed.strengths),
      risks: arr(parsed.risks),
      optimizedWorkspacePrompt: str(parsed.optimizedWorkspacePrompt),
      suggestedOutputStyle: str(parsed.suggestedOutputStyle),
      suggestedNotes: str(parsed.suggestedNotes),
      suggestedRepositoryGaps: arr(parsed.suggestedRepositoryGaps),
      groundingChecklist: arr(parsed.groundingChecklist),
    };
  } catch {
    return null;
  }
}

export function buildWorkspaceOptimizerPackText(result: WorkspaceOptimizerResult) {
  return [
    '# Workspace Optimizer Pack',
    '',
    `Summary: ${result.summary}`,
    '',
    '## Optimized workspace prompt',
    result.optimizedWorkspacePrompt,
    '',
    '## Suggested output style',
    result.suggestedOutputStyle,
    '',
    '## Suggested notes',
    result.suggestedNotes,
    '',
    '## Suggested repository gaps',
    ...result.suggestedRepositoryGaps.map((item) => `- ${item}`),
    '',
    '## Grounding checklist',
    ...result.groundingChecklist.map((item) => `- ${item}`),
  ].join('\n');
}
