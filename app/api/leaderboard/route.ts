import { NextResponse } from 'next/server';
import { leaderboard as demoLeaderboard } from '@/lib/demo-data';
import { buildLeaderboard } from '@/lib/leaderboard';
import { getStore, storeMode } from '@/lib/server/store';

export async function GET() {
  if (storeMode() === 'memory') {
    return NextResponse.json({
      source: 'demo',
      entries: demoLeaderboard.map((entry) => ({
        rank: entry.rank,
        playerId: `demo-${entry.rank}`,
        name: entry.name,
        iq: entry.iq,
        decisions: entry.decisions,
        accuracy: entry.iq,
        provisional: entry.decisions < 5,
      })),
    });
  }

  const store = await getStore();
  const players = await store.getPlayersWithDecisions();
  const entries = buildLeaderboard(players.map(({ player, decisions }) => ({ id: player.id, name: player.name, decisions })));
  return NextResponse.json({
    source: 'supabase',
    entries: entries.map((entry) => ({
      rank: entry.rank,
      playerId: entry.id,
      name: entry.name,
      iq: entry.iq,
      decisions: entry.decisions,
      accuracy: entry.accuracy,
      provisional: entry.provisional,
    })),
  });
}
