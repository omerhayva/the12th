'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoWindows, matches } from '@/lib/demo-data';
import { decisionLabels, evaluateDecision, MatchEvent, MatchEventType } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';
import { choiceForEvent, getInitialLiveState, readLiveState, writeLiveState, type LiveMatchState } from '@/lib/live-state';

const eventButtons: { type: MatchEventType; title: string }[] = [
  { type: 'GOAL', title: 'GOL' }, { type: 'SHOT', title: 'ŞUT' }, { type: 'CHANCE', title: 'BÜYÜK ŞANS' },
  { type: 'CARD', title: 'SARI KART' }, { type: 'SUBSTITUTION', title: 'DEĞİŞİKLİK' },
];

export default function AdminPage() {
  const [matchId, setMatchId] = useState(matches[0].id);
  const [state, setState] = useState<LiveMatchState>(() => getInitialLiveState(matches[0].id));
  const match = matches.find((item) => item.id === matchId) ?? matches[0];

  useEffect(() => { setState(readLiveState(matchId)); }, [matchId]);
  useEffect(() => {
    const refresh = () => setState(readLiveState(matchId));
    const timer = window.setInterval(refresh, 800);
    window.addEventListener('the12th:live-update', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('the12th:live-update', refresh); };
  }, [matchId]);

  const windows = state.windows.length ? state.windows : demoWindows[matchId] ?? [];
  const currentEvents = state.events;
  const pending = useMemo(() => windows.filter((w) => !w.resolved), [windows]);

  function addEvent(type: MatchEventType, title: string) {
    const nextMinute = Math.min(90, Math.max(match.minute, ...currentEvents.map((e) => e.minute)) + 1);
    const event: MatchEvent = { id: `live-${Date.now()}`, minute: nextMinute, type, team: 'HOME', title };
    const suggestedChoice = choiceForEvent(type);
    const target = windows.find((item) => !item.resolved);
    let nextWindows = windows;
    let nextDecisions = state.decisions;

    if (target && suggestedChoice) {
      const linked = state.decisions.find((decision) => decision.windowId === target.id);
      if (linked) {
        const points = linked.choice === suggestedChoice ? 100 : 35;
        nextDecisions = state.decisions.map((decision) => decision.windowId === target.id
          ? { ...decision, points, outcome: suggestedChoice, label: points === 100 ? 'DOĞRU' : 'YANLIŞ' } : decision);
        nextWindows = windows.map((item) => item.id === target.id ? { ...item, resolved: true, resolvedByEventId: event.id } : item);
      }
    }

    const nextState: LiveMatchState = { ...state, events: [...currentEvents, event], windows: nextWindows, decisions: nextDecisions };
    setState(nextState); writeLiveState(matchId, nextState);
  }

  function resolveWindow(windowId: string) {
    const target = windows.find((item) => item.id === windowId);
    const linked = state.decisions.find((decision) => decision.windowId === windowId);
    if (!target || !linked) return;
    const event = currentEvents.find((item) => item.id === target.resolvedByEventId) ?? currentEvents[currentEvents.length - 1];
    if (!event) return;
    const outcome = choiceForEvent(event.type) ?? target.correctChoice;
    const points = linked.choice === outcome ? 100 : 35;
    const nextWindows = windows.map((item) => item.id === windowId ? { ...item, resolved: true, resolvedByEventId: event.id } : item);
    const nextDecisions = state.decisions.map((decision) => decision.windowId === windowId ? { ...decision, outcome, points, label: points === 100 ? 'DOĞRU' : 'YANLIŞ' } : decision);
    const nextState = { ...state, windows: nextWindows, decisions: nextDecisions };
    setState(nextState); writeLiveState(matchId, nextState);
  }

  return <main className="page-shell"><div className="topbar"><span className="brand">THE 12TH</span><span className="eyebrow">ADMIN / LIVE CONTROL</span></div><section className="hero-block"><div><div className="eyebrow">MATCH CONTROL</div><h1>Canlı Maç Yönetimi</h1><p className="muted">Gerçek olayları gir. Taraftar kararını olayla eşleştir ve Football IQ puanını üret.</p></div><select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="select">{matches.map((item) => <option key={item.id} value={item.id}>{item.home} — {item.away}</option>)}</select></section><section className="admin-grid"><div className="panel"><div className="panel-title"><span>OLAY GİR</span><span className="live-dot">● LIVE</span></div><div className="event-buttons">{eventButtons.map((button) => <button key={button.type} className="decision-btn" onClick={() => addEvent(button.type, button.title)}>{button.title}</button>)}</div><div className="timeline">{currentEvents.slice().reverse().map((event) => <div className="timeline-row" key={event.id}><strong>{event.minute}&apos;</strong><span>{event.title}</span><small>{event.type}</small></div>)}</div></div><div className="panel"><div className="panel-title"><span>KARAR PENCERELERİ</span><span>{pending.length} AÇIK</span></div>{windows.map((item) => { const linked = state.decisions.find((d) => d.windowId === item.id); const result = linked && item.resolved ? evaluateDecision(linked.choice, item) : null; return <div className="decision-window" key={item.id}><div className="window-head"><b>{item.minute}&apos;</b><span>{item.resolved ? 'SONUÇLANDI' : linked ? 'KARAR KİLİTLİ' : 'BEKLİYOR'}</span></div><p>{item.question}</p><div className="mini-choices">{item.choices.map((choice: DecisionChoice) => <span key={choice} className={linked?.choice === choice ? 'mini-choice active' : 'mini-choice'}>{decisionLabels[choice]}</span>)}</div>{linked && !item.resolved && <button className="primary-btn" onClick={() => resolveWindow(item.id)}>SONUCU İŞLE →</button>}{result && <div className={result.label === 'DOĞRU' ? 'result good' : 'result'}>{result.label} <strong>+{result.points}</strong></div>}</div>})}{!windows.length && <div className="empty-state">Bu maç için henüz karar penceresi yok.</div>}</div></section><div className="admin-note">DEMO LIVE STATE • Aynı tarayıcıda /admin ile /match arasında çalışır. Üretimde veritabanı + realtime kullanılacak.</div></main>;
}
