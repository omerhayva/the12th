export type DecisionChoice = 'PRESS' | 'DROP' | 'CHANGE';

export type Decision = {
  id: string;
  minute: number;
  choice: DecisionChoice;
  outcome: DecisionChoice;
  points: number;
};

export function scoreDecision(choice: DecisionChoice, actual: DecisionChoice) {
  return choice === actual ? 100 : 35;
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
  const tactical = Math.round(reading * 0.92 + prediction * 0.08);
  const timing = Math.round(85 + (correct / decisions.length) * 15);
  const consistency = Math.round(100 - Math.min(40, Math.abs(50 - reading) * 0.4));
  return { prediction, reading, tactical, timing, consistency };
}
