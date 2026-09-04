'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { demoDecisions, matches } from '@/lib/demo-data';
import { calculateBreakdown, calculateIQ, type Decision } from '@/lib/scoring';
import { readLiveState } from '@/lib/live-state';
import { getPlayer, updatePlayerName, type PlayerProfile } from '@/lib/player';

export default function ProfilePage() {
  const [decisions, setDecisions] = useState<Decision[]>(demoDecisions);
  const [player, setPlayer] = useState<PlayerProfile>({ id: 'demo', name: 'Sen', createdAt: '' });

  useEffect(() => {
    setPlayer(getPlayer());
    const load = () => {
      const liveDecisions: Decision[] = matches.flatMap((match) => readLiveState(match.id).decisions)
        .filter((d) => typeof d.points === 'number' && d.outcome)
        .map((d) => ({
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
      setDecisions(liveDecisions.length ? liveDecisions : demoDecisions);
    };
    load();
    const timer = window.setInterval(load, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const iq = calculateIQ(decisions);
  const breakdown = calculateBreakdown(decisions);
  const rows = [['Tahmin doğruluğu', breakdown.prediction], ['Maç okuma', breakdown.reading], ['Taktik okuma', breakdown.tactical], ['Zamanlama', breakdown.timing], ['Karar tutarlılığı', breakdown.consistency]];

  const saveName = () => {
    const next = window.prompt('Oyuncu adın:', player.name);
    if (next !== null) setPlayer(updatePlayerName(next));
  };

  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><span>MY IQ</span></div></nav><section className="hero"><div><div className="eyebrow">Your football intelligence</div><h1>MY<br/><span style={{color:'var(--green)'}}>FOOTBALL IQ.</span></h1><p className="sub">{player.name} · Karar geçmişin, doğruluk oranların ve maç okuma profilin tek yerde.</p><button className="ghost" onClick={saveName}>OYUNCU ADINI DEĞİŞTİR</button></div></section><div className="grid"><div className="card iq"><span className="label">FOOTBALL IQ</span><div className="iqNum">{iq}<span>/100</span></div><div className="progress"><i style={{width:`${iq}%`}}/></div><div className="rows">{rows.map(([name, value]) => <div className="row" key={name}><span>{name}</span><b>{value}</b></div>)}</div><Link href={`/share/${iq}`} className="submit" style={{display:'block',textAlign:'center',marginTop:20}}>IQ&apos;NU PAYLAŞ →</Link></div><div className="card"><span className="label">RECENT DECISIONS</span>{decisions.slice().reverse().map((d) => <div className="event" key={d.id}><span className="time">{d.minute}&apos;</span><div><b>{d.choice}</b><p>{d.points >= 100 ? 'Doğru okuma · +' + d.points : 'Yanlış okuma · +' + d.points}</p></div></div>)}</div></div></div></main>;
}
