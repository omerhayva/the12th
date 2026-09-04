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

const eventTypes: MatchEventType[] = ['GOAL', 'SHOT', 'CHANCE', 'SUBSTITUTION', 'CARD', 'POSSESSION', 'END'];
const statuses = ['LIVE', 'HT', 'FT'] as const;
const teams = ['HOME', 'AWAY'] as const;
const validChoices = ['PRESS', 'DROP', 'CHANGE'] as const;
const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;
const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!authorized(request)) return NextResponse.json({ error: 'ADMIN_UNAUTHORIZED' }, { status: 401 });
  const { id } = await context.params;
  if (!id || id.length > 100) return NextResponse.json({ error: 'INVALID_MATCH_ID' }, { status: 400 });

  const body = await request.json().catch(() => null) as {
    action?: 'event' | 'meta' | 'window'; id?: string; minute?: number; type?: MatchEventType; team?: 'HOME' | 'AWAY'; title?: string; description?: string;
    homeScore?: number; awayScore?: number; status?: 'LIVE' | 'HT' | 'FT'; windowId?: string; question?: string; choices?: string[]; correctChoice?: string; resolved?: boolean; resolvedByEventId?: string;
  } | null;
  if (!body?.action) return NextResponse.json({ error: 'INVALID_ADMIN_ACTION' }, { status: 400 });

  const store = await getStore();
  const existing = await store.getMatchState(id);
  const demo = matches.find((item) => item.id === id);
  if (!existing && demo) await store.upsertMatch(demo);
  if (!existing && !demo) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 });

  if (body.action === 'event') {
    const title = cleanText(body.title, 160);
    if (!body.type || !eventTypes.includes(body.type) || typeof body.minute !== 'number' || !inRange(body.minute, 0, 130) || !title || (body.team && !teams.includes(body.team))) {
      return NextResponse.json({ error: 'INVALID_EVENT' }, { status: 400 });
    }
    const eventId = cleanText(body.id, 100) || `live-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const event = await store.createMatchEvent({ id: eventId, matchId: id, minute: body.minute, type: body.type, team: body.team, title, description: cleanText(body.description, 500) || undefined });
    return NextResponse.json({ ok: true, source: storeMode(), event });
  }

  if (body.action === 'meta') {
    const hasScore = body.homeScore !== undefined || body.awayScore !== undefined;
    const hasMinute = body.minute !== undefined;
    const hasStatus = body.status !== undefined;
    if (!hasScore && !hasMinute && !hasStatus) return NextResponse.json({ error: 'INVALID_META' }, { status: 400 });
    if ((body.homeScore !== undefined && (!inRange(body.homeScore, 0, 99) || !Number.isInteger(body.homeScore))) || (body.awayScore !== undefined && (!inRange(body.awayScore, 0, 99) || !Number.isInteger(body.awayScore))) || (body.minute !== undefined && (!inRange(body.minute, 0, 130) || !Number.isInteger(body.minute))) || (body.status !== undefined && !statuses.includes(body.status))) {
      return NextResponse.json({ error: 'INVALID_META' }, { status: 400 });
    }
    const patch = { ...(body.homeScore !== undefined ? { homeScore: body.homeScore } : {}), ...(body.awayScore !== undefined ? { awayScore: body.awayScore } : {}), ...(body.minute !== undefined ? { minute: body.minute } : {}), ...(body.status ? { status: body.status } : {}) };
    const match = await store.updateMatchMeta(id, patch);
    return NextResponse.json({ ok: true, source: storeMode(), match });
  }

  if (body.action === 'window') {
    const choices = Array.isArray(body.choices) ? [...new Set(body.choices.map((choice) => cleanText(choice, 20)))] : [];
    const question = cleanText(body.question, 240);
    const windowId = cleanText(body.windowId, 100);
    if (!windowId || typeof body.minute !== 'number' || !Number.isInteger(body.minute) || !inRange(body.minute, 0, 130) || !question || choices.length < 2 || choices.length > 3 || choices.some((choice) => !validChoices.includes(choice as (typeof validChoices)[number])) || !body.correctChoice || !choices.includes(body.correctChoice)) {
      return NextResponse.json({ error: 'INVALID_WINDOW' }, { status: 400 });
    }
    const window = await store.upsertDecisionWindow(id, { id: windowId, minute: body.minute, question, choices: choices as never, correctChoice: body.correctChoice as never, resolved: Boolean(body.resolved), resolvedByEventId: cleanText(body.resolvedByEventId, 100) || undefined });
    return NextResponse.json({ ok: true, source: storeMode(), window });
  }
  return NextResponse.json({ error: 'UNKNOWN_ADMIN_ACTION' }, { status: 400 });
}
