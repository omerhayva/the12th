'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { leaderboard, matches } from '@/lib/demo-data';
import { readLiveState } from '@/lib/live-state';
import { getPlayer, type PlayerProfile } from '@/lib/player';
import { rankLeaderboard, summarizePlayer, type LeaderboardEntry } from '@/lib/leaderboard';
import type { Decision } from '@/lib/scoring';

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [player, setPlayer] = useState<PlayerProfile>({ id: 'demo', name: 'Sen', createdAt: '' });

  useEffect(() => {
    const load = () => {
      const me = getPlayer();
      setPlayer(me);
      const live = matches.flatMap((match) => readLiveState(match.id).decisions);
      const scored: Decision[] = live.filter((d) => typeof d.points === 'number' && d.outcome).map((d) => ({
        id: `${d.windowId}-${d.lockedAt}`,
        windowId: d.windowId,
        matchId: d.matchId,
        minute: d.minute,
        choice: d.choice,
        outcome: d.outcome!,
        points: d.points!,
        eventMinute: d.eventMinute,
        eventType: d.eventType,
      }));

      const demoRows: LeaderboardEntry[] = leaderboard
        .filter((p) => p.name !== 'Sen')
        .map((p) => ({ id: `demo-${p.name}`, name: p.name, iq: p.iq, decisions: p.decisions, accuracy: p.iq, provisional: false }));
      const meRow = summarizePlayer(me.id, me.name, scored);
      setRows(rankLeaderboard([...demoRows, meRow]));
    };
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const myRank = rows.find((row) => row.id === player.id)?.rank;

  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><span>LEADERBOARD</span><Link href="/profile">MY IQ</Link></div></nav><section className="hero"><div><div className="eyebrow">Global football intelligence</div><h1>GLOBAL<br/><span style={{color:'var(--green)'}}>RANKING.</span></h1><p className="sub">En iyi maç okuyucularını gör. Sıralaman karar kaliten, doğruluğun ve Football IQ puanınla hesaplanır.</p>{myRank && <div className="statline">SENİN SIRAN <b>#{myRank}</b> · {player.name}</div>}</div></section><div className="card table">{rows.map((p) => <div className={`rankRow ${p.id === player.id ? 'me' : ''}`} key={p.id}><b>#{p.rank}</b><span>{p.name}{p.provisional && <em> YENİ</em>}</span><small>{p.decisions} karar · %{p.accuracy} doğruluk</small><strong>{p.iq}</strong></div>)}</div></div></main>;
}
