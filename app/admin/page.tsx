'use client';

import { useMemo, useState } from 'react';
import { demoEvents, demoWindows, matches } from '@/lib/demo-data';
import { decisionLabels, evaluateDecision, MatchEvent, MatchEventType } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';

const eventButtons: { type: MatchEventType; title: string }[] = [
  { type: 'GOAL', title: 'GOL' },
  { type: 'SHOT', title: 'ŞUT' },
  { type: 'CHANCE', title: 'BÜYÜK ŞANS' },
  { type: 'CARD', title: 'SARI KART' },
  { type: 'SUBSTITUTION', title: 'DEĞİŞİKLİK' },
];

export default function AdminPage() {
  const [matchId, setMatchId] = useState(matches[0].id);
  const [events, setEvents] = useState<Record<string, MatchEvent[]>>(demoEvents);
  const [selected, setSelected] = useState<Record<string, DecisionChoice>>({});
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const match = matches.find((item) => item.id === matchId) ?? matches[0];
  const windows = demoWindows[matchId] ?? [];
  const currentEvents = events[matchId] ?? [];

  const pending = useMemo(() => windows.filter((w) => !resolved[w.id] && !w.resolved), [windows, resolved]);

  function addEvent(type: MatchEventType, title: string) {
    const nextMinute = Math.min(90, match.minute + currentEvents.length + 1);
    const event: MatchEvent = {
      id: `live-${Date.now()}`,
      minute: nextMinute,
      type,
      team: 'HOME',
      title,
    };
    setEvents((current) => ({ ...current, [matchId]: [...(current[matchId] ?? []), event] }));
  }

  function resolveWindow(windowId: string) {
    setResolved((current) => ({ ...current, [windowId]: true }));
  }

  return (
    <main className="page-shell">
      <div className="topbar"><span className="brand">THE 12TH</span><span className="eyebrow">ADMIN / LIVE CONTROL</span></div>
      <section className="hero-block">
        <div><div className="eyebrow">MATCH CONTROL</div><h1>Canlı Maç Yönetimi</h1><p className="muted">Gerçek olayları gir, açık kararları çöz ve taraftar puanlamasını tetikle.</p></div>
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
            const choice = selected[window.id];
            const isResolved = window.resolved || resolved[window.id];
            const result = choice ? evaluateDecision(choice, { ...window, resolved: isResolved }) : null;
            return <div className="decision-window" key={window.id}>
              <div className="window-head"><b>{window.minute}&apos;</b><span>{isResolved ? 'SONUÇLANDI' : 'BEKLİYOR'}</span></div>
              <p>{window.question}</p>
              <div className="mini-choices">{window.choices.map((item) => <button key={item} className={choice === item ? 'mini-choice active' : 'mini-choice'} onClick={() => setSelected((current) => ({ ...current, [window.id]: item }))}>{decisionLabels[item]}</button>)}</div>
              {choice && !isResolved && <button className="primary-btn" onClick={() => resolveWindow(window.id)}>GERÇEK OLAYI İŞLE →</button>}
              {result && isResolved && <div className={result.label === 'DOĞRU' ? 'result good' : 'result'}>{result.label} <strong>+{result.points}</strong></div>}
            </div>;
          })}
          {!windows.length && <div className="empty-state">Bu maç için henüz karar penceresi yok.</div>}
        </div>
      </section>
      <div className="admin-note">MVP kontrol paneli • Veri şu aşamada demo state&apos;inde tutuluyor. Sonraki adım: veritabanı + gerçek zamanlı yayın.</div>
    </main>
  );
}
