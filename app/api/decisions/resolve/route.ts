import { NextResponse } from 'next/server';
import { choiceForEvent, resolveDecision as scoreLiveDecision } from '@/lib/live-state';
import { getStore } from '@/lib/server/store';
import type { MatchEventType } from '@/lib/match-engine';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.THE12TH_ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_AUTH_NOT_CONFIGURED' }, { status: 503 });
  }

  const configuredKey = process.env.THE12TH_ADMIN_KEY;
  const suppliedKey = request.headers.get('x-the12th-admin-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (configuredKey && suppliedKey !== configuredKey) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    decisionId?: string;
    matchId?: string;
    eventType?: MatchEventType;
    eventMinute?: number;
  } | null;

  if (!body?.decisionId || !body.matchId || !body.eventType || typeof body.eventMinute !== 'number') {
    return NextResponse.json({ error: 'INVALID_RESOLUTION' }, { status: 400 });
  }
  if (body.eventMinute < 0 || body.eventMinute > 130) {
    return NextResponse.json({ error: 'INVALID_EVENT_MINUTE' }, { status: 400 });
  }

  const store = await getStore();
  const state = await store.getMatchState(body.matchId);
  const event = state?.events.find((item) => item.type === body.eventType && item.minute === body.eventMinute);
  if (!event) return NextResponse.json({ error: 'EVENT_NOT_FOUND' }, { status: 404 });

  const fallback = choiceForEvent(event.type);
  if (!fallback) return NextResponse.json({ error: 'EVENT_CANNOT_RESOLVE_DECISION' }, { status: 422 });

  const decisions = await store.getMatchDecisions(body.matchId);
  const decision = decisions.find((item) => item.id === body.decisionId);
  if (!decision) return NextResponse.json({ error: 'DECISION_NOT_FOUND' }, { status: 404 });
  if (!decision.windowId) return NextResponse.json({ error: 'DECISION_WINDOW_MISSING' }, { status: 422 });
  if (typeof decision.points === 'number') return NextResponse.json({ error: 'DECISION_ALREADY_RESOLVED' }, { status: 409 });

  try {
    const result = scoreLiveDecision({
      id: decision.id,
      matchId: decision.matchId,
      windowId: decision.windowId,
      minute: decision.minute,
      choice: decision.choice,
      lockedAt: Date.parse(decision.lockedAt),
      points: decision.points,
      label: decision.points === undefined ? 'BEKLEMEDE' : undefined,
      outcome: decision.outcome,
      eventMinute: decision.eventMinute,
      eventType: decision.eventType as MatchEventType | undefined,
    }, event, fallback);
    const updated = await store.resolveDecision(decision.id, {
      outcome: result.outcome,
      points: result.points,
      label: result.label,
      eventMinute: event.minute,
      eventType: event.type,
    });

    if (state) {
      const window = state.windows.find((item) => item.id === decision.windowId);
      if (window && !window.resolved) {
        await store.upsertDecisionWindow(body.matchId, {
          ...window,
          resolved: true,
          resolvedByEventId: event.id,
          correctChoice: result.outcome,
        });
      }
    }

    return NextResponse.json({ ok: true, decision: updated });
  } catch (error) {
    console.error('decision resolution failed', error);
    return NextResponse.json({ error: 'DECISION_RESOLUTION_FAILED' }, { status: 500 });
  }
}
