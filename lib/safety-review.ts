import { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ReviewFinding = {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  snippets: string[];
  description: string;
};

type ReviewResult = {
  status: ReviewStatus;
  score: number;
  summary: string;
  flags: string[];
  details: ReviewFinding[];
  reviewedAt: Date;
};

type RiskRule = {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  patterns: RegExp[];
};

const RISK_RULES: RiskRule[] = [
  {
    id: 'instruction-override',
    title: 'Dấu hiệu prompt injection / ghi đè chỉ dẫn',
    description: 'Repo có câu lệnh cố gắng ép chatbot bỏ qua system/developer instructions hoặc ghi đè quy tắc hiện có.',
    severity: 'high',
    score: 34,
    patterns: [
      /ignore (all|any|the)? ?(previous|prior|above)? ?instructions?/i,
      /disregard (all|the)? ?(previous|prior)? ?instructions?/i,
      /bỏ qua (tất cả|mọi|toàn bộ)? ?(hướng dẫn|chỉ dẫn|quy tắc)/i,
      /system prompt/i,
      /developer (message|instruction|prompt)/i,
      /override (the )?(instructions?|rules?)/i,
      /jailbreak/i,
      /act as the system/i,
    ],
  },
  {
    id: 'secret-request',
    title: 'Yêu cầu bí mật / secret',
    description: 'Repo yêu cầu người dùng đưa mật khẩu, API key, OTP, token, private key hoặc credential tương tự.',
    severity: 'critical',
    score: 40,
    patterns: [
      /api[_ -]?key/i,
      /access token/i,
      /bearer token/i,
      /password/i,
      /mật khẩu/i,
      /otp/i,
      /2fa/i,
      /seed phrase/i,
      /private key/i,
      /secret key/i,
      /wallet address/i,
      /recovery code/i,
      /client secret/i,
    ],
  },
  {
    id: 'personal-data-request',
    title: 'Yêu cầu dữ liệu cá nhân nhạy cảm',
    description: 'Repo yêu cầu CV, sơ yếu lý lịch, CCCD, số tài khoản, thẻ tín dụng, địa chỉ nhà hoặc PII không cần thiết.',
    severity: 'high',
    score: 30,
    patterns: [
      /sơ yếu lý lịch/i,
      /curriculum vitae/i,
      /\bcv\b/i,
      /cccd/i,
      /căn cước/i,
      /bank account/i,
      /số tài khoản/i,
      /credit card/i,
      /thẻ tín dụng/i,
      /passport/i,
      /social security/i,
      /địa chỉ nhà/i,
      /số điện thoại/i,
      /email cá nhân/i,
      /date of birth/i,
    ],
  },
  {
    id: 'exfiltration',
    title: 'Dấu hiệu gửi dữ liệu ra ngoài',
    description: 'Repo có yêu cầu gửi / upload / forward dữ liệu đến webhook, URL ngoài, email hoặc đích không minh bạch.',
    severity: 'critical',
    score: 42,
    patterns: [
      /send .* to /i,
      /gửi .* cho /i,
      /upload .* to /i,
      /post .* to /i,
      /forward .* to /i,
      /webhook/i,
      /https?:\/\//i,
      /email .*@/i,
    ],
  },
  {
    id: 'financial-abuse',
    title: 'Yêu cầu giao dịch tài chính / chuyển khoản',
    description: 'Repo có lệnh chuyển khoản, wire money, thanh toán hoặc thao tác tài chính đáng ngờ.',
    severity: 'critical',
    score: 48,
    patterns: [/chuyển khoản/i, /wire money/i, /bank transfer/i, /send money/i, /payment link/i],
  },
];

function normalizeText(parts: string[]) {
  return parts.filter(Boolean).join('\n\n');
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function extractSnippet(source: string, pattern: RegExp) {
  const match = source.match(pattern);
  if (!match?.index && match?.index !== 0) return null;
  const start = Math.max(0, match.index - 60);
  const end = Math.min(source.length, match.index + (match[0]?.length ?? 0) + 80);
  return source.slice(start, end).replace(/\s+/g, ' ').trim();
}

function analyze(parts: string[]): ReviewFinding[] {
  const joined = normalizeText(parts);
  if (!joined) return [];

  return RISK_RULES.flatMap((rule) => {
    const snippets = unique(
      rule.patterns
        .map((pattern) => extractSnippet(joined, pattern))
        .filter((snippet): snippet is string => Boolean(snippet))
        .slice(0, 3),
    );

    if (!snippets.length) return [];

    return [{
      id: rule.id,
      title: rule.title,
      severity: rule.severity,
      score: rule.score,
      snippets,
      description: rule.description,
    }];
  });
}

function calculateStatus(findings: ReviewFinding[]): { status: ReviewStatus; score: number } {
  const score = Math.min(100, findings.reduce((sum, item) => sum + item.score, 0));
  const criticalCount = findings.filter((item) => item.severity === 'critical').length;
  const highCount = findings.filter((item) => item.severity === 'high').length;

  if (criticalCount >= 2 || score >= 75 || (criticalCount >= 1 && highCount >= 1)) {
    return { status: ReviewStatus.BLOCKED, score };
  }
  if (score >= 30 || findings.length > 0) {
    return { status: ReviewStatus.WARNING, score };
  }
  return { status: ReviewStatus.REVIEWED, score };
}

function buildSummary(status: ReviewStatus, score: number, findings: ReviewFinding[], fileCount: number, textFileCount: number) {
  if (!findings.length) {
    return fileCount
      ? `Đã kiểm duyệt: không phát hiện dấu hiệu prompt injection hoặc thu thập dữ liệu nhạy cảm trong prompt và ${textFileCount} file văn bản có thể đọc.`
      : 'Đã kiểm duyệt: không phát hiện dấu hiệu prompt injection hoặc yêu cầu thu thập dữ liệu nhạy cảm trong nội dung repo.';
  }

  const labels = findings.map((item) => item.title).join('; ');
  if (status === ReviewStatus.BLOCKED) {
    return `Repo bị chặn an toàn (điểm rủi ro ${score}/100): phát hiện tín hiệu nghiêm trọng gồm ${labels}. Không nên dùng repo này trực tiếp cho chatbot cho đến khi đã rà soát và sửa nội dung.`;
  }

  return `Cảnh báo kiểm duyệt (điểm rủi ro ${score}/100): phát hiện ${findings.length} nhóm rủi ro gồm ${labels}. Hãy rà soát kỹ prompt và file đính kèm trước khi dùng.`;
}

export async function reviewRepositorySafety(repositoryId: string): Promise<ReviewResult> {
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    include: {
      latestVersion: {
        select: {
          systemPrompt: true,
          userPromptTemplate: true,
          outputFormat: true,
          notes: true,
          changelog: true,
          variablesJson: true,
        },
      },
      assets: {
        select: {
          isText: true,
          originalName: true,
          relativePath: true,
          previewText: true,
        },
      },
    },
  });

  const reviewedAt = new Date();

  if (!repository || !repository.latestVersion) {
    return {
      status: ReviewStatus.REVIEWED,
      score: 0,
      summary: 'Đã kiểm duyệt: chưa có đủ dữ liệu để đánh giá chi tiết.',
      flags: [],
      details: [],
      reviewedAt,
    };
  }

  const latest = repository.latestVersion;
  const assetTexts = repository.assets
    .filter((asset) => asset.isText && asset.previewText)
    .map((asset) => `File: ${asset.relativePath || asset.originalName}\n${asset.previewText}`);

  const findings = analyze([
    latest.systemPrompt,
    latest.userPromptTemplate,
    latest.outputFormat,
    latest.notes ?? '',
    latest.changelog,
    latest.variablesJson,
    ...assetTexts,
  ]);

  const { status, score } = calculateStatus(findings);
  const flags = findings.map((item) => item.title);

  return {
    status,
    score,
    summary: buildSummary(status, score, findings, repository.assets.length, repository.assets.filter((asset) => asset.isText).length),
    flags,
    details: findings,
    reviewedAt,
  };
}

export async function persistRepositorySafetyReview(repositoryId: string) {
  const result = await reviewRepositorySafety(repositoryId);

  await prisma.repository.update({
    where: { id: repositoryId },
    data: {
      reviewStatus: result.status,
      reviewScore: result.score,
      reviewSummary: result.summary,
      reviewFlagsJson: JSON.stringify(result.flags),
      reviewDetailsJson: JSON.stringify(result.details),
      reviewedAt: result.reviewedAt,
    },
  });

  return result;
}
