export type EvaluationDimension = {
  key: 'clarity' | 'structure' | 'groundedness' | 'actionability';
  label: string;
  score: number;
  rationale: string;
};

export type OutputEvaluation = {
  version: string;
  overall: number;
  dimensions: EvaluationDimension[];
  strengths: string[];
  risks: string[];
};

function clamp(num: number, min = 1, max = 10) {
  return Math.max(min, Math.min(max, Math.round(num)));
}

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 4)
        .slice(0, 24),
    ),
  );
}

function overlapRatio(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((item) => setB.has(item)).length;
  return hits / Math.max(1, a.length);
}

function scoreClarity(answer: string): EvaluationDimension {
  const lines = answer.split('\n').filter(Boolean);
  const avgLineLength = lines.length ? lines.reduce((sum, line) => sum + line.length, 0) / lines.length : answer.length;
  let raw = 6;
  if (answer.length > 120) raw += 1;
  if (answer.length > 260) raw += 1;
  if (avgLineLength < 140) raw += 1;
  if (avgLineLength > 220) raw -= 1;
  if (/\b(step|bước|first|second|third|1\.|2\.)\b/i.test(answer)) raw += 1;
  return {
    key: 'clarity',
    label: 'Clarity',
    score: clamp(raw),
    rationale: avgLineLength < 160 ? 'Readable line length and reasonably segmented response.' : 'Longer lines reduce skim readability a bit.',
  };
}

function scoreStructure(answer: string, expectedFormat?: string): EvaluationDimension {
  const bulletCount = (answer.match(/^\s*[-*•]\s/mg) || []).length;
  const numberedCount = (answer.match(/^\s*\d+[.)]\s/mg) || []).length;
  const headingCount = (answer.match(/^#{1,6}\s/mg) || []).length;
  let raw = 5;
  if (bulletCount + numberedCount >= 2) raw += 2;
  if (headingCount >= 1) raw += 1;
  if (expectedFormat && /markdown|md/i.test(expectedFormat) && (headingCount > 0 || bulletCount + numberedCount > 0)) raw += 1;
  if (answer.length > 120 && bulletCount + numberedCount + headingCount === 0) raw -= 1;
  return {
    key: 'structure',
    label: 'Structure',
    score: clamp(raw),
    rationale: bulletCount + numberedCount + headingCount > 0 ? 'Uses visible structure that is easier to scan.' : 'Mostly plain paragraph text with limited structure cues.',
  };
}

function scoreGroundedness(answer: string, testInput: string, notes?: string): EvaluationDimension {
  const inputKeywords = extractKeywords(testInput);
  const answerKeywords = extractKeywords(answer);
  const noteKeywords = extractKeywords(notes || '');
  const overlap = overlapRatio(inputKeywords, answerKeywords);
  const noteOverlap = noteKeywords.length ? overlapRatio(noteKeywords, answerKeywords) : 0;
  let raw = 5 + overlap * 4 + noteOverlap * 2;
  if (/I don'?t know|không đủ thông tin|need more context/i.test(answer)) raw += 1;
  return {
    key: 'groundedness',
    label: 'Groundedness',
    score: clamp(raw),
    rationale: overlap > 0.2 ? 'Response reuses meaningful request keywords and appears closer to the task context.' : 'Lower keyword overlap suggests a more generic answer.',
  };
}

function scoreActionability(answer: string): EvaluationDimension {
  const hasSteps = /\b(step|bước|1\.|2\.|first|next|finally)\b/i.test(answer);
  const hasImperatives = /\b(use|add|check|create|review|define|write|choose|hãy|dùng|thêm|kiểm tra|tạo|viết|chọn)\b/i.test(answer);
  const hasExamples = /\bexample|ví dụ\b/i.test(answer);
  let raw = 5;
  if (hasSteps) raw += 2;
  if (hasImperatives) raw += 2;
  if (hasExamples) raw += 1;
  return {
    key: 'actionability',
    label: 'Actionability',
    score: clamp(raw),
    rationale: hasSteps || hasImperatives ? 'Contains direct next-step language that a user can follow.' : 'More descriptive than actionable.',
  };
}

export function evaluateOutput(args: { version: string; answer: string; testInput: string; outputFormat?: string; notes?: string }): OutputEvaluation {
  const dimensions = [
    scoreClarity(args.answer),
    scoreStructure(args.answer, args.outputFormat),
    scoreGroundedness(args.answer, args.testInput, args.notes),
    scoreActionability(args.answer),
  ];

  const strengths: string[] = [];
  const risks: string[] = [];

  for (const dimension of dimensions) {
    if (dimension.score >= 8) strengths.push(`${dimension.label}: ${dimension.rationale}`);
    if (dimension.score <= 5) risks.push(`${dimension.label}: ${dimension.rationale}`);
  }

  const overall = clamp(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);

  return {
    version: args.version,
    overall,
    dimensions,
    strengths: strengths.length ? strengths : ['Balanced output with no single standout strength.'],
    risks: risks.length ? risks : ['No critical weaknesses detected in the quick evaluation.'],
  };
}

export function pickWinningVersion(evaluations: OutputEvaluation[]) {
  if (evaluations.length < 2) return null;
  const sorted = [...evaluations].sort((a, b) => b.overall - a.overall);
  const [winner, runnerUp] = sorted;
  if (!winner || !runnerUp) return null;
  return {
    winnerVersion: winner.version,
    margin: winner.overall - runnerUp.overall,
    summary:
      winner.overall === runnerUp.overall
        ? 'The outputs are effectively tied in the current quick evaluation.'
        : `Version ${winner.version} leads by ${winner.overall - runnerUp.overall} point(s) in the quick evaluation.`,
  };
}
