'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { demoDecisions } from '@/lib/demo-data';
import { calculateBreakdown, calculateIQ, type Decision } from '@/lib/scoring';
import { getPlayer, updatePlayerName, type PlayerProfile } from '@/lib/player';

export default function ProfilePage() {
  const [decisions, setDecisions] = useState<Decision[]>(demoDecisions);
  const [player, setPlayer] = useState<PlayerProfile>({ id: 'demo', name: 'Sen', createdAt: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const current = getPlayer();
      if (alive) setPlayer(current);
      try {
        const response = await fetch(`/api/players/${current.id}/decisions`, { cache: 'no-store' });
        if (!response.ok) throw new Error('PLAYER_DECISIONS_FAILED');
        const payload = await response.json() as { decisions?: Array<Decision & { playerId: string; lockedAt: string }> };
        const persisted = (payload.decisions ?? []).filter((d) => typeof d.points === 'number' && d.outcome).map((d) => ({
          id: d.id,
          windowId: d.windowId,
          matchId: d.matchId,
          minute: d.minute,
          choice: d.choice,
          outcome: d.outcome!,
          points: d.points!,
          eventMinute: d.eventMinute,
          eventType: d.eventType,
        }));
        if (alive) setDecisions(persisted.length ? persisted : demoDecisions);
      } catch {
        if (alive) setDecisions(demoDecisions);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const timer = window.setInterval(load, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  const iq = calculateIQ(decisions);
  const breakdown = calculateBreakdown(decisions);
  const rows = [['Tahmin doğruluğu', breakdown.prediction], ['Maç okuma', breakdown.reading], ['Taktik okuma', breakdown.tactical], ['Zamanlama', breakdown.timing], ['Karar tutarlılığı', breakdown.consistency]];

  const saveName = async () => {
    const next = window.prompt('Oyuncu adın:', player.name);
    if (next === null) return;
    const updated = updatePlayerName(next);
    setPlayer(updated);
    try {
      await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: updated.id, name: updated.name }) });
    } catch {}
  };

  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><span>MY IQ</span></div></nav><section className="hero"><div><div className="eyebrow">Your football intelligence</div><h1>MY<br/><span style={{color:'var(--green)'}}>FOOTBALL IQ.</span></h1><p className="sub">{player.name} · Karar geçmişin, doğruluk oranların ve maç okuma profilin tek yerde.</p><button className="ghost" onClick={saveName}>OYUNCU ADINI DEĞİŞTİR</button></div></section><div className="grid"><div className="card iq"><span className="label">FOOTBALL IQ</span><div className="iqNum">{iq}<span>/100</span></div><div className="progress"><i style={{width:`${iq}%`}}/></div><div className="rows">{rows.map(([name, value]) => <div className="row" key={name}><span>{name}</span><b>{value}</b></div>)}</div><Link href={`/share/${iq}`} className="submit" style={{display:'block',textAlign:'center',marginTop:20}}>IQ&apos;NU PAYLAŞ →</Link></div><div className="card"><span className="label">RECENT DECISIONS</span>{loading ? <div className="empty-state">KARARLAR YÜKLENİYOR…</div> : decisions.slice().reverse().map((d) => <div className="event" key={d.id}><span className="time">{d.minute}&apos;</span><div><b>{d.choice}</b><p>{d.outcome === d.choice ? 'Doğru okuma · +' + d.points : 'Yanlış okuma · +' + d.points}</p></div></div>)}</div></div></div></main>;
}
