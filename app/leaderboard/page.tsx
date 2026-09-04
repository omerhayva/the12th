'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { leaderboard as demoLeaderboard, matches, demoDecisions } from '@/lib/demo-data';
import { buildLeaderboard, type LeaderboardEntry } from '@/lib/leaderboard';
import { calculateIQ, type Decision } from '@/lib/scoring';
import { readLiveState } from '@/lib/live-state';
import { getPlayer, type PlayerProfile } from '@/lib/player';

export default function LeaderboardPage() {
  const [player, setPlayer] = useState<PlayerProfile>({ id: 'demo-player', name: 'Sen', createdAt: '' });
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const load = () => {
      const currentPlayer = getPlayer();
      setPlayer(currentPlayer);
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
      const mine = scored.length ? scored : demoDecisions;
      const demoPlayers = demoLeaderboard.filter((p) => p.name !== 'Sen').map((p) => ({
        id: `demo-${p.rank}`,
        name: p.name,
        decisions: Array.from({ length: p.decisions }, (_, i) => ({
          id: `demo-${p.rank}-${i}`,
          minute: 1,
          choice: 'PRESS' as const,
          outcome: 'PRESS' as const,
          points: p.iq,
        })),
      }));
      const ranked = buildLeaderboard([{ id: currentPlayer.id, name: currentPlayer.name, decisions: mine }, ...demoPlayers]);
      setRows(ranked);
    };
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const me = rows.find((row) => row.id === player.id);
  const iq = me?.iq ?? calculateIQ(demoDecisions);

  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><span>LEADERBOARD</span><Link href="/profile">MY IQ</Link></div></nav><section className="hero"><div><div className="eyebrow">Global football intelligence</div><h1>GLOBAL<br/><span style={{color:'var(--green)'}}>RANKING.</span></h1><p className="sub">En iyi maç okuyucularını gör. <b>{player.name}</b> olarak şu an Football IQ puanın <b>{iq}</b>.</p></div></section><div className="card table">{rows.map((p) => <div className={`rankRow ${p.id === player.id ? 'me' : ''}`} key={p.id}><b>#{p.rank}</b><span>{p.name}{p.provisional ? <small style={{marginLeft:8}}>YENİ</small> : null}</span><small>{p.decisions} karar · %{p.accuracy} doğru</small><strong>{p.iq}</strong></div>)}</div></div></main>;
}
