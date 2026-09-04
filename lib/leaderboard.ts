import { calculateBreakdown, calculateIQ, type Decision } from '@/lib/scoring';

export type LeaderboardEntry = {
  id: string;
  name: string;
  iq: number;
  decisions: number;
  accuracy: number;
  provisional: boolean;
};

export const MIN_RANKED_DECISIONS = 5;

export function buildLeaderboard(players: Array<{ id: string; name: string; decisions: Decision[] }>) {
  const entries: LeaderboardEntry[] = players.map((player) => {
    const decisions = player.decisions.filter((d) => typeof d.points === 'number' && d.outcome);
    const iq = calculateIQ(decisions);
    const breakdown = calculateBreakdown(decisions);
    return {
      id: player.id,
      name: player.name,
      iq,
      decisions: decisions.length,
      accuracy: breakdown.prediction,
      provisional: decisions.length < MIN_RANKED_DECISIONS,
    };
  });

  return entries
    .sort((a, b) => b.iq - a.iq || b.accuracy - a.accuracy || b.decisions - a.decisions || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
