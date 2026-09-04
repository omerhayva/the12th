import { NextResponse } from 'next/server';
import { demoFootballProvider } from '@/lib/football/demo-provider';
import { getStore, storeMode } from '@/lib/server/store';

export async function GET() {
  const store = await getStore();
  const demoMatches = await demoFootballProvider.getLiveMatches();

  const matches = await Promise.all(
    demoMatches.map(async (demoMatch) => {
      const stored = await store.getMatchState(demoMatch.id);
      return stored?.match ?? demoMatch;
    }),
  );

  return NextResponse.json({ source: storeMode(), matches });
}
