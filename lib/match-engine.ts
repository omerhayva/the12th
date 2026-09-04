import { DecisionChoice } from './scoring';

export type MatchEventType = 'GOAL' | 'SHOT' | 'CARD' | 'SUBSTITUTION' | 'CHANCE' | 'POSSESSION' | 'END';

export type MatchEvent = {
  id: string;
  minute: number;
  type: MatchEventType;
  team?: 'HOME' | 'AWAY';
  title: string;
  description?: string;
};

export type DecisionWindow = {
  id: string;
  minute: number;
  question: string;
  choices: DecisionChoice[];
  correctChoice: DecisionChoice;
  resolved: boolean;
  resolvedByEventId?: string;
};

export function evaluateDecision(decision: DecisionChoice, window: DecisionWindow) {
  if (!window.resolved) return { points: 0, label: 'BEKLEMEDE' as const };
  if (decision === window.correctChoice) return { points: 100, label: 'DOĞRU' as const };
  return { points: 35, label: 'YANLIŞ' as const };
}

export const decisionLabels: Record<DecisionChoice, string> = {
  PRESS: 'BASKI',
  DROP: 'GERİ ÇEKİL',
  CHANGE: 'DEĞİŞİKLİK',
};
