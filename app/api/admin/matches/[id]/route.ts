import { NextResponse } from 'next/server';
import { getStore, storeMode } from '@/lib/server/store';
import type { MatchEventType } from '@/lib/match-engine';
import { matches } from '@/lib/demo-data';

function authorized(request: Request) {
  const expected = process.env.THE12TH_ADMIN_KEY;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const supplied = request.headers.get('x-the12th-admin-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return supplied === expected;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: 'ADMIN_UNAUTHORIZED' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as {
    action?: 'event' | 'meta' | 'window';
    minute?: number;
    type?: MatchEventType;
    team?: 'HOME' | 'AWAY';
    title?: string;
    description?: string;
    homeScore?: number;
    awayScore?: number;
    status?: 'LIVE' | 'HT' | 'FT';
    windowId?: string;
    question?: string;
    choices?: string[];
    correctChoice?: string;
    resolved?: boolean;
    resolvedByEventId?: string;
  } | null;
  if (!body?.action) return NextResponse.json({ error: 'INVALID_ADMIN_ACTION' }, { status: 400 });

  const store = await getStore();
  const demo = matches.find((item) => item.id === id);
  const existing = await store.getMatchState(id);
  if (!existing && demo) await store.upsertMatch(demo);
  if (!existing && !demo) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 });

  if (body.action === 'event') {
    if (!body.type || typeof body.minute !== 'number' || !body.title) return NextResponse.json({ error: 'INVALID_EVENT' }, { status: 400 });
    const event = await store.createMatchEvent({ id: `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, matchId: id, minute: body.minute, type: body.type, team: body.team, title: body.title, description: body.description });
    return NextResponse.json({ ok: true, source: storeMode(), event });
  }

  if (body.action === 'meta') {
    const patch = { ...(typeof body.homeScore === 'number' ? { homeScore: body.homeScore } : {}), ...(typeof body.awayScore === 'number' ? { awayScore: body.awayScore } : {}), ...(typeof body.minute === 'number' ? { minute: body.minute } : {}), ...(body.status ? { status: body.status } : {}) };
    const match = await store.updateMatchMeta(id, patch);
    return NextResponse.json({ ok: true, source: storeMode(), match });
  }

  if (body.action === 'window') {
    if (!body.windowId || typeof body.minute !== 'number' || !body.question || !body.choices?.length || !body.correctChoice) return NextResponse.json({ error: 'INVALID_WINDOW' }, { status: 400 });
    const window = await store.upsertDecisionWindow(id, { id: body.windowId, minute: body.minute, question: body.question, choices: body.choices as never, correctChoice: body.correctChoice as never, resolved: Boolean(body.resolved), resolvedByEventId: body.resolvedByEventId });
    return NextResponse.json({ ok: true, source: storeMode(), window });
  }

  return NextResponse.json({ error: 'UNKNOWN_ADMIN_ACTION' }, { status: 400 });
}
