import { NextResponse } from 'next/server';
import type { DecisionChoice } from '@/lib/scoring';
import { getInitialLiveState, getLiveStateKey, writeLiveState } from '@/lib/live-state';

const choices: DecisionChoice[] = ['PRESS', 'DROP', 'CHANGE'];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    playerId?: string;
    matchId?: string;
    windowId?: string;
    choice?: DecisionChoice;
  } | null;

  if (!body?.playerId || !body.matchId || !body.windowId || !body.choice || !choices.includes(body.choice)) {
    return NextResponse.json({ error: 'INVALID_DECISION' }, { status: 400 });
  }

  const state = getInitialLiveState(body.matchId);
  const window = state.windows.find((item) => item.id === body.windowId);
  if (!window) return NextResponse.json({ error: 'WINDOW_NOT_FOUND' }, { status: 404 });
  if (window.resolved) return NextResponse.json({ error: 'WINDOW_ALREADY_RESOLVED' }, { status: 409 });

  const decision = {
    id: `${body.playerId}-${body.windowId}`,
    windowId: body.windowId,
    matchId: body.matchId,
    minute: state.meta.minute,
    choice: body.choice,
    lockedAt: Date.now(),
  };

  return NextResponse.json({ ok: true, decision, storageKey: getLiveStateKey(body.matchId), note: 'Persistence adapter pending' });
}
