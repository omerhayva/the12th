export type DecisionChoice =
  | 'PRESS' | 'DROP' | 'CHANGE'
  | 'RESULT_HOME' | 'RESULT_DRAW' | 'RESULT_AWAY'
  | 'SCORE_0_0' | 'SCORE_1_0' | 'SCORE_0_1' | 'SCORE_1_1' | 'SCORE_2_0' | 'SCORE_0_2' | 'SCORE_2_1' | 'SCORE_1_2' | 'SCORE_2_2' | 'SCORE_3_0' | 'SCORE_0_3' | 'OTHER_SCORE'
  | 'FIRST_GOAL_HOME' | 'FIRST_GOAL_AWAY' | 'NO_GOAL'
  | 'NEXT_CARD_HOME' | 'NEXT_CARD_AWAY' | 'NO_CARD'
  | 'OVER_2_5' | 'UNDER_2_5'
  | 'BTTS_YES' | 'BTTS_NO'
  | 'NEXT_EVENT_GOAL' | 'NEXT_EVENT_SHOT' | 'NEXT_EVENT_CARD' | 'NEXT_EVENT_SUBSTITUTION' | 'NEXT_EVENT_NONE';

export type Decision = {
  id: string;
  windowId?: string;
  matchId?: string;
  minute: number;
  choice: DecisionChoice;
  outcome: DecisionChoice;
  points: number;
  eventMinute?: number;
  eventType?: string;
};

export type ScoringContext = { decisionMinute?: number; eventMinute?: number; eventType?: string };

const EVENT_WEIGHT: Record<string, number> = { GOAL: 1.2, CHANCE: 1.1, SHOT: 1, SUBSTITUTION: 0.9, CARD: 0.8, POSSESSION: 0.7, END: 0.5 };

function timingScore(delta: number) { if (delta <= 2) return 100; if (delta <= 5) return 90; if (delta <= 10) return 75; if (delta <= 20) return 60; return 45; }

export function scoreDecision(choice: DecisionChoice, actual: DecisionChoice, context: ScoringContext = {}) {
  const correct = choice === actual;
  const eventWeight = context.eventType ? (EVENT_WEIGHT[context.eventType] ?? 1) : 1;
  const delta = Math.abs((context.eventMinute ?? context.decisionMinute ?? 0) - (context.decisionMinute ?? 0));
  if (!correct) return Math.max(0, Math.min(35, Math.round(35 * Math.min(1, eventWeight))));
  const timing = timingScore(delta);
  return Math.max(0, Math.min(100, Math.round(85 + (timing - 75) * 0.2 + Math.max(-4, Math.min(4, (eventWeight - 1) * 8)))));
}

export function calculateIQ(decisions: Decision[]) { const resolved = decisions.filter((d) => typeof d.points === 'number'); if (!resolved.length) return 0; return Math.round(Math.max(0, Math.min(100, resolved.reduce((s, d) => s + d.points, 0) / resolved.length))); }

export function calculateBreakdown(decisions: Decision[]) {
  const resolved = decisions.filter((d) => typeof d.points === 'number');
  if (!resolved.length) return { prediction: 0, reading: 0, tactical: 0, timing: 0, consistency: 0 };
  const correct = resolved.filter((d) => d.choice === d.outcome).length;
  const prediction = Math.round((correct / resolved.length) * 100);
  const reading = Math.round(resolved.reduce((s, d) => s + d.points, 0) / resolved.length);
  const tacticalChoices = resolved.map((d) => d.choice);
  const switches = tacticalChoices.slice(1).filter((choice, index) => choice !== tacticalChoices[index]).length;
  const switchRate = resolved.length > 1 ? switches / (resolved.length - 1) : 0;
  const tactical = Math.round(Math.max(0, Math.min(100, reading * 0.75 + prediction * 0.25 - switchRate * 8)));
  const timed = resolved.filter((d) => typeof d.eventMinute === 'number');
  const timing = timed.length ? Math.round(timed.reduce((s, d) => s + timingScore(Math.abs((d.eventMinute ?? d.minute) - d.minute)), 0) / timed.length) : 0;
  const mean = resolved.reduce((s, d) => s + d.points, 0) / resolved.length;
  const deviation = resolved.reduce((s, d) => s + Math.abs(d.points - mean), 0) / resolved.length;
  return { prediction, reading, tactical, timing, consistency: Math.round(Math.max(0, Math.min(100, 100 - deviation * 1.4))) };
}
