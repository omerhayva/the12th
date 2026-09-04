import { NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = await getStore();
  const player = await store.getPlayer(id);
  if (!player) return NextResponse.json({ error: 'PLAYER_NOT_FOUND' }, { status: 404 });
  const decisions = await store.getPlayerDecisions(id);
  return NextResponse.json({ player, decisions });
}
