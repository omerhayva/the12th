import Link from 'next/link';
import { leaderboard } from '@/lib/demo-data';

export default function LeaderboardPage() {
  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><span>LEADERBOARD</span><Link href="/profile">MY IQ</Link></div></nav><section className="hero"><div><div className="eyebrow">Global football intelligence</div><h1>GLOBAL<br/><span style={{color:'var(--green)'}}>RANKING.</span></h1><p className="sub">En iyi maç okuyucularını gör. Sıralaman, karar kaliten ve Football IQ puanın her doğru kararla yükselir.</p></div></section><div className="card table">{leaderboard.map((p) => <div className={`rankRow ${p.name === 'Sen' ? 'me' : ''}`} key={p.rank}><b>#{p.rank}</b><span>{p.name}</span><small>{p.decisions} karar</small><strong>{p.iq}</strong></div>)}</div></div></main>;
}
