'use client';

import Link from 'next/link';
import { useMemo } from 'react';

export default function ShareScorePage({ params }: { params: { score: string } }) {
  const score = useMemo(() => Math.max(0, Math.min(100, Number(params.score) || 0)), [params.score]);

  return (
    <main className="page">
      <div className="shell">
        <nav className="nav">
          <Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link>
          <div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><Link href="/profile">MY IQ</Link></div>
        </nav>

        <section className="hero share-card">
          <div className="eyebrow">THE 12TH / FOOTBALL INTELLIGENCE</div>
          <div className="share-score">{score}</div>
          <h1>FOOTBALL IQ</h1>
          <p className="sub">Ben maçı sadece izlemiyorum. Okuyorum.</p>

          <div className="share-stats">
            <div><span>MAÇ OKUMA</span><strong>{Math.min(99, score + 3)}</strong></div>
            <div><span>TAKTİK OKUMA</span><strong>{Math.min(99, score - 1 < 0 ? 0 : score - 1)}</strong></div>
            <div><span>ZAMANLAMA</span><strong>{Math.min(99, score + 6)}</strong></div>
          </div>

          <div className="share-actions">
            <Link href="/" className="submit">SEN DE DENE →</Link>
            <Link href="/leaderboard" className="secondary-btn">LEADERBOARD</Link>
          </div>
        </section>

        <p className="share-note">THE 12TH • Read the game. Make the call. Prove your football IQ.</p>
      </div>
    </main>
  );
}
