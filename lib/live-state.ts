import type { DecisionChoice } from './scoring';
import type { DecisionWindow, MatchEvent, MatchEventType } from './match-engine';
import { demoEvents, demoWindows } from './demo-data';

export type LiveDecision = {
  windowId: string;
  matchId?: string;
  minute: number;
  choice: DecisionChoice;
  lockedAt: number;
  points?: number;
  label?: 'DOĞRU' | 'YANLIŞ' | 'BEKLEMEDE';
  outcome?: DecisionChoice;
};

export type LiveMatchState = {
  events: MatchEvent[];
  windows: DecisionWindow[];
  decisions: LiveDecision[];
};

export const LIVE_STATE_PREFIX = 'the12th:live:';

export function getLiveStateKey(matchId: string) { return `${LIVE_STATE_PREFIX}${matchId}`; }

export function getInitialLiveState(matchId: string): LiveMatchState {
  return { events: demoEvents[matchId] ?? [], windows: demoWindows[matchId] ?? [], decisions: [] };
}

export function readLiveState(matchId: string): LiveMatchState {
  if (typeof window === 'undefined') return getInitialLiveState(matchId);
  try {
    const raw = window.localStorage.getItem(getLiveStateKey(matchId));
    if (!raw) return getInitialLiveState(matchId);
    const parsed = JSON.parse(raw) as Partial<LiveMatchState>;
    return { events: parsed.events ?? [], windows: parsed.windows ?? [], decisions: parsed.decisions ?? [] };
  } catch { return getInitialLiveState(matchId); }
}

export function writeLiveState(matchId: string, state: LiveMatchState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getLiveStateKey(matchId), JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('the12th:live-update', { detail: { matchId } }));
}

export function resetLiveState(matchId: string) {
  if (typeof window === 'undefined') return;
  writeLiveState(matchId, getInitialLiveState(matchId));
}

export function choiceForEvent(type: MatchEventType): DecisionChoice | null {
  if (type === 'GOAL' || type === 'SHOT' || type === 'CHANCE') return 'PRESS';
  if (type === 'SUBSTITUTION') return 'CHANGE';
  if (type === 'CARD' || type === 'POSSESSION') return 'DROP';
  return null;
}
