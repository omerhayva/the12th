import { NextResponse } from 'next/server';
import { leaderboard as demoLeaderboard } from '@/lib/demo-data';
import { buildLeaderboard } from '@/lib/leaderboard';
import { getStore, storeMode } from '@/lib/server/store';

export async function GET() {
  try {
    const store = await getStore();
    const players = await store.getPlayersWithDecisions();
    if (players.length) {
      return NextResponse.json({ source: storeMode(), entries: buildLeaderboard(players).map((entry) => ({
        rank: entry.rank,
        playerId: entry.id,
        name: entry.name,
        iq: entry.iq,
        decisions: entry.decisions,
        accuracy: entry.accuracy,
        provisional: entry.provisional,
      })) });
    }
  } catch (error) {
    console.error('leaderboard read failed', error);
  }

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
