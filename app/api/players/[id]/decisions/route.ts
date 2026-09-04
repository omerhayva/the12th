import { NextResponse } from 'next/server';
import { getStore, storeMode } from '@/lib/server/store';

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idPattern.test(id)) return NextResponse.json({ error: 'INVALID_PLAYER_ID' }, { status: 400 });

  const store = await getStore();
  const player = await store.getPlayer(id);
  if (!player) return NextResponse.json({ error: 'PLAYER_NOT_FOUND' }, { status: 404 });

  const decisions = await store.getPlayerDecisions(id);
  return NextResponse.json({ source: storeMode(), player, decisions });
}
