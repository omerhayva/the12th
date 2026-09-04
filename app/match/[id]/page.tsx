'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { matches, demoEvents, demoWindows } from '@/lib/demo-data';
import { decisionLabels, evaluateDecision } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';

const choices: DecisionChoice[] = ['PRESS', 'DROP', 'CHANGE'];

export default function MatchPage({ params }: { params: { id: string } }) {
  const match = useMemo(() => matches.find((m) => m.id === params.id) ?? matches[0], [params.id]);
  const window = demoWindows[match.id]?.find((item) => !item.resolved) ?? demoWindows[match.id]?.[0];
  const events = demoEvents[match.id] ?? [];
  const [selected, setSelected] = useState<DecisionChoice | null>(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<{ points: number; label: string } | null>(null);

  const submitDecision = () => {
    if (!selected || locked || !window) return;
    setLocked(true);
    if (window.resolved) setResult(evaluateDecision(selected, window));
  };

  return (
    <main className="page">
      <div className="shell">
        <nav className="nav">
          <Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link>
          <div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><Link href="/profile">MY IQ</Link></div>
        </nav>

        <section className="hero matchHero">
          <div className="matchTeams">
            <div className="teamHero"><img src={match.homeLogo} alt={match.home} /><span>{match.home}</span></div>
            <div className="scoreHero"><div className="eyebrow">LIVE MATCH / {match.minute}&apos;</div><strong>{match.homeScore} — {match.awayScore}</strong><span>12TH LIVE</span></div>
            <div className="teamHero"><img src={match.awayLogo} alt={match.away} /><span>{match.away}</span></div>
          </div>
          <p className="sub">Maçın kritik anında sıra sende. Kararını ver, sonra gerçek oyunla karşılaştıralım.</p>
        </section>

        <div className="grid">
          <div className="card decisionCard">
            <div className="cardHead"><span className="label">THE 12TH DECISION</span><span className="label">10 SEC</span></div>
            <h2>{window?.question ?? 'Yeni karar penceresi hazırlanıyor.'}</h2>
            <div className="options">
              {choices.map((choice, index) => (
                <button key={choice} className={`option ${selected === choice ? 'selected' : ''} ${locked ? 'locked' : ''}`} onClick={() => !locked && setSelected(choice)}>
                  <small>0{index + 1}</small><strong>{decisionLabels[choice]}</strong><div>{choice === 'PRESS' ? 'Rakibi kendi yarı alanına it' : choice === 'DROP' ? 'Blokları daralt, kontrayı bekle' : 'Oyuncu değişikliğiyle dengeyi değiştir'}</div>
                </button>
              ))}
            </div>
            <button className="submit" onClick={submitDecision} disabled={!selected || locked}>{locked ? 'KARAR KİLİTLENDİ ✓' : 'KARARINI VER →'}</button>
            {locked && <div className="decisionStatus"><b>✓ KARAR KİLİTLENDİ</b><span>{selected ? decisionLabels[selected] : ''}</span>{result && <strong>{result.label} · +{result.points}</strong>}</div>}
          </div>

          <aside className="side">
            <div className="card pulseCard"><span className="label">FAN PULSE</span><div className="pulse"><div className="bar"><i /><i /></div><div className="split"><span>{match.homeShort} 61%</span><span>{match.awayShort} 39%</span></div></div></div>
            <div className="card"><span className="label">MATCH TIMELINE</span><div className="timeline">
              <div className="event"><span className="time">{match.minute}&apos;</span><div><b>12TH DECISION</b><p>{locked ? `${decisionLabels[selected ?? 'PRESS']} kilitlendi.` : 'Karar bekleniyor.'}</p></div></div>
              {events.slice().reverse().map((event) => <div className="event" key={event.id}><span className="time">{event.minute}&apos;</span><div><b>{event.type}</b><p>{event.title}</p></div></div>)}
            </div></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
