'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserSupabase } from './browser';

type RealtimeCallback = () => void;

export function subscribeToMatchRealtime(matchId: string, onChange: RealtimeCallback) {
  const supabase = getBrowserSupabase();
  if (!supabase) return () => undefined;

  let channel: RealtimeChannel | null = null;
  let active = true;

  channel = supabase
    .channel(`the12th:match:${matchId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` }, () => {
      if (active) onChange();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` }, () => {
      if (active) onChange();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'decision_windows', filter: `match_id=eq.${matchId}` }, () => {
      if (active) onChange();
    })
    .subscribe();

  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}

export function subscribeToPlayerDecisions(playerId: string, onChange: RealtimeCallback) {
  const supabase = getBrowserSupabase();
  if (!supabase) return () => undefined;

  let channel: RealtimeChannel | null = null;
  let active = true;

  channel = supabase
    .channel(`the12th:player:${playerId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'decisions', filter: `player_id=eq.${playerId}` }, () => {
      if (active) onChange();
    })
    .subscribe();

  return () => {
    active = false;
    if (channel) void supabase.removeChannel(channel);
  };
}
