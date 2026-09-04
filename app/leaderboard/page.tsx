'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { leaderboard, matches } from '@/lib/demo-data';
import { calculateIQ, type Decision } from '@/lib/scoring';
import { readLiveState } from '@/lib/live-state';

export default function LeaderboardPage() {
  const [me, setMe] = useState({ iq: 88, decisions: 12 });

  useEffect(() => {
    const load = () => {
      const live = matches.flatMap((match) => readLiveState(match.id).decisions);
      const scored: Decision[] = live.filter((d) => typeof d.points === 'number').map((d) => ({ id: d.windowId, minute: 0, choice: d.choice, outcome: d.choice, points: d.points ?? 0 }));
      if (scored.length) setMe({ iq: calculateIQ(scored), decisions: scored.length });
    };
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const rows = leaderboard.map((p) => p.name === 'Sen' ? { ...p, iq: me.iq, decisions: me.decisions } : p);

  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><span>LEADERBOARD</span><Link href="/profile">MY IQ</Link></div></nav><section className="hero"><div><div className="eyebrow">Global football intelligence</div><h1>GLOBAL<br/><span style={{color:'var(--green)'}}>RANKING.</span></h1><p className="sub">En iyi maç okuyucularını gör. Sıralaman, karar kaliten ve Football IQ puanın her doğru kararla yükselir.</p></div></section><div className="card table">{rows.map((p) => <div className={`rankRow ${p.name === 'Sen' ? 'me' : ''}`} key={p.rank}><b>#{p.rank}</b><span>{p.name}</span><small>{p.decisions} karar</small><strong>{p.iq}</strong></div>)}</div></div></main>;
}
