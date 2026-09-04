import type { DecisionChoice } from './scoring';

export type MatchEventType = 'GOAL' | 'SHOT' | 'CARD' | 'SUBSTITUTION' | 'CHANCE' | 'POSSESSION' | 'END';

export type MatchEvent = { id: string; minute: number; type: MatchEventType; team?: 'HOME' | 'AWAY'; title: string; description?: string };

export type DecisionWindow = {
  id: string;
  minute: number;
  question: string;
  choices: DecisionChoice[];
  correctChoice: DecisionChoice | null;
  resolved: boolean;
  resolvedByEventId?: string;
};

export function evaluateDecision(decision: DecisionChoice, window: DecisionWindow) {
  if (!window.resolved || !window.correctChoice) return { points: 0, label: 'BEKLEMEDE' as const };
  if (decision === window.correctChoice) return { points: 100, label: 'DOĞRU' as const };
  return { points: 35, label: 'YANLIŞ' as const };
}

export const decisionLabels: Record<DecisionChoice, string> = {
  PRESS: 'BASKI', DROP: 'GERİ ÇEKİL', CHANGE: 'DEĞİŞİKLİK',
  RESULT_HOME: 'EV SAHİBİ KAZANIR', RESULT_DRAW: 'BERABERE', RESULT_AWAY: 'DEPLASMAN KAZANIR',
  SCORE_0_0: '0 — 0', SCORE_1_0: '1 — 0', SCORE_0_1: '0 — 1', SCORE_1_1: '1 — 1', SCORE_2_0: '2 — 0', SCORE_0_2: '0 — 2', SCORE_2_1: '2 — 1', SCORE_1_2: '1 — 2', SCORE_2_2: '2 — 2', SCORE_3_0: '3 — 0', SCORE_0_3: '0 — 3', OTHER_SCORE: 'DİĞER SKOR',
  FIRST_GOAL_HOME: 'EV SAHİBİ İLK GOL', FIRST_GOAL_AWAY: 'DEPLASMAN İLK GOL', NO_GOAL: 'GOL OLMAZ',
  NEXT_CARD_HOME: 'SIRADAKİ KART EV SAHİBİ', NEXT_CARD_AWAY: 'SIRADAKİ KART DEPLASMAN', NO_CARD: 'KART ÇIKMAZ',
  OVER_2_5: '2.5 ÜSTÜ', UNDER_2_5: '2.5 ALTI', BTTS_YES: 'İKİSİ DE GOL ATAR', BTTS_NO: 'İKİSİ DE GOL ATMAZ',
  NEXT_EVENT_GOAL: 'SIRADAKİ OLAY: GOL', NEXT_EVENT_SHOT: 'SIRADAKİ OLAY: ŞUT', NEXT_EVENT_CARD: 'SIRADAKİ OLAY: KART', NEXT_EVENT_SUBSTITUTION: 'SIRADAKİ OLAY: DEĞİŞİKLİK', NEXT_EVENT_NONE: 'SIRADAKİ OLAY YOK',
};
