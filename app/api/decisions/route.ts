import { NextResponse } from 'next/server';
import type { DecisionChoice } from '@/lib/scoring';
import { bsdFootballProvider } from '@/lib/football/bsd-provider';
import { getStore, storeMode } from '@/lib/server/store';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { playerId?: string; playerName?: string; matchId?: string; windowId?: string; choice?: DecisionChoice } | null;
  if (!body?.playerId || !uuidPattern.test(body.playerId) || !body.matchId || !body.windowId || !body.choice) return NextResponse.json({ error: 'INVALID_DECISION' }, { status: 400 });

  const store = await getStore();
  const storedState = await store.getMatchState(body.matchId);
  let match = storedState?.match ?? null;
  let windows = storedState?.windows ?? [];

  if (!match && process.env.BSD_FOOTBALL_API_KEY) {
    try { match = await bsdFootballProvider.getMatch(body.matchId); windows = match ? await bsdFootballProvider.getDecisionWindows(body.matchId) : []; }
    catch (error) { console.error('BSD decision match lookup failed:', error); }
  }
  if (!match) return NextResponse.json({ error: process.env.BSD_FOOTBALL_API_KEY ? 'MATCH_NOT_FOUND' : 'LIVE_FEED_NOT_CONFIGURED' }, { status: process.env.BSD_FOOTBALL_API_KEY ? 404 : 503 });

  const window = windows.find((item) => item.id === body.windowId);
  if (!window) return NextResponse.json({ error: 'WINDOW_NOT_FOUND' }, { status: 404 });
  if (window.resolved) return NextResponse.json({ error: 'WINDOW_ALREADY_RESOLVED' }, { status: 409 });
  if (!window.choices.includes(body.choice)) return NextResponse.json({ error: 'INVALID_CHOICE_FOR_WINDOW' }, { status: 400 });

  const existing = await store.getPlayer(body.playerId);
  await store.upsertPlayer(existing ?? { id: body.playerId, name: body.playerName?.trim().slice(0, 24) || `12TH #${body.playerId.slice(0, 4).toUpperCase()}`, createdAt: new Date().toISOString() });

  try {
    const decision = await store.createDecision({ playerId: body.playerId, matchId: body.matchId, windowId: body.windowId, minute: Math.max(0, Math.min(130, match.minute)), choice: body.choice, lockedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, source: storeMode(), decision });
  } catch (error) {
    if (error instanceof Error && error.message === 'DECISION_ALREADY_EXISTS') return NextResponse.json({ error: 'DECISION_ALREADY_EXISTS' }, { status: 409 });
    console.error('decision persistence failed', error); return NextResponse.json({ error: 'DECISION_PERSISTENCE_FAILED' }, { status: 500 });
  }
}
