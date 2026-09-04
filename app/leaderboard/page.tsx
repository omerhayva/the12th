'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { leaderboard as demoLeaderboard, demoDecisions } from '@/lib/demo-data';
import { calculateIQ, type Decision } from '@/lib/scoring';
import { getPlayer, type PlayerProfile } from '@/lib/player';

type Row = {
  rank: number;
  id: string;
  name: string;
  iq: number;
  decisions: number;
  accuracy: number;
  provisional: boolean;
};

export default function LeaderboardPage() {
  const [player, setPlayer] = useState<PlayerProfile>({ id: 'demo-player', name: 'Sen', createdAt: '' });
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const current = getPlayer();
      if (alive) setPlayer(current);
      try {
        const response = await fetch('/api/leaderboard', { cache: 'no-store' });
        if (!response.ok) throw new Error('LEADERBOARD_FAILED');
        const payload = await response.json() as { entries?: Array<{ rank: number; playerId: string; name: string; iq: number; decisions: number; accuracy: number; provisional: boolean }> };
        if (alive && payload.entries) setRows(payload.entries.map((entry) => ({ ...entry, id: entry.playerId })));
      } catch {
        if (!alive) return;
        setRows(demoLeaderboard.map((entry) => ({ rank: entry.rank, id: `demo-${entry.rank}`, name: entry.name, iq: entry.iq, decisions: entry.decisions, accuracy: entry.iq, provisional: entry.decisions < 5 })));
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const me = rows.find((row) => row.id === player.id);
  const iq = me?.iq ?? calculateIQ(demoDecisions as Decision[]);

  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><span>LEADERBOARD</span><Link href="/profile">MY IQ</Link></div></nav><section className="hero"><div><div className="eyebrow">Global football intelligence</div><h1>GLOBAL<br/><span style={{color:'var(--green)'}}>RANKING.</span></h1><p className="sub">En iyi maç okuyucularını gör. <b>{player.name}</b> olarak şu an Football IQ puanın <b>{iq}</b>.</p></div></section><div className="card table">{loading && !rows.length ? <div className="empty-state">RANKING YÜKLENİYOR…</div> : rows.map((p) => <div className={`rankRow ${p.id === player.id ? 'me' : ''}`} key={p.id}><b>#{p.rank}</b><span>{p.name}{p.provisional ? <small style={{marginLeft:8}}>YENİ</small> : null}</span><small>{p.decisions} karar · %{p.accuracy} doğru</small><strong>{p.iq}</strong></div>)}</div></div></main>;
}
