import { NextResponse } from 'next/server';
import { choiceForEvent } from '@/lib/live-state';
import { resolveDecision as scoreDecision } from '@/lib/live-state';
import { getStore } from '@/lib/server/store';
import { getInitialLiveState } from '@/lib/live-state';
import type { MatchEventType } from '@/lib/match-engine';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    decisionId?: string;
    matchId?: string;
    eventType?: MatchEventType;
    eventMinute?: number;
  } | null;

  if (!body?.decisionId || !body.matchId || !body.eventType || typeof body.eventMinute !== 'number') {
    return NextResponse.json({ error: 'INVALID_RESOLUTION' }, { status: 400 });
  }

  const state = getInitialLiveState(body.matchId);
  const event = state.events.find((item) => item.type === body.eventType && item.minute === body.eventMinute);
  const store = await getStore();
  const decisions = await store.getMatchDecisions(body.matchId);
  const decision = decisions.find((item) => item.id === body.decisionId);

  if (!decision) return NextResponse.json({ error: 'DECISION_NOT_FOUND' }, { status: 404 });
  if (typeof decision.points === 'number') return NextResponse.json({ error: 'DECISION_ALREADY_RESOLVED' }, { status: 409 });

  const syntheticEvent = event ?? {
    id: `api-${body.eventMinute}-${body.eventType}`,
    minute: body.eventMinute,
    type: body.eventType,
    title: body.eventType,
  };
  const fallback = choiceForEvent(body.eventType);
  if (!fallback) return NextResponse.json({ error: 'EVENT_CANNOT_RESOLVE_DECISION' }, { status: 422 });

  const result = scoreDecision(decision, syntheticEvent, fallback);
  const updated = await store.resolveDecision(decision.id, {
    outcome: result.outcome,
    points: result.points,
    label: result.label,
    eventMinute: syntheticEvent.minute,
    eventType: syntheticEvent.type,
  });

  return NextResponse.json({ ok: true, decision: updated });
}
