'use client';

import { useEffect, useMemo, useState } from 'react';
import { matches, demoWindows } from '@/lib/demo-data';
import { decisionLabels, MatchEvent, MatchEventType } from '@/lib/match-engine';
import type { DecisionChoice } from '@/lib/scoring';
import { choiceForEvent, getInitialLiveState, readLiveState, resetLiveState, resolveDecision, writeLiveState, type LiveMatchState } from '@/lib/live-state';

const eventButtons: { type: MatchEventType; title: string }[] = [
  { type: 'GOAL', title: 'GOL' }, { type: 'SHOT', title: 'ŞUT' }, { type: 'CHANCE', title: 'BÜYÜK ŞANS' },
  { type: 'CARD', title: 'KART' }, { type: 'SUBSTITUTION', title: 'DEĞİŞİKLİK' }, { type: 'POSSESSION', title: 'TOP KAZANMA' }, { type: 'END', title: 'MAÇI BİTİR' },
];

export default function AdminPage() {
  const [matchId, setMatchId] = useState(matches[0].id);
  const [team, setTeam] = useState<'HOME' | 'AWAY'>('HOME');
  const [minuteInput, setMinuteInput] = useState(String(matches[0].minute));
  const [state, setState] = useState<LiveMatchState>(() => getInitialLiveState(matches[0].id));
  const [apiStatus, setApiStatus] = useState('LOCAL LIVE STATE');
  const [adminKey, setAdminKey] = useState('');
  const match = matches.find((item) => item.id === matchId) ?? matches[0];

  useEffect(() => { setAdminKey(window.localStorage.getItem('the12th:admin-key') ?? ''); }, []);
  useEffect(() => { const next = readLiveState(matchId); setState(next); setMinuteInput(String(next.meta.minute)); }, [matchId]);
  useEffect(() => { const refresh = () => setState(readLiveState(matchId)); const timer = window.setInterval(refresh, 5000); window.addEventListener('the12th:live-update', refresh); return () => { window.clearInterval(timer); window.removeEventListener('the12th:live-update', refresh); }; }, [matchId]);

  const windows = state.windows.length ? state.windows : demoWindows[matchId] ?? [];
  const currentEvents = state.events;
  const pending = useMemo(() => windows.filter((w) => !w.resolved), [windows]);
  const authHeaders: Record<string, string> = adminKey ? { 'x-the12th-admin-key': adminKey } : {};

  async function persistAdmin(body: Record<string, unknown>) {
    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) { setApiStatus(`API HATASI · ${payload?.error ?? response.status}`); return false; }
      setApiStatus('SUPABASE / LIVE API AKTİF'); return true;
    } catch { setApiStatus('API ULAŞILAMIYOR · LOCAL DEVAM'); return false; }
  }

  async function persistResolution(decisionId: string | undefined, event: MatchEvent) {
    if (!decisionId) return false;
    try {
      const response = await fetch('/api/decisions/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ decisionId, matchId, eventType: event.type, eventMinute: event.minute }) });
      if (!response.ok) { const payload = await response.json().catch(() => null) as { error?: string } | null; setApiStatus(`API HATASI · ${payload?.error ?? response.status}`); return false; }
      setApiStatus('KARAR VERİTABANINDA ÇÖZÜLDÜ'); return true;
    } catch { setApiStatus('API ULAŞILAMIYOR · LOCAL DEVAM'); return false; }
  }

  async function addEvent(type: MatchEventType, title: string) {
    const minute = Math.max(0, Math.min(120, Number(minuteInput) || state.meta.minute));
    const event: MatchEvent = { id: `live-${Date.now()}`, minute, type, team: type === 'END' ? undefined : team, title: type === 'GOAL' ? `${team === 'HOME' ? match.home : match.away} gol attı` : `${team === 'HOME' ? match.home : match.away} · ${title}` };
    const suggestedChoice = choiceForEvent(type); const target = windows.find((item) => !item.resolved && item.minute <= minute);
    let nextWindows = windows; let nextDecisions = state.decisions; let homeScore = state.meta.homeScore; let awayScore = state.meta.awayScore; let status = state.meta.status;
    if (type === 'GOAL') team === 'HOME' ? homeScore += 1 : awayScore += 1; if (type === 'END') status = 'FT';
    let resolution: ReturnType<typeof resolveDecision> | null = null; let linkedId: string | undefined;
    if (target && suggestedChoice) {
      const linked = state.decisions.find((decision) => decision.windowId === target.id);
      if (linked) { linkedId = linked.id; resolution = resolveDecision(linked, event, target.correctChoice); nextDecisions = state.decisions.map((d) => d.windowId === target.id ? { ...d, points: resolution!.points, outcome: resolution!.outcome, label: resolution!.label, eventMinute: event.minute, eventType: event.type } : d); nextWindows = windows.map((w) => w.id === target.id ? { ...w, resolved: true, resolvedByEventId: event.id } : w); }
    }
    const nextState: LiveMatchState = { meta: { minute, homeScore, awayScore, status }, events: [...currentEvents, event], windows: nextWindows, decisions: nextDecisions };
    setState(nextState); setMinuteInput(String(minute)); writeLiveState(matchId, nextState);
    const persisted = await persistAdmin({ action: 'event', id: event.id, minute, type, team: event.team, title: event.title, description: event.description });
    await persistAdmin({ action: 'meta', minute, homeScore, awayScore, status });
    if (resolution && linkedId) { await persistResolution(linkedId, event); await persistAdmin({ action: 'window', windowId: target!.id, minute: target!.minute, question: target!.question, choices: target!.choices, correctChoice: target!.correctChoice, resolved: true, resolvedByEventId: event.id }); }
    if (persisted) setApiStatus('EVENT + SKOR SUPABASE\'E YAZILDI');
  }

  async function resolveWindow(windowId: string) {
    const target = windows.find((item) => item.id === windowId); const linked = state.decisions.find((d) => d.windowId === windowId); if (!target || !linked) return;
    const event = currentEvents.find((item) => item.id === target.resolvedByEventId) ?? currentEvents[currentEvents.length - 1]; if (!event) return;
    const result = resolveDecision(linked, event, target.correctChoice);
    const nextWindows = windows.map((item) => item.id === windowId ? { ...item, resolved: true, resolvedByEventId: event.id } : item);
    const nextDecisions = state.decisions.map((decision) => decision.windowId === windowId ? { ...decision, outcome: result.outcome, points: result.points, label: result.label, eventMinute: event.minute, eventType: event.type } : decision);
    setState({ ...state, windows: nextWindows, decisions: nextDecisions }); writeLiveState(matchId, { ...state, windows: nextWindows, decisions: nextDecisions });
    await persistResolution(linked.id, event);
    await persistAdmin({ action: 'window', windowId: target.id, minute: target.minute, question: target.question, choices: target.choices, correctChoice: target.correctChoice, resolved: true, resolvedByEventId: event.id });
  }

  function handleReset() { const initial = getInitialLiveState(matchId); resetLiveState(matchId); setState(initial); setMinuteInput(String(initial.meta.minute)); setApiStatus('LOCAL DEMO SIFIRLANDI'); }
  function saveAdminKey(value: string) { setAdminKey(value); window.localStorage.setItem('the12th:admin-key', value); }

  return <main className="page-shell"><div className="topbar"><span className="brand">THE 12TH</span><span className="eyebrow">ADMIN / LIVE CONTROL</span></div>
    <section className="hero-block"><div><div className="eyebrow">MATCH CONTROL</div><h1>Canlı Maç Yönetimi</h1><p className="muted">Gerçek olayları gir. Taraftar kararını olayla eşleştir ve Football IQ puanını üret.</p></div><div className="admin-controls"><input aria-label="Admin anahtarı" className="select" type="password" placeholder="ADMIN KEY" value={adminKey} onChange={(e) => saveAdminKey(e.target.value)} /><select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="select">{matches.map((item) => <option key={item.id} value={item.id}>{item.home} — {item.away}</option>)}</select><select value={team} onChange={(e) => setTeam(e.target.value as 'HOME' | 'AWAY')} className="select"><option value="HOME">EV SAHİBİ · {match.home}</option><option value="AWAY">DEPLASMAN · {match.away}</option></select><input aria-label="Maç dakikası" className="select" type="number" min="0" max="120" value={minuteInput} onChange={(e) => setMinuteInput(e.target.value)} /><button className="secondary-btn" onClick={handleReset}>DEMOYU SIFIRLA</button></div></section>
    <section className="admin-score panel"><div><span className="label">LIVE SCORE</span><strong>{state.meta.homeScore} — {state.meta.awayScore}</strong></div><div><span className="label">MATCH CLOCK</span><strong>{state.meta.minute}&apos;</strong></div><div><span className="label">STATUS</span><strong>{state.meta.status}</strong></div></section>
    <section className="admin-grid"><div className="panel"><div className="panel-title"><span>OLAY GİR</span><span className="live-dot">● LIVE</span></div><div className="event-buttons">{eventButtons.map((button) => <button key={button.type} className="decision-btn" onClick={() => addEvent(button.type, button.title)}>{button.title}</button>)}</div><div className="timeline">{currentEvents.slice().reverse().map((event) => <div className="timeline-row" key={event.id}><strong>{event.minute}&apos;</strong><span>{event.title}</span><small>{event.team ? `${event.team} · ` : ''}{event.type}</small></div>)}</div></div>
      <div className="panel"><div className="panel-title"><span>KARAR PENCERELERİ</span><span>{pending.length} AÇIK</span></div>{windows.map((item) => { const linked = state.decisions.find((d) => d.windowId === item.id); const result = linked && item.resolved && linked.outcome ? { label: linked.label, points: linked.points } : null; return <div className="decision-window" key={item.id}><div className="window-head"><b>{item.minute}&apos;</b><span>{item.resolved ? 'SONUÇLANDI' : linked ? 'KARAR KİLİTLİ' : 'BEKLİYOR'}</span></div><p>{item.question}</p><div className="mini-choices">{item.choices.map((choice: DecisionChoice) => <span key={choice} className={linked?.choice === choice ? 'mini-choice active' : 'mini-choice'}>{decisionLabels[choice]}</span>)}</div>{linked && !item.resolved && <button className="primary-btn" onClick={() => resolveWindow(item.id)}>SONUCU İŞLE →</button>}{result && <div className={result.label === 'DOĞRU' ? 'result good' : 'result'}>{result.label} <strong>+{result.points}</strong></div>}</div>})}{!windows.length && <div className="empty-state">Bu maç için henüz karar penceresi yok.</div>}</div></section>
    <div className="admin-note">{apiStatus} • Production admin API anahtar ile korunur.</div></main>;
}
