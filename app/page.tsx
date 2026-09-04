'use client';

import { useState } from 'react';

const options = [
  ['01', 'BASKI', 'Rakibi kendi yarı alanına it'],
  ['02', 'GERİ ÇEKİL', 'Blokları daralt, kontrayı bekle'],
  ['03', 'DEĞİŞİKLİK', 'Oyuncu değişikliğiyle dengeyi değiştir'],
];

export default function Home() {
  const [selected, setSelected] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  function decide() {
    if (!selected) return;
    setLocked(true);
  }

  return (
    <main className="page">
      <div className="shell">
        <nav className="nav">
          <div className="brand"><div className="mark">12</div><span>THE 12TH</span></div>
          <div className="navRight"><div className="live"><i className="dot"/> LIVE MATCH</div><span>LEADERBOARD</span><span>MY IQ</span></div>
        </nav>

        <section className="hero">
          <div>
            <div className="eyebrow">Football intelligence platform</div>
            <h1>READ THE GAME.<br/><span style={{color:'var(--green)'}}>MAKE THE CALL.</span></h1>
            <p className="sub">Maç devam ederken karar ver. Gerçek olay gerçekleştiğinde ne kadar doğru okuduğunu gör. Taraftar değil, oyunun 12. oyuncusu ol.</p>
          </div>
          <div className="statStrip">
            <div className="mini"><b>2.4K</b><span>LIVE PLAYERS</span></div>
            <div className="mini"><b>88</b><span>YOUR FOOTBALL IQ</span></div>
            <div className="mini"><b>#142</b><span>GLOBAL RANK</span></div>
          </div>
        </section>

        <section className="grid">
          <div className="card">
            <div className="cardHead"><span className="label">LIVE / DEMO MATCH</span><span className="label">23:41</span></div>
            <div className="match">
              <div className="teams">
                <div><div className="crest">GS</div><div className="teamName">Galatasaray</div></div>
                <div><div className="score">2 — 1</div><div className="minute">● 64&apos;</div></div>
                <div><div className="crest">FB</div><div className="teamName">Fenerbahçe</div></div>
              </div>
              <div className="pulse">
                <div className="pulseTop"><strong>FAN PULSE</strong><span className="label">2,418 VOTES</span></div>
                <div className="bar"><i/><i/></div>
                <div className="split"><span>GALATASARAY 61%</span><span>FENERBAHÇE 39%</span></div>
              </div>
            </div>
            <div className="question">
              <span className="eyebrow">THE 12TH DECISION · 10 SEC</span>
              <h2>Galatasaray topa sahip. Rakip blok geride. Şimdi ne yapılmalı?</h2>
              <div className="options">
                {options.map(([num, title, desc]) => <button key={title} className={`option ${selected === title ? 'selected' : ''}`} onClick={() => !locked && setSelected(title)}><small>{num}</small><strong>{title}</strong><div style={{fontSize:10,color:'var(--muted)',marginTop:6,lineHeight:1.4}}>{desc}</div></button>)}
              </div>
              <button className="submit" disabled={!selected || locked} onClick={decide}>{locked ? 'KARAR KİLİTLENDİ ✓' : 'KARARINI VER →'}</button>
            </div>
          </div>

          <aside className="side">
            <div className="card iq">
              <span className="label">YOUR FOOTBALL IQ</span>
              <div className="iqNum">88<span>/100</span></div>
              <div className="progress"><i/></div>
              <div className="rows">
                <div className="row"><span>Prediction accuracy</span><b>82</b></div>
                <div className="row"><span>Match reading</span><b>91</b></div>
                <div className="row"><span>Tactical reading</span><b>87</b></div>
                <div className="row"><span>Timing</span><b>94</b></div>
              </div>
            </div>
            <div className="card">
              <div className="cardHead"><span className="label">MATCH TIMELINE</span><span className="label">LIVE</span></div>
              <div className="timeline">
                <div className="event"><span className="time">64&apos;</span><div><b>12TH DECISION</b><p>Rakip savunması kompakt. Kararını bekliyoruz.</p></div></div>
                <div className="event"><span className="time">61&apos;</span><div><b>FAN PULSE</b><p>Topa sahip olma: GS 58% · FB 42%</p></div></div>
                <div className="event"><span className="time">57&apos;</span><div><b>ŞUT</b><p>Ceza sahası dışından deneme. Kaleci kurtardı.</p></div></div>
                <div className="event"><span className="time">51&apos;</span><div><b>GOL · GS</b><p>Gerçekleşen olay: Sağ kanattan hızlı hücum.</p></div></div>
              </div>
            </div>
          </aside>
        </section>

        <footer className="footer"><span>THE 12TH © 2026 — FOOTBALL INTELLIGENCE</span><span>NO BETTING. JUST THE GAME.</span></footer>
      </div>
    </main>
  );
}
