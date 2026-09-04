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

export function scoreDecision(choice: DecisionChoice, actual: DecisionChoice, context: ScoringContext = {}) {
  const correct = choice === actual;
  const base = correct ? 100 : 35;
  const eventWeight = context.eventType ? (EVENT_WEIGHT[context.eventType] ?? 1) : 1;

  if (!correct) return Math.round(35 * Math.min(1.1, 0.9 + eventWeight * 0.1));

  const decisionMinute = context.decisionMinute ?? 0;
  const eventMinute = context.eventMinute ?? decisionMinute;
  const delta = Math.abs(eventMinute - decisionMinute);

  // A decision that survives longer before the linked event is more valuable,
  // but we deliberately cap the bonus so timing cannot dominate football IQ.
  const timingBonus = Math.min(10, delta * 1.5);
  const weighted = 100 + timingBonus + (eventWeight - 1) * 8;
  return Math.round(Math.min(115, weighted));
}

export function calculateIQ(decisions: Decision[]) {
  if (!decisions.length) return 0;
  const raw = decisions.reduce((sum, decision) => sum + decision.points, 0) / decisions.length;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function calculateBreakdown(decisions: Decision[]) {
  if (!decisions.length) return { prediction: 0, reading: 0, tactical: 0, timing: 0, consistency: 0 };

  const correct = decisions.filter((d) => d.choice === d.outcome).length;
  const prediction = Math.round((correct / decisions.length) * 100);
  const reading = Math.round(decisions.reduce((s, d) => s + d.points, 0) / decisions.length);

  const tacticalChoices = decisions.map((d) => d.choice);
  const switches = tacticalChoices.slice(1).filter((choice, index) => choice !== tacticalChoices[index]).length;
  const switchRate = decisions.length > 1 ? switches / (decisions.length - 1) : 0;
  const tactical = Math.round(Math.max(0, Math.min(100, reading * 0.75 + prediction * 0.25 - switchRate * 8)));

  const timed = decisions.filter((d) => typeof d.eventMinute === 'number');
  const timing = timed.length
    ? Math.round(timed.reduce((sum, d) => sum + Math.max(0, 100 - Math.min(60, Math.abs((d.eventMinute ?? d.minute) - d.minute) * 4)), 0) / timed.length)
    : Math.round(decisions.reduce((sum, d) => sum + Math.max(0, 100 - Math.min(60, d.minute)), 0) / decisions.length);

  const mean = decisions.reduce((s, d) => s + d.points, 0) / decisions.length;
  const variance = decisions.reduce((sum, d) => sum + Math.abs(d.points - mean), 0) / decisions.length;
  const consistency = Math.round(Math.max(0, Math.min(100, 100 - variance * 0.65)));

  return { prediction, reading: Math.min(100, reading), tactical, timing, consistency };
}
