import { NextResponse } from 'next/server';
import { bsdFootballProvider } from '@/lib/football/bsd-provider';
import { getStore, storeMode } from '@/lib/server/store';

export async function GET() {
  const store = await getStore();
  if (!process.env.BSD_FOOTBALL_API_KEY) return NextResponse.json({ source: 'unconfigured', matches: [], error: 'LIVE_FEED_NOT_CONFIGURED' }, { status: 503 });
  try {
    const liveMatches = await bsdFootballProvider.getLiveMatches();
    const matches = await Promise.all(liveMatches.map(async (match) => {
      const stored = await store.getMatchState(match.id);
      return stored?.match ?? match;
    }));
    return NextResponse.json({ source: 'bsd-live', matches });
  } catch (error) {
    console.error('BSD live feed failed:', error);
    return NextResponse.json({ source: storeMode(), matches: [], error: 'LIVE_FEED_UNAVAILABLE' }, { status: 503 });
  }
}
