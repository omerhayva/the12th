import { NextResponse } from 'next/server';
import { demoFootballProvider } from '@/lib/football/demo-provider';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const match = await demoFootballProvider.getMatch(id);

  if (!match) {
    return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 });
  }

  const [events, windows] = await Promise.all([
    demoFootballProvider.getEvents(id),
    demoFootballProvider.getDecisionWindows(id),
  ]);

  return NextResponse.json({ source: 'demo', match, events, windows });
}
