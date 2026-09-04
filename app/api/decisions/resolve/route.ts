import { NextResponse } from 'next/server';
import { choiceForEvent, resolveDecision as scoreDecision, getInitialLiveState } from '@/lib/live-state';
import { getStore } from '@/lib/server/store';
import type { MatchEventType } from '@/lib/match-engine';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' && !process.env.THE12TH_ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_AUTH_NOT_CONFIGURED' }, { status: 503 });
  }

  if (process.env.THE12TH_ADMIN_KEY && request.headers.get('x-the12th-admin-key') !== process.env.THE12TH_ADMIN_KEY) {
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

  const state = getInitialLiveState(body.matchId);
  const event = state.events.find((item) => item.type === body.eventType && item.minute === body.eventMinute) ?? {
    id: `api-${body.eventMinute}-${body.eventType}-${Date.now()}`,
    minute: body.eventMinute,
    type: body.eventType,
    title: body.eventType,
  };
  const fallback = choiceForEvent(body.eventType);
  if (!fallback) return NextResponse.json({ error: 'EVENT_CANNOT_RESOLVE_DECISION' }, { status: 422 });

  const store = await getStore();
  const decisions = await store.getMatchDecisions(body.matchId);
  const decision = decisions.find((item) => item.id === body.decisionId);
  if (!decision) return NextResponse.json({ error: 'DECISION_NOT_FOUND' }, { status: 404 });
  if (typeof decision.points === 'number') return NextResponse.json({ error: 'DECISION_ALREADY_RESOLVED' }, { status: 409 });

  try {
    const result = scoreDecision(decision, event, fallback);
    const updated = await store.resolveDecision(decision.id, {
      outcome: result.outcome,
      points: result.points,
      label: result.label,
      eventMinute: event.minute,
      eventType: event.type,
    });
    return NextResponse.json({ ok: true, decision: updated });
  } catch (error) {
    console.error('decision resolution failed', error);
    return NextResponse.json({ error: 'DECISION_RESOLUTION_FAILED' }, { status: 500 });
  }
}
