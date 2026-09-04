'use client';

import { useEffect, useMemo, useState } from 'react';
import { demoWindows, matches } from '@/lib/demo-data';
import { decisionLabels, evaluateDecision, MatchEvent, MatchEventType } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';
import { choiceForEvent, getInitialLiveState, readLiveState, writeLiveState, type LiveMatchState } from '@/lib/live-state';

const eventButtons: { type: MatchEventType; title: string }[] = [
  { type: 'GOAL', title: 'GOL' },
  { type: 'SHOT', title: 'ŞUT' },
  { type: 'CHANCE', title: 'BÜYÜK ŞANS' },
  { type: 'CARD', title: 'SARI KART' },
  { type: 'SUBSTITUTION', title: 'DEĞİŞİKLİK' },
];

export default function AdminPage() {
  const [matchId, setMatchId] = useState(matches[0].id);
  const [state, setState] = useState<LiveMatchState>(() => getInitialLiveState(matches[0].id));
  const match = matches.find((item) => item.id === matchId) ?? matches[0];

  useEffect(() => {
    setState(readLiveState(matchId));
  }, [matchId]);

  useEffect(() => {
    const refresh = () => setState(readLiveState(matchId));
    const timer = window.setInterval(refresh, 800);
    window.addEventListener('the12th:live-update', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('the12th:live-update', refresh);
    };
  }, [matchId]);

  const windows = state.windows.length ? state.windows : demoWindows[matchId] ?? [];
  const currentEvents = state.events;
  const pending = useMemo(() => windows.filter((w) => !w.resolved), [windows]);

  function addEvent(type: MatchEventType, title: string) {
    const nextMinute = Math.min(90, Math.max(match.minute, ...currentEvents.map((e) => e.minute)) + 1);
    const event: MatchEvent = {
      id: `live-${Date.now()}`,
      minute: nextMinute,
      type,
      team: 'HOME',
      title,
    };

    const nextWindows = [...windows];
    const suggestedChoice = choiceForEvent(type);
    const targetIndex = nextWindows.findIndex((item) => !item.resolved);
    const target = targetIndex >= 0 ? nextWindows[targetIndex] : undefined;

    if (target) {
      const linkedDecision = state.decisions.find((decision) => decision.windowId === target.id);
      if (linkedDecision && suggestedChoice) {
        nextWindows[targetIndex] = {
          ...target,
          resolved: true,
          resolvedByEventId: event.id,
        };
      } else if (!linkedDecision && suggestedChoice) {
        nextWindows[targetIndex] = {
          ...target,
          resolved: true,
          resolvedByEventId: event.id,
        };
      }
    }

    const nextState: LiveMatchState = { ...state, events: [...currentEvents, event], windows: nextWindows };
    setState(nextState);
    writeLiveState(matchId, nextState);
  }

  function resolveWindow(windowId: string) {
    const target = windows.find((item) => item.id === windowId);
    if (!target) return;
    const event = currentEvents.find((item) => item.id === target.resolvedByEventId);
    const fallbackEvent = currentEvents[currentEvents.length - 1];
    const resolvedEvent = event ?? fallbackEvent;
    const nextWindows = windows.map((item) => item.id === windowId ? { ...item, resolved: true, resolvedByEventId: resolvedEvent?.id } : item);
    const nextState = { ...state, windows: nextWindows };
    setState(nextState);
    writeLiveState(matchId, nextState);
  }

  return (
    <main className="page-shell">
      <div className="topbar"><span className="brand">THE 12TH</span><span className="eyebrow">ADMIN / LIVE CONTROL</span></div>
      <section className="hero-block">
        <div><div className="eyebrow">MATCH CONTROL</div><h1>Canlı Maç Yönetimi</h1><p className="muted">Gerçek olayları gir. Açık kararlar otomatik sonuçlansın ve taraftarın Football IQ puanı oluşsun.</p></div>
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="select">
          {matches.map((item) => <option key={item.id} value={item.id}>{item.home} — {item.away}</option>)}
        </select>
      </section>

      <section className="admin-grid">
        <div className="panel">
          <div className="panel-title"><span>OLAY GİR</span><span className="live-dot">● LIVE</span></div>
          <div className="event-buttons">{eventButtons.map((button) => <button key={button.type} className="decision-btn" onClick={() => addEvent(button.type, button.title)}>{button.title}</button>)}</div>
          <div className="timeline">{currentEvents.slice().reverse().map((event) => <div className="timeline-row" key={event.id}><strong>{event.minute}&apos;</strong><span>{event.title}</span><small>{event.type}</small></div>)}</div>
        </div>

        <div className="panel">
          <div className="panel-title"><span>KARAR PENCERELERİ</span><span>{pending.length} AÇIK</span></div>
          {windows.map((window) => {
            const linkedDecision = state.decisions.find((decision) => decision.windowId === window.id);
            const isResolved = window.resolved;
            const result = linkedDecision && isResolved ? evaluateDecision(linkedDecision.choice, window) : null;
            return <div className="decision-window" key={window.id}>
              <div className="window-head"><b>{window.minute}&apos;</b><span>{isResolved ? 'SONUÇLANDI' : linkedDecision ? 'KARAR KİLİTLİ' : 'BEKLİYOR'}</span></div>
              <p>{window.question}</p>
              <div className="mini-choices">{window.choices.map((item) => <span key={item} className={linkedDecision?.choice === item ? 'mini-choice active' : 'mini-choice'}>{decisionLabels[item]}</span>)}</div>
              {linkedDecision && !isResolved && <button className="primary-btn" onClick={() => resolveWindow(window.id)}>SONUCU İŞLE →</button>}
              {result && <div className={result.label === 'DOĞRU' ? 'result good' : 'result'}>{result.label} <strong>+{result.points}</strong></div>}
            </div>;
          })}
          {!windows.length && <div className="empty-state">Bu maç için henüz karar penceresi yok.</div>}
        </div>
      </section>
      <div className="admin-note">DEMO LIVE STATE • Aynı tarayıcıda /admin ile /match arasında çalışır. Üretimde bu katman veritabanı + realtime ile değiştirilecek.</div>
    </main>
  );
}
