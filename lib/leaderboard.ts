import { calculateBreakdown, calculateIQ, type Decision } from '@/lib/scoring';

export type LeaderboardEntry = {
  id: string;
  name: string;
  iq: number;
  decisions: number;
  accuracy: number;
  provisional: boolean;
  rank?: number;
};

export const MIN_RANKED_DECISIONS = 5;

export function summarizePlayer(id: string, name: string, decisions: Decision[]): LeaderboardEntry {
  const scored = decisions.filter((d) => typeof d.points === 'number' && d.outcome);
  const breakdown = calculateBreakdown(scored);
  return {
    id,
    name,
    iq: calculateIQ(scored),
    decisions: scored.length,
    accuracy: breakdown.prediction,
    provisional: scored.length < MIN_RANKED_DECISIONS,
  };
}

export function rankLeaderboard(entries: LeaderboardEntry[]) {
  return [...entries]
    .sort((a, b) => b.iq - a.iq || b.accuracy - a.accuracy || b.decisions - a.decisions || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildLeaderboard(players: Array<{ id: string; name: string; decisions: Decision[] }>) {
  return rankLeaderboard(players.map((player) => summarizePlayer(player.id, player.name, player.decisions)));
}
