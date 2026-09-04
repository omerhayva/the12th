'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { matches } from '@/lib/demo-data';
import { decisionLabels } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';
import { getInitialLiveState, readLiveState, resolveDecision, writeLiveState, type LiveMatchState } from '@/lib/live-state';
import { getPlayer } from '@/lib/player';
import { isBrowserSupabaseConfigured } from '@/lib/supabase/browser';
import { subscribeToMatchRealtime } from '@/lib/supabase/realtime';
import type { FootballMatch } from '@/lib/football/provider';

const choices: DecisionChoice[] = ['PRESS', 'DROP', 'CHANGE'];

type DecisionResponse = { id: string; lockedAt?: string; points?: number; outcome?: DecisionChoice };
type MatchPayload = { source?: string; match: FootballMatch; events: LiveMatchState['events']; windows: LiveMatchState['windows'] };

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const demoMatch = matches.find((item) => item.id === id) ?? null;
  const [match, setMatch] = useState<FootballMatch | null>(demoMatch as FootballMatch | null);
  const [state, setState] = useState<LiveMatchState>(() => getInitialLiveState(id));
  const [selected, setSelected] = useState<DecisionChoice | null>(null);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/matches/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('MATCH_NOT_FOUND');
        const payload = await response.json() as MatchPayload;
        if (!active) return;
        setMatch(payload.match);
        setState((current) => ({ ...current, meta: { minute: payload.match.minute, homeScore: payload.match.homeScore, awayScore: payload.match.awayScore, status: payload.match.status }, events: payload.events ?? [], windows: payload.windows ?? [] }));
      } catch (error) {
        if (active) setSubmitError(error instanceof Error ? error.message : 'MATCH_LOAD_FAILED');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [id]);

  useEffect(() => {
    const current = readLiveState(id);
    setState((remote) => ({ ...remote, decisions: current.decisions }));
    const refresh = () => {
      const currentState = readLiveState(id);
      setState((remote) => ({ ...remote, decisions: currentState.decisions }));
    };
    window.addEventListener('the12th:live-update', refresh);
    const unsubscribe = subscribeToMatchRealtime(id, refresh);
    const timer = window.setInterval(refresh, isBrowserSupabaseConfigured() ? 10000 : 800);
    return () => { window.clearInterval(timer); window.removeEventListener('the12th:live-update', refresh); unsubscribe(); };
  }, [id]);

  if (loading && !match) return <main className="page"><div className="shell"><div className="card"><span className="label">MAÇ YÜKLENİYOR…</span></div></div></main>;
  if (!match) return <main className="page"><div className="shell"><div className="card"><span className="label">MAÇ BULUNAMADI</span><p className="sub">Bu karşılaşma artık veri akışında bulunmuyor.</p><Link href="/matches">← MAÇLARA DÖN</Link></div></div></main>;

  const activeWindow = state.windows.find((item) => !item.resolved) ?? state.windows[state.windows.length - 1];
  const lockedDecision = activeWindow ? state.decisions.find((decision) => decision.windowId === activeWindow.id) : undefined;
  const activeChoice = selected ?? lockedDecision?.choice ?? null;
  const linkedEvent = activeWindow?.resolvedByEventId ? state.events.find((event) => event.id === activeWindow.resolvedByEventId) : undefined;
  const resolved = Boolean(activeWindow?.resolved && lockedDecision && linkedEvent);
  const result = resolved && activeWindow && lockedDecision && linkedEvent ? resolveDecision(lockedDecision, linkedEvent, activeWindow.correctChoice) : null;

  const submitDecision = async () => {
    if (!selected || lockedDecision || !activeWindow || activeWindow.resolved || submitting) return;
    setSubmitting(true); setSubmitError(null);
    const player = getPlayer();
    try {
      const playerResponse = await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: player.id, name: player.name }) });
      if (!playerResponse.ok) throw new Error('PLAYER_SYNC_FAILED');
      const response = await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: player.id, playerName: player.name, matchId: match.id, windowId: activeWindow.id, choice: selected }) });
      const payload = await response.json().catch(() => null) as { error?: string; decision?: DecisionResponse } | null;
      if (!response.ok || !payload?.decision?.id) throw new Error(payload?.error ?? 'DECISION_FAILED');
      const nextState: LiveMatchState = { ...state, decisions: [...state.decisions.filter((item) => item.windowId !== activeWindow.id), { id: payload.decision.id, windowId: activeWindow.id, matchId: match.id, minute: state.meta.minute, choice: selected, lockedAt: payload.decision.lockedAt ? Date.parse(payload.decision.lockedAt) : Date.now() }] };
      setState(nextState); setLocked(true); writeLiveState(match.id, nextState);
    } catch (error) { setSubmitError(error instanceof Error ? error.message : 'KARAR KAYDEDİLEMEDİ'); }
    finally { setSubmitting(false); }
  };

  const effectiveLocked = locked || Boolean(lockedDecision);
  return <main className="page"><div className="shell">
    <nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><Link href="/profile">MY IQ</Link></div></nav>
    <section className="hero matchHero"><div className="matchTeams"><div className="teamHero"><img src={match.homeLogo} alt={match.home} /><span>{match.home}</span></div><div className="scoreHero"><div className="eyebrow">{state.meta.status === 'FT' ? 'FULL TIME' : 'LIVE MATCH'} / {state.meta.minute}&apos;</div><strong>{state.meta.homeScore} — {state.meta.awayScore}</strong><span>12TH LIVE</span></div><div className="teamHero"><img src={match.awayLogo} alt={match.away} /><span>{match.away}</span></div></div><p className="sub">Maçın kritik anında sıra sende. Kararını ver, sonra gerçek oyunla karşılaştıralım.</p></section>
    <div className="grid"><div className="card decisionCard"><div className="cardHead"><span className="label">THE 12TH DECISION</span><span className="label">10 SEC</span></div><h2>{activeWindow?.question ?? 'Yeni karar penceresi hazırlanıyor.'}</h2><div className="options">{choices.map((choice, index) => <button key={choice} className={`option ${activeChoice === choice ? 'selected' : ''} ${effectiveLocked ? 'locked' : ''}`} onClick={() => !effectiveLocked && setSelected(choice)}><small>0{index + 1}</small><strong>{decisionLabels[choice]}</strong><div>{choice === 'PRESS' ? 'Rakibi kendi yarı alanına it' : choice === 'DROP' ? 'Blokları daralt, kontrayı bekle' : 'Oyuncu değişikliğiyle dengeyi değiştir'}</div></button>)}</div><button className="submit" onClick={submitDecision} disabled={!selected || effectiveLocked || !activeWindow || activeWindow.resolved || submitting}>{submitting ? 'KAYDEDİLİYOR…' : effectiveLocked ? 'KARAR KİLİTLENDİ ✓' : 'KARARINI VER →'}</button>{submitError && <div className="decisionStatus"><b>KAYIT HATASI</b><span>{submitError}</span></div>}{effectiveLocked && !submitError && <div className="decisionStatus"><b>✓ KARAR KİLİTLENDİ</b><span>{activeChoice ? decisionLabels[activeChoice] : ''}</span>{result && <strong>{result.label} · +{result.points}</strong>}</div>}</div>
    <aside className="side"><div className="card pulseCard"><span className="label">FAN PULSE</span><div className="pulse"><div className="bar"><i /><i /></div><div className="split"><span>{match.homeShort}</span><span>{match.awayShort}</span></div></div></div><div className="card"><span className="label">MATCH TIMELINE</span><div className="timeline">{state.events.slice().reverse().map((event) => <div className="event" key={event.id}><span className="time">{event.minute}&apos;</span><div><b>{event.type}</b><p>{event.title}</p></div></div>)}</div></div></aside></div>
  </div></main>;
}
