import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatWithOllama } from '@/lib/ollama';
import {
  buildGroundedDemoAnswer,
  buildGroundedPrompt,
  buildWorkspaceDemoAnswer,
  buildWorkspaceGroundedPrompt,
  retrieveRepositoryContext,
  retrieveWorkspaceContext,
} from '@/lib/retrieval';

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

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const repositoryId = typeof body?.repositoryId === 'string' ? body.repositoryId : '';
  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : '';
  const model = typeof body?.model === 'string' ? body.model.trim() : '';

  if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });

  const groundedRepo = !workspaceId && repositoryId
    ? await retrieveRepositoryContext({ repositoryId, viewerUserId: user.id, query: message, maxChunks: 6 })
    : null;
  const groundedWorkspace = workspaceId
    ? await retrieveWorkspaceContext({ workspaceId, viewerUserId: user.id, query: message, maxChunks: 8 })
    : null;

  const systemPrompt = groundedWorkspace
    ? buildWorkspaceGroundedPrompt(groundedWorkspace, message)
    : groundedRepo
      ? buildGroundedPrompt(groundedRepo, message)
      : [
          'You are Crow-Chat inside Prompt-Hub.',
          'No repository or workspace library is selected. Answer generally and suggest selecting a repo or workspace when grounding is needed.',
          `User question: ${message}`,
        ].join('\n');

  const citations = groundedWorkspace?.citations ?? groundedRepo?.citations ?? [];
  const retrievalMode = groundedWorkspace?.retrievalMode ?? groundedRepo?.retrievalMode ?? 'lexical';

  if (model) {
    try {
      const answer = await chatWithOllama(model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ]);
      if (!answer) throw new Error('No readable response returned by the local model.');
      return NextResponse.json({ answer, mode: 'local', citations, retrievalMode });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Local model request failed.' }, { status: 500 });
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const remoteModel = process.env.OPENAI_MODEL || 'gpt-5-mini';
  if (apiKey) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: remoteModel, input: `${systemPrompt}\n\nUser question: ${message}` }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json({ error: text || 'Remote model request failed.' }, { status: 500 });
    }
    const payload = await response.json();
    const answer = extractResponseText(payload);
    if (!answer) return NextResponse.json({ error: 'Remote model returned no readable text.' }, { status: 500 });
    return NextResponse.json({ answer, mode: 'remote', citations, retrievalMode });
  }

  return NextResponse.json({
    answer: groundedWorkspace
      ? buildWorkspaceDemoAnswer(groundedWorkspace, message)
      : groundedRepo
        ? buildGroundedDemoAnswer(groundedRepo, message)
        : [
            'Crow-Chat demo mode',
            '',
            'No repository or workspace library is selected.',
            '',
            `User request: ${message}`,
            '',
            'To enable full answers, install a local Ollama model from Settings or add OPENAI_API_KEY to .env.',
          ].join('\n'),
    mode: 'demo',
    citations,
    retrievalMode,
  });
}
