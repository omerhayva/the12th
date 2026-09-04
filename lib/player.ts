export type PlayerProfile = {
  id: string;
  name: string;
  createdAt: string;
};

const PLAYER_KEY = 'the12th:player';

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeName(id: string) {
  return `12TH #${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
}

export function getPlayer(): PlayerProfile {
  if (typeof window === 'undefined') {
    return { id: 'demo-player', name: 'Sen', createdAt: new Date(0).toISOString() };
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile;
      if (parsed.id && parsed.name) return parsed;
    }
  } catch {}

  const id = makeId();
  const profile: PlayerProfile = {
    id,
    name: makeName(id),
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(PLAYER_KEY, JSON.stringify(profile));
  return profile;
}

export function updatePlayerName(name: string) {
  const current = getPlayer();
  const next = { ...current, name: name.trim().slice(0, 24) || current.name };
  if (typeof window !== 'undefined') window.localStorage.setItem(PLAYER_KEY, JSON.stringify(next));
  return next;
}
