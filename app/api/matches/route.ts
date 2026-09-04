import { NextResponse } from 'next/server';
import { demoFootballProvider } from '@/lib/football/demo-provider';

export async function GET() {
  const matches = await demoFootballProvider.getLiveMatches();
  return NextResponse.json({ source: 'demo', matches });
}
