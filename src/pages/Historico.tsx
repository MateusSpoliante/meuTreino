import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, volume, fmtData, fmtDur, SerieRealizada, Sessao } from '../data/db'

function Calendario({ sessoes }: { sessoes: Sessao[] }) {
  const [ref, setRef] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const dias = new Set(sessoes.map((s) => new Date(s.inicio).toDateString()))
  const n = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
  const cel: (number | null)[] = [...Array(ref.getDay()).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)]
  return (
    <div className="card">
      <div className="row"><button className="sm" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}>‹</button>
        <b className="grow" style={{ textAlign: 'center' }}>{ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</b>
        <button className="sm" onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}>›</button></div>
      <div className="cal" style={{ marginTop: 8 }}>
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <span key={i} className="mut">{d}</span>)}
        {cel.map((d, i) => <span key={i} className={d && dias.has(new Date(ref.getFullYear(), ref.getMonth(), d).toDateString()) ? 't' : ''}>{d ?? ''}</span>)}
      </div>
    </div>
  )
}

function Evolucao({ series, sessoes }: { series: SerieRealizada[]; sessoes: Sessao[] }) {
  const ok = series.filter((s) => s.ok)
  const nomes = [...new Map(ok.map((s) => [s.exercicioId, s.nome] as [number, string]))]
  const [sel, setSel] = useState(0)
  const id = sel || nomes[0]?.[0]
  if (!id) return <div className="card mut">Conclua séries para ver a evolução.</div>
  const max = new Map<number, number>()
  ok.filter((s) => s.exercicioId === id).forEach((s) => max.set(s.sessaoId, Math.max(max.get(s.sessaoId) ?? 0, s.peso ?? 0)))
  const pts = sessoes.filter((s) => max.has(s.id!)).sort((a, b) => a.inicio - b.inicio).map((s) => max.get(s.id!)!)
  if (!pts.length) return <div className="card mut">Sem sessões finalizadas para este exercício.</div>
  const lo = Math.min(...pts), hi = Math.max(...pts)
  const xy = pts.map((v, i) => `${pts.length > 1 ? 10 + (i / (pts.length - 1)) * 280 : 150},${hi === lo ? 60 : 110 - ((v - lo) / (hi - lo)) * 100}`).join(' ')
  const ult = pts[pts.length - 1], ant = pts[pts.length - 2]
  return (
    <div className="card">
      <select value={id} onChange={(e) => setSel(Number(e.target.value))}>{nomes.map(([i, n]) => <option key={i} value={i}>{n}</option>)}</select>
      <svg viewBox="0 0 300 120" style={{ width: '100%', margin: '10px 0' }}><polyline points={xy} fill="none" stroke="var(--ac)" strokeWidth="3" />
        {xy.split(' ').map((p, i) => <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="4" fill="var(--ac)" />)}</svg>
      <div>🏆 Recorde: <b>{hi} kg</b> · Último: <b>{ult} kg</b>{ant !== undefined && <> · Anterior: {ant} kg ({ult - ant >= 0 ? '+' : ''}{ult - ant} kg)</>}</div>
      {pts.length < 2 && <div className="mut">Precisa de mais sessões para mostrar a evolução.</div>}
    </div>
  )
}

export default function Historico() {
  const sessoes = useLiveQuery(() => db.sessoes.where('status').equals('finalizada').toArray().then((a) => a.sort((x, y) => y.inicio - x.inicio)), []) ?? []
  const series = useLiveQuery(() => db.seriesRealizadas.toArray(), []) ?? []
  const [aberta, setAberta] = useState<number | null>(null)

  async function excluir(id: number) {
    if (!confirm('Excluir esta sessão do histórico?')) return
    await db.transaction('rw', [db.sessoes, db.seriesRealizadas], async () => {
      await db.seriesRealizadas.where('sessaoId').equals(id).delete(); await db.sessoes.delete(id)
    })
  }
  return (
    <>
      <h1>Histórico</h1>
      <h2>Calendário</h2><Calendario sessoes={sessoes} />
      <h2>Evolução de carga</h2><Evolucao series={series} sessoes={sessoes} />
      <h2>Treinos realizados</h2>
      {sessoes.length === 0 && <div className="card mut">Nenhum treino finalizado ainda.</div>}
      {sessoes.map((s) => {
        const ser = series.filter((x) => x.sessaoId === s.id).sort((a, b) => a.pos - b.pos || a.numero - b.numero)
        return (
          <div className="card" key={s.id}>
            <div onClick={() => setAberta(aberta === s.id ? null : s.id!)} style={{ cursor: 'pointer' }}>
              <b>{s.nome}</b><div className="mut">{fmtData(s.inicio)} · {fmtDur((s.fim ?? s.inicio) - s.inicio)} · volume {Math.round(volume(ser))} kg</div>
            </div>
            {aberta === s.id && (
              <div style={{ marginTop: 10 }}>
                {s.obs && <div className="mut">📝 {s.obs}</div>}
                {ser.map((x) => (
                  <div key={x.id} className={x.ok ? '' : 'mut'}>{x.nome} · série {x.numero}: {x.ok ? `${x.peso}kg × ${x.reps}` : 'não feita'} <span className="mut">(plano {x.pesoPlan}kg × {x.repsPlan})</span></div>
                ))}
                <button className="sm danger" style={{ marginTop: 8 }} onClick={() => excluir(s.id!)}>Excluir sessão</button>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
