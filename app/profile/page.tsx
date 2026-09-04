import Link from 'next/link';
import { demoDecisions } from '@/lib/demo-data';
import { calculateBreakdown, calculateIQ } from '@/lib/scoring';

export default function ProfilePage() {
  const iq = calculateIQ(demoDecisions);
  const breakdown = calculateBreakdown(demoDecisions);
  const rows = [['Tahmin doğruluğu', breakdown.prediction], ['Maç okuma', breakdown.reading], ['Taktik okuma', breakdown.tactical], ['Zamanlama', breakdown.timing], ['Karar tutarlılığı', breakdown.consistency]];
  return <main className="page"><div className="shell"><nav className="nav"><Link href="/" className="brand"><div className="mark">12</div><span>THE 12TH</span></Link><div className="navRight"><Link href="/matches">MAÇLAR</Link><Link href="/leaderboard">LEADERBOARD</Link><span>MY IQ</span></div></nav><section className="hero"><div><div className="eyebrow">Your football intelligence</div><h1>MY<br/><span style={{color:'var(--green)'}}>FOOTBALL IQ.</span></h1><p className="sub">Karar geçmişin, doğruluk oranların ve maç okuma profilin tek yerde.</p></div></section><div className="grid"><div className="card iq"><span className="label">FOOTBALL IQ</span><div className="iqNum">{iq}<span>/100</span></div><div className="progress"><i style={{width:`${iq}%`}}/></div><div className="rows">{rows.map(([name, value]) => <div className="row" key={name}><span>{name}</span><b>{value}</b></div>)}</div></div><div className="card"><span className="label">RECENT DECISIONS</span>{demoDecisions.map((d) => <div className="event" key={d.id}><span className="time">{d.minute}&apos;</span><div><b>{d.choice}</b><p>{d.points === 100 ? 'Doğru okuma · +100' : 'Yanlış okuma · +35'}</p></div></div>)}</div></div></div></main>;
}
