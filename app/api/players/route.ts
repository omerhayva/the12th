import { NextResponse } from 'next/server';
import { getStore } from '@/lib/server/store';

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { id?: string; name?: string } | null;
  if (!body?.id || !idPattern.test(body.id)) {
    return NextResponse.json({ error: 'INVALID_PLAYER_ID' }, { status: 400 });
  }

  const name = body.name?.trim().slice(0, 24) || `12TH #${body.id.slice(0, 4).toUpperCase()}`;
  const store = await getStore();
  const player = await store.upsertPlayer({ id: body.id, name, createdAt: new Date().toISOString() });
  return NextResponse.json({ player });
}
