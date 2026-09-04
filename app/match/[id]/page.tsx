'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { decisionLabels } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';
import { getInitialLiveState, readLiveState, writeLiveState, type LiveMatchState } from '@/lib/live-state';
import { getPlayer } from '@/lib/player';
import { isBrowserSupabaseConfigured } from '@/lib/supabase/browser';
import { subscribeToMatchRealtime } from '@/lib/supabase/realtime';
import type { FootballMatch } from '@/lib/football/provider';

type DecisionResponse = { id: string; lockedAt?: string; points?: number; outcome?: DecisionChoice };
type MatchPayload = { match: FootballMatch; events: LiveMatchState['events']; windows: LiveMatchState['windows'] };
const groupTitle = (question: string) => question.includes('kaç kaç') ? 'SKOR TAHMİNİ' : question.includes('ilk gol') ? 'İLK GOL' : question.includes('kart') ? 'KART' : question.includes('2.5') ? 'GOL SAYISI' : question.includes('iki takım') ? 'KARŞILIKLI GOL' : question.includes('Sıradaki') ? 'SONRAKİ OLAY' : question.includes('nasıl biter') ? 'MAÇ SONUCU' : 'TAKTİK OKUMA';

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [match, setMatch] = useState<FootballMatch | null>(null);
  const [state, setState] = useState<LiveMatchState>(() => getInitialLiveState(id));
  const [selected, setSelected] = useState<Record<string, DecisionChoice>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/matches/${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(response.status === 503 ? 'LIVE_FEED_NOT_CONFIGURED' : 'MATCH_NOT_FOUND');
        const payload = await response.json() as MatchPayload;
        if (!active) return;
        setMatch(payload.match);
        setState((current) => ({ ...current, meta: { minute: payload.match.minute, homeScore: payload.match.homeScore, awayScore: payload.match.awayScore, status: payload.match.status }, events: payload.events ?? [], windows: payload.windows ?? [] }));
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'MATCH_LOAD_FAILED'); }
      finally { if (active) setLoading(false); }
    };
    void load(); const timer = window.setInterval(load, 10000); return () => { active = false; window.clearInterval(timer); };
  }, [id]);

  useEffect(() => {
    const refresh = () => { const local = readLiveState(id); setState((remote) => ({ ...remote, decisions: local.decisions })); };
    window.addEventListener('the12th:live-update', refresh);
    const unsubscribe = subscribeToMatchRealtime(id, refresh);
    const timer = window.setInterval(refresh, isBrowserSupabaseConfigured() ? 10000 : 1000);
    return () => { window.clearInterval(timer); window.removeEventListener('the12th:live-update', refresh); unsubscribe(); };
  }, [id]);

  const submitPrediction = async (windowId: string) => {
    const choice = selected[windowId]; const predictionWindow = state.windows.find((w) => w.id === windowId);
    if (!choice || !predictionWindow || predictionWindow.resolved || submitting || state.decisions.some((d) => d.windowId === windowId)) return;
    setSubmitting(windowId); setError(null);
    try {
      const player = getPlayer();
      const playerResponse = await fetch('/api/players', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: player.id, name: player.name }) });
      if (!playerResponse.ok) throw new Error('PLAYER_SYNC_FAILED');
      const response = await fetch('/api/decisions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: player.id, playerName: player.name, matchId: match?.id, windowId, choice }) });
      const payload = await response.json().catch(() => null) as { error?: string; decision?: DecisionResponse } | null;
      if (!response.ok || !payload?.decision?.id) throw new Error(payload?.error ?? 'DECISION_FAILED');
      const nextState: LiveMatchState = { ...state, decisions: [...state.decisions, { id: payload.decision.id, windowId, matchId: match?.id, minute: state.meta.minute, choice, lockedAt: payload.decision.lockedAt ? Date.parse(payload.decision.lockedAt) : Date.now(), points: payload.decision.points, outcome: payload.decision.outcome }] };
      setState(nextState); writeLiveState(id, nextState);
    } catch (e) { setError(e instanceof Error ? e.message : 'TAHMİN KAYDEDİLEMEDİ'); }
    finally { setSubmitting(null); }
  };

  if (loading && !match) return <main className="page"><div className="shell"><div className="card"><span className="label">GERÇEK CANLI MAÇ YÜKLENİYOR…</span></div></div></main>;
  if (!match) return <main className="page"><div className="shell"><div className="card"><span className="label">CANLI MAÇ BULUNAMADI</span><p className="sub">Demo maç kullanılmıyor. Gerçek veri sağlayıcısında aktif karşılaşma bekleniyor.</p><Link href="/matches">← CANLI MAÇLARA DÖN</Link></div></div></main>;

  return <main className="page"><div className="shell">
    <nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><Link href="/profile">MY IQ</Link></div></nav>
    <section className="hero matchHero"><div className="matchTeams"><div className="teamHero"><img src={match.homeLogo} alt={match.home} /><span>{match.home}</span></div><div className="scoreHero"><div className="eyebrow">{match.status === 'FT' ? 'FULL TIME' : match.status === 'HT' ? 'HALF TIME' : 'LIVE MATCH'} / {match.minute}&apos;</div><strong>{match.homeScore} — {match.awayScore}</strong><span>REAL DATA</span></div><div className="teamHero"><img src={match.awayLogo} alt={match.away} /><span>{match.away}</span></div></div><p className="sub">Gerçek maç verisiyle tahminlerini kilitle. Maç olayları geldikçe Football IQ performansın ölçülecek.</p></section>
    <div className="grid"><div className="card decisionCard"><div className="cardHead"><span className="label">THE 12TH PREDICTION CENTER</span><span className="label">{state.windows.length} ALAN</span></div>
      {state.windows.map((w, index) => { const locked = state.decisions.find((d) => d.windowId === w.id); const choice = selected[w.id] ?? locked?.choice; return <section key={w.id} className="predictionBlock"><div className="cardHead"><span className="eyebrow">0{index + 1} · {groupTitle(w.question)}</span><span className="label">{locked ? 'KİLİTLİ ✓' : 'TAHMİN'}</span></div><h2>{w.question}</h2><div className="options">{w.choices.map((option, i) => <button key={option} className={`option ${choice === option ? 'selected' : ''} ${locked ? 'locked' : ''}`} disabled={Boolean(locked) || submitting === w.id} onClick={() => setSelected((current) => ({ ...current, [w.id]: option }))}><small>{String(i + 1).padStart(2, '0')}</small><strong>{decisionLabels[option]}</strong></button>)}</div><button className="submit" disabled={!choice || Boolean(locked) || submitting === w.id} onClick={() => void submitPrediction(w.id)}>{submitting === w.id ? 'KAYDEDİLİYOR…' : locked ? 'TAHMİN KİLİTLENDİ ✓' : 'TAHMİNİ KİLİTLE →'}</button></section>; })}
      {error && <div className="decisionStatus"><b>KAYIT HATASI</b><span>{error}</span></div>}
      <div className="decisionStatus"><b>NO BETTING</b><span>Buradaki tahminler sadece Football IQ ölçümü içindir; para, oran veya bahis ödülü yoktur.</span></div>
    </div>
    <aside className="side"><div className="card pulseCard"><span className="label">LIVE SCORE</span><div className="iqNum">{match.homeScore} — {match.awayScore}</div><p className="sub">{match.homeShort} · {match.minute}&apos; · {match.awayShort}</p></div><div className="card"><span className="label">MATCH TIMELINE</span><div className="timeline">{state.events.slice().reverse().map((event) => <div className="event" key={event.id}><span className="time">{event.minute}&apos;</span><div><b>{event.type}</b><p>{event.title}</p></div></div>)}</div></div></aside></div>
  </div></main>;
}
