import { demoEvents, demoWindows, matches } from '@/lib/demo-data';
import type { FootballProvider } from './provider';

export const demoFootballProvider: FootballProvider = {
  async getLiveMatches() {
    return matches.filter((match) => match.status === 'LIVE');
  },
  async getMatch(matchId) {
    return matches.find((match) => match.id === matchId) ?? null;
  },
  async getEvents(matchId) {
    return demoEvents[matchId] ?? [];
  },
  async getDecisionWindows(matchId) {
    return demoWindows[matchId] ?? [];
  },
};
