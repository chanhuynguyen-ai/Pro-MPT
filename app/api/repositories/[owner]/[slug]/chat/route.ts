import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getRepositoryDetail } from '@/lib/repositories';
import { buildGroundedDemoAnswer, buildGroundedPrompt, retrieveRepositoryContext } from '@/lib/retrieval';

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

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

  const repository = await getRepositoryDetail(owner, slug, viewer?.id);
  if (!repository) {
    return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
  }
  if (repository.reviewStatus === 'BLOCKED') {
    return NextResponse.json({ error: 'This repository is blocked by the safety review and cannot be used in chat until it is fixed and republished.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
  }

  const grounded = await retrieveRepositoryContext({ owner, slug, viewerUserId: viewer?.id, query: message, maxChunks: 6 });
  if (!grounded) {
    return NextResponse.json({ error: 'Repository not found.' }, { status: 404 });
  }

  const prompt = buildGroundedPrompt(grounded, message);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  if (!apiKey) {
    return NextResponse.json({ answer: buildGroundedDemoAnswer(grounded, message), mode: 'demo', citations: grounded.citations, retrievalMode: grounded.retrievalMode });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, input: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    return NextResponse.json({ error: `OpenAI request failed: ${errorText}` }, { status: 500 });
  }

  const payload = await response.json();
  const answer = extractResponseText(payload);
  if (!answer) {
    return NextResponse.json({ error: 'The model response did not contain readable text.' }, { status: 500 });
  }

  return NextResponse.json({ answer, mode: 'live', citations: grounded.citations, retrievalMode: grounded.retrievalMode });
}
