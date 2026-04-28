import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatWithOllama } from '@/lib/ollama';
import { callRemoteLlm, getUserRemoteLlmConfigById } from '@/lib/remote-llm';
import {
  buildGroundedDemoAnswer,
  buildGroundedPrompt,
  buildWorkspaceDemoAnswer,
  buildWorkspaceGroundedPrompt,
  retrieveRepositoryContext,
  retrieveWorkspaceContext,
} from '@/lib/retrieval';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const repositoryId = typeof body?.repositoryId === 'string' ? body.repositoryId : '';
  const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : '';
  const modelKind = typeof body?.modelKind === 'string' ? body.modelKind.trim() : '';
  const modelValue = typeof body?.modelValue === 'string' ? body.modelValue.trim() : '';

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

  if (modelKind === 'local' && modelValue) {
    try {
      const answer = await chatWithOllama(modelValue, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ]);
      if (!answer) throw new Error('No readable response returned by the local model.');
      return NextResponse.json({ answer, mode: 'local', citations, retrievalMode });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Local model request failed.' }, { status: 500 });
    }
  }

  if (modelKind === 'api' && modelValue) {
    try {
      const config = await getUserRemoteLlmConfigById(user.id, modelValue);
      if (!config) return NextResponse.json({ error: 'Selected API model is unavailable.' }, { status: 404 });
      const answer = await callRemoteLlm(config, `${systemPrompt}\n\nUser question: ${message}`);
      return NextResponse.json({ answer, mode: 'remote', citations, retrievalMode });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Remote model request failed.' }, { status: 500 });
    }
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
            'To enable full answers, add a local Ollama model or save a cloud API model in Settings.',
          ].join('\n'),
    mode: 'demo',
    citations,
    retrievalMode,
  });
}
