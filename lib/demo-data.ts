import type { Decision } from './scoring';
import type { DecisionWindow, MatchEvent } from './match-engine';

const logoBase = 'https://raw.githubusercontent.com/JoseArroyave/football-logos/main/logos';

export const matches = [
  {
    id: 'gs-fb-demo',
    home: 'Galatasaray',
    away: 'Fenerbahçe',
    homeShort: 'GS',
    awayShort: 'FB',
    homeScore: 2,
    awayScore: 1,
    minute: 64,
    status: 'LIVE',
    homeLogo: `${logoBase}/turkey/Galatasaray.svg`,
    awayLogo: `${logoBase}/turkey/Fenerbahçe.svg`,
  },
  {
    id: 'bjk-ts-demo',
    home: 'Beşiktaş',
    away: 'Trabzonspor',
    homeShort: 'BJK',
    awayShort: 'TS',
    homeScore: 0,
    awayScore: 0,
    minute: 31,
    status: 'LIVE',
    homeLogo: `${logoBase}/turkey/Beşiktaş.svg`,
    awayLogo: `${logoBase}/turkey/Trabzonspor.svg`,
  },
  {
    id: 'ars-che-demo',
    home: 'Arsenal',
    away: 'Chelsea',
    homeShort: 'ARS',
    awayShort: 'CHE',
    homeScore: 1,
    awayScore: 0,
    minute: 72,
    status: 'LIVE',
    homeLogo: `${logoBase}/england/Arsenal.svg`,
    awayLogo: `${logoBase}/england/Chelsea.svg`,
  },
] as const;

export const leaderboard = [
  { rank: 1, name: 'FootballMind', iq: 96, decisions: 48 },
  { rank: 2, name: 'Taktikçi', iq: 94, decisions: 52 },
  { rank: 3, name: 'Mert12', iq: 92, decisions: 41 },
  { rank: 4, name: 'OyununAdamı', iq: 90, decisions: 57 },
  { rank: 5, name: 'TheAnalyst', iq: 89, decisions: 39 },
  { rank: 142, name: 'Sen', iq: 88, decisions: 27 },
];

export const demoDecisions: Decision[] = [
  { id: 'd1', minute: 51, choice: 'PRESS', outcome: 'PRESS', points: 100 },
  { id: 'd2', minute: 57, choice: 'PRESS', outcome: 'PRESS', points: 100 },
  { id: 'd3', minute: 64, choice: 'PRESS', outcome: 'PRESS', points: 100 },
];

export const demoEvents: Record<string, MatchEvent[]> = {
  'gs-fb-demo': [
    { id: 'e1', minute: 57, type: 'SHOT', team: 'HOME', title: 'Galatasaray şut çekti', description: 'Baskı sonrası pozisyon.' },
    { id: 'e2', minute: 61, type: 'CHANCE', team: 'HOME', title: 'Büyük şans', description: 'Galatasaray tehlikeli bölgede.' },
  ],
};

export const demoWindows: Record<string, DecisionWindow[]> = {
  'gs-fb-demo': [
    { id: 'w51', minute: 51, question: 'Takım önde. Ne yapmalı?', choices: ['PRESS', 'DROP', 'CHANGE'], correctChoice: 'PRESS', resolved: true, resolvedByEventId: 'e1' },
    { id: 'w64', minute: 64, question: 'Şimdi hamle zamanı mı?', choices: ['PRESS', 'DROP', 'CHANGE'], correctChoice: 'PRESS', resolved: false },
  ],
};
