export type DecisionChoice = 'PRESS' | 'DROP' | 'CHANGE';

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

export type ScoringContext = {
  decisionMinute?: number;
  eventMinute?: number;
  eventType?: string;
};

const EVENT_WEIGHT: Record<string, number> = {
  GOAL: 1.2,
  CHANCE: 1.1,
  SHOT: 1,
  SUBSTITUTION: 0.9,
  CARD: 0.8,
  POSSESSION: 0.7,
  END: 0.5,
};

function timingScore(delta: number) {
  if (delta <= 2) return 100;
  if (delta <= 5) return 90;
  if (delta <= 10) return 75;
  if (delta <= 20) return 60;
  return 45;
}

export function scoreDecision(choice: DecisionChoice, actual: DecisionChoice, context: ScoringContext = {}) {
  const correct = choice === actual;
  const eventWeight = context.eventType ? (EVENT_WEIGHT[context.eventType] ?? 1) : 1;
  const decisionMinute = context.decisionMinute ?? 0;
  const eventMinute = context.eventMinute ?? decisionMinute;
  const delta = Math.abs(eventMinute - decisionMinute);

  if (!correct) {
    const penalty = Math.round(35 * Math.min(1, eventWeight));
    return Math.max(0, Math.min(35, penalty));
  }

  const timing = timingScore(delta);
  const timingBonus = Math.round((timing - 75) * 0.2);
  const eventBonus = Math.max(-4, Math.min(4, (eventWeight - 1) * 8));
  return Math.max(0, Math.min(100, Math.round(85 + timingBonus + eventBonus)));
}

export function calculateIQ(decisions: Decision[]) {
  const resolved = decisions.filter((decision) => typeof decision.points === 'number');
  if (!resolved.length) return 0;
  const raw = resolved.reduce((sum, decision) => sum + decision.points, 0) / resolved.length;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function calculateBreakdown(decisions: Decision[]) {
  const resolved = decisions.filter((decision) => typeof decision.points === 'number');
  if (!resolved.length) return { prediction: 0, reading: 0, tactical: 0, timing: 0, consistency: 0 };

  const correct = resolved.filter((d) => d.choice === d.outcome).length;
  const prediction = Math.round((correct / resolved.length) * 100);
  const reading = Math.round(resolved.reduce((s, d) => s + d.points, 0) / resolved.length);

  const tacticalChoices = resolved.map((d) => d.choice);
  const switches = tacticalChoices.slice(1).filter((choice, index) => choice !== tacticalChoices[index]).length;
  const switchRate = resolved.length > 1 ? switches / (resolved.length - 1) : 0;
  const tactical = Math.round(Math.max(0, Math.min(100, reading * 0.75 + prediction * 0.25 - switchRate * 8)));

  const timed = resolved.filter((d) => typeof d.eventMinute === 'number');
  const timing = timed.length
    ? Math.round(timed.reduce((sum, d) => sum + timingScore(Math.abs((d.eventMinute ?? d.minute) - d.minute)), 0) / timed.length)
    : 0;

  const mean = resolved.reduce((s, d) => s + d.points, 0) / resolved.length;
  const meanDeviation = resolved.reduce((sum, d) => sum + Math.abs(d.points - mean), 0) / resolved.length;
  const consistency = Math.round(Math.max(0, Math.min(100, 100 - meanDeviation * 1.4)));

  return { prediction, reading, tactical, timing, consistency };
}
