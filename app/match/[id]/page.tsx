'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { matches } from '@/lib/demo-data';
import { decisionLabels, evaluateDecision } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';
import { getInitialLiveState, readLiveState, writeLiveState, type LiveMatchState } from '@/lib/live-state';

const choices: DecisionChoice[] = ['PRESS', 'DROP', 'CHANGE'];

export default function MatchPage({ params }: { params: { id: string } }) {
  const match = useMemo(() => matches.find((m) => m.id === params.id) ?? matches[0], [params.id]);
  const [state, setState] = useState<LiveMatchState>(() => getInitialLiveState(match.id));
  const [selected, setSelected] = useState<DecisionChoice | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const current = readLiveState(match.id);
    setState(current);
    const active = current.windows.find((item) => !item.resolved) ?? current.windows[current.windows.length - 1];
    const existing = active ? current.decisions.find((d) => d.windowId === active.id) : undefined;
    setSelected(existing?.choice ?? null);
    setLocked(Boolean(existing));
  }, [match.id]);

  useEffect(() => {
    const refresh = () => {
      const current = readLiveState(match.id);
      setState(current);
      const active = current.windows.find((item) => !item.resolved) ?? current.windows[current.windows.length - 1];
      const existing = active ? current.decisions.find((d) => d.windowId === active.id) : undefined;
      if (existing) { setSelected(existing.choice); setLocked(true); }
    };
    const timer = window.setInterval(refresh, 800);
    window.addEventListener('the12th:live-update', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('the12th:live-update', refresh); };
  }, [match.id]);

  const activeWindow = state.windows.find((item) => !item.resolved) ?? state.windows[state.windows.length - 1];
  const lockedDecision = activeWindow ? state.decisions.find((decision) => decision.windowId === activeWindow.id) : undefined;
  const activeChoice = selected ?? lockedDecision?.choice ?? null;
  const resolved = Boolean(activeWindow?.resolved && lockedDecision);
  const result = resolved && activeWindow && lockedDecision ? evaluateDecision(lockedDecision.choice, activeWindow) : null;

  const submitDecision = () => {
    if (!selected || locked || !activeWindow || activeWindow.resolved) return;
    const nextDecision = { windowId: activeWindow.id, matchId: match.id, minute: state.meta.minute, choice: selected, lockedAt: Date.now() };
    const nextState: LiveMatchState = { ...state, decisions: [...state.decisions.filter((item) => item.windowId !== activeWindow.id), nextDecision] };
    setState(nextState); setLocked(true); writeLiveState(match.id, nextState);
  };

  const effectiveLocked = locked || Boolean(lockedDecision);

  return (
    <main className="page"><div className="shell">
      <nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><Link href="/profile">MY IQ</Link></div></nav>
      <section className="hero matchHero"><div className="matchTeams"><div className="teamHero"><img src={match.homeLogo} alt={match.home} /><span>{match.home}</span></div><div className="scoreHero"><div className="eyebrow">{state.meta.status === 'FT' ? 'FULL TIME' : 'LIVE MATCH'} / {state.meta.minute}&apos;</div><strong>{state.meta.homeScore} — {state.meta.awayScore}</strong><span>12TH LIVE</span></div><div className="teamHero"><img src={match.awayLogo} alt={match.away} /><span>{match.away}</span></div></div><p className="sub">Maçın kritik anında sıra sende. Kararını ver, sonra gerçek oyunla karşılaştıralım.</p></section>
      <div className="grid"><div className="card decisionCard"><div className="cardHead"><span className="label">THE 12TH DECISION</span><span className="label">10 SEC</span></div><h2>{activeWindow?.question ?? 'Yeni karar penceresi hazırlanıyor.'}</h2><div className="options">{choices.map((choice, index) => <button key={choice} className={`option ${activeChoice === choice ? 'selected' : ''} ${effectiveLocked ? 'locked' : ''}`} onClick={() => !effectiveLocked && setSelected(choice)}><small>0{index + 1}</small><strong>{decisionLabels[choice]}</strong><div>{choice === 'PRESS' ? 'Rakibi kendi yarı alanına it' : choice === 'DROP' ? 'Blokları daralt, kontrayı bekle' : 'Oyuncu değişikliğiyle dengeyi değiştir'}</div></button>)}</div><button className="submit" onClick={submitDecision} disabled={!selected || effectiveLocked || !activeWindow || activeWindow.resolved}>{effectiveLocked ? 'KARAR KİLİTLENDİ ✓' : 'KARARINI VER →'}</button>{effectiveLocked && <div className="decisionStatus"><b>✓ KARAR KİLİTLENDİ</b><span>{activeChoice ? decisionLabels[activeChoice] : ''}</span>{result && <strong>{result.label} · +{result.points}</strong>}</div>}{locked && !result && <div className="decisionStatus"><b>CANLI TAKİPTE</b><span>Gerçek olay bekleniyor…</span></div>}</div>
      <aside className="side"><div className="card pulseCard"><span className="label">FAN PULSE</span><div className="pulse"><div className="bar"><i /><i /></div><div className="split"><span>{match.homeShort} 61%</span><span>{match.awayShort} 39%</span></div></div></div><div className="card"><span className="label">MATCH TIMELINE</span><div className="timeline">{state.events.slice().reverse().map((event) => <div className="event" key={event.id}><span className="time">{event.minute}&apos;</span><div><b>{event.type}</b><p>{event.title}</p></div></div>)}{activeWindow && <div className="event"><span className="time">{activeWindow.minute}&apos;</span><div><b>12TH DECISION</b><p>{result ? `${result.label} · +${result.points}` : effectiveLocked ? `${activeChoice ? decisionLabels[activeChoice] : ''} kilitlendi.` : 'Karar bekleniyor.'}</p></div></div>}</div></div></aside></div>
    </div></main>
  );
}
