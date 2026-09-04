import { NextResponse } from 'next/server';
import { leaderboard } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json({
    source: 'demo',
    entries: leaderboard.map((entry) => ({
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
