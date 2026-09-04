import { NextResponse } from 'next/server';
import type { DecisionChoice } from '@/lib/scoring';
import { demoFootballProvider } from '@/lib/football/demo-provider';
import { getStore, storeMode } from '@/lib/server/store';

const choices: DecisionChoice[] = ['PRESS', 'DROP', 'CHANGE'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    playerId?: string;
    playerName?: string;
    matchId?: string;
    windowId?: string;
    choice?: DecisionChoice;
  } | null;

  if (!body?.playerId || !uuidPattern.test(body.playerId) || !body.matchId || !body.windowId || !body.choice || !choices.includes(body.choice)) {
    return NextResponse.json({ error: 'INVALID_DECISION' }, { status: 400 });
  }

  const [match, windows] = await Promise.all([
    demoFootballProvider.getMatch(body.matchId),
    demoFootballProvider.getDecisionWindows(body.matchId),
  ]);
  if (!match) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 });

  const window = windows.find((item) => item.id === body.windowId);
  if (!window) return NextResponse.json({ error: 'WINDOW_NOT_FOUND' }, { status: 404 });
  if (window.resolved) return NextResponse.json({ error: 'WINDOW_ALREADY_RESOLVED' }, { status: 409 });

  const store = await getStore();
  const existing = await store.getPlayer(body.playerId);
  await store.upsertPlayer(existing ?? {
    id: body.playerId,
    name: body.playerName?.trim().slice(0, 24) || `12TH #${body.playerId.slice(0, 4).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  });

  try {
    const decision = await store.createDecision({
      playerId: body.playerId,
      matchId: body.matchId,
      windowId: body.windowId,
      minute: Math.max(0, Math.min(130, match.minute)),
      choice: body.choice,
      lockedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, source: storeMode(), decision });
  } catch (error) {
    if (error instanceof Error && error.message === 'DECISION_ALREADY_EXISTS') {
      return NextResponse.json({ error: 'DECISION_ALREADY_EXISTS' }, { status: 409 });
    }
    console.error('decision persistence failed', error);
    return NextResponse.json({ error: 'DECISION_PERSISTENCE_FAILED' }, { status: 500 });
  }
}
