import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatWithOllama } from '@/lib/ollama';
import { retrieveRepositoryContext } from '@/lib/retrieval';
import { getRepositoryDetail } from '@/lib/repositories';
import {
  buildDemoOptimizerResult,
  buildOptimizerInstruction,
  parseOptimizerJsonCandidate,
} from '@/lib/prompt-optimizer';

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  if (Array.isArray(payload?.output)) {
    const fragments: string[] = [];
    for (const item of payload.output) {
      if (Array.isArray(item?.content)) {
        for (const part of item.content) {
          if (typeof part?.text === 'string') fragments.push(part.text);
          if (typeof part?.output_text === 'string') fragments.push(part.output_text);
        }
      }
    }
    const joined = fragments.join('\n').trim();
    if (joined) return joined;
  }
  return null;
}

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ owner: string; slug: string }> }) {
  const viewer = await getCurrentUser();
  const { owner, slug } = await params;
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
  if (!goal) return NextResponse.json({ error: 'Goal is required.' }, { status: 400 });

  const detail = await getRepositoryDetail(owner, slug, viewer?.id);
  if (!detail) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });

  const grounded = await retrieveRepositoryContext({ owner, slug, viewerUserId: viewer?.id, query: goal, maxChunks: 8 });
  if (!grounded) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });

  const fallback = buildDemoOptimizerResult(detail, grounded, goal);
  const prompt = buildOptimizerInstruction(detail, grounded, goal);

  try {
    const localModel = body?.model && typeof body.model === 'string' ? body.model.trim() : '';
    if (localModel) {
      const answer = await chatWithOllama(localModel, [
        { role: 'system', content: prompt },
        { role: 'user', content: goal },
      ]);
      const parsed = answer ? parseOptimizerJsonCandidate(answer) : null;
      if (parsed) return NextResponse.json({ mode: 'local', ...parsed, citations: grounded.citations });
      return NextResponse.json({ ...fallback, mode: 'local' });
    }

    if (process.env.OPENAI_API_KEY) {
      const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, input: `${prompt}\n\nUser goal: ${goal}` }),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Remote model request failed.');
      }
      const payload = await response.json();
      const answer = extractResponseText(payload);
      const parsed = answer ? parseOptimizerJsonCandidate(answer) : null;
      if (parsed) return NextResponse.json({ mode: 'remote', ...parsed, citations: grounded.citations });
      return NextResponse.json({ ...fallback, mode: 'remote' });
    }

    return NextResponse.json(fallback);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Prompt Coach failed.' }, { status: 500 });
  }
}
