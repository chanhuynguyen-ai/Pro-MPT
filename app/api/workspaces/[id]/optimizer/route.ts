import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatWithOllama } from '@/lib/ollama';
import { callRemoteLlm, getUserRemoteLlmConfigById } from '@/lib/remote-llm';
import { retrieveWorkspaceContext } from '@/lib/retrieval';
import { getWorkspaceDetailForUser } from '@/lib/workspaces';
import {
  buildDemoWorkspaceOptimizerResult,
  buildWorkspaceOptimizerInstruction,
  parseWorkspaceOptimizerJsonCandidate,
} from '@/lib/workspace-optimizer';

export const runtime = 'nodejs';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const goal = typeof body?.goal === 'string' ? body.goal.trim() : '';
  const modelKind = typeof body?.modelKind === 'string' ? body.modelKind.trim() : '';
  const modelValue = typeof body?.modelValue === 'string' ? body.modelValue.trim() : '';
  if (!goal) return NextResponse.json({ error: 'Goal is required.' }, { status: 400 });

  const detail = await getWorkspaceDetailForUser(id, user.id);
  if (!detail) return NextResponse.json({ error: 'Workspace not found.' }, { status: 404 });

  const grounded = await retrieveWorkspaceContext({ workspaceId: id, viewerUserId: user.id, query: goal, maxChunks: 10 });
  if (!grounded) return NextResponse.json({ error: 'Workspace grounding failed.' }, { status: 404 });

  const fallback = buildDemoWorkspaceOptimizerResult(detail, grounded, goal);
  const prompt = buildWorkspaceOptimizerInstruction(detail, grounded, goal);

  try {
    if (modelKind === 'local' && modelValue) {
      const answer = await chatWithOllama(modelValue, [
        { role: 'system', content: prompt },
        { role: 'user', content: goal },
      ]);
      const parsed = answer ? parseWorkspaceOptimizerJsonCandidate(answer) : null;
      if (parsed) return NextResponse.json({ mode: 'local', ...parsed, citations: grounded.citations });
      return NextResponse.json({ ...fallback, mode: 'local' });
    }

    if (modelKind === 'api' && modelValue) {
      const config = await getUserRemoteLlmConfigById(user.id, modelValue);
      if (!config) return NextResponse.json({ error: 'Selected API model is unavailable.' }, { status: 404 });
      const answer = await callRemoteLlm(config, `${prompt}\n\nUser goal: ${goal}`);
      const parsed = answer ? parseWorkspaceOptimizerJsonCandidate(answer) : null;
      if (parsed) return NextResponse.json({ mode: 'remote', ...parsed, citations: grounded.citations });
      return NextResponse.json({ ...fallback, mode: 'remote' });
    }

    return NextResponse.json(fallback);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Workspace Optimizer failed.' }, { status: 500 });
  }
}
