import { NextResponse } from 'next/server';
import { bsdFootballProvider } from '@/lib/football/bsd-provider';
import { demoFootballProvider } from '@/lib/football/demo-provider';
import { getStore, storeMode } from '@/lib/server/store';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = await getStore();
  const stored = await store.getMatchState(id);

  if (stored) {
    const decisions = await store.getMatchDecisions(id);
    return NextResponse.json({ source: storeMode(), ...stored, decisions });
  }

  if (process.env.BSD_FOOTBALL_API_KEY) {
    try {
      const match = await bsdFootballProvider.getMatch(id);
      if (match) {
        const [events, windows] = await Promise.all([
          bsdFootballProvider.getEvents(id),
          bsdFootballProvider.getDecisionWindows(id),
        ]);
        return NextResponse.json({ source: 'bsd-live', match, events, windows, decisions: [] });
      }
    } catch (error) {
      console.error(`BSD match ${id} failed:`, error);
    }
  }

  const match = await demoFootballProvider.getMatch(id);
  if (!match) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 });
  const [events, windows] = await Promise.all([
    demoFootballProvider.getEvents(id),
    demoFootballProvider.getDecisionWindows(id),
  ]);
  return NextResponse.json({ source: 'demo', match, events, windows, decisions: [] });
}
