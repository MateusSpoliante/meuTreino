import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, num, SerieRealizada } from '../data/db'

function Anterior({ exId, sid }: { exId: number; sid: number }) {
  const txt = useLiveQuery(async () => {
    const todas = (await db.seriesRealizadas.where('exercicioId').equals(exId).toArray()).filter((s) => s.ok && s.sessaoId !== sid)
    if (!todas.length) return ''
    const ult = todas.sort((a, b) => (b.em ?? 0) - (a.em ?? 0))[0].sessaoId
    return todas.filter((s) => s.sessaoId === ult).sort((a, b) => a.numero - b.numero).map((s) => `${s.peso}kg×${s.reps}`).join(' · ')
  }, [exId, sid])
  return <div className="mut">Último treino: {txt || 'sem registro'}</div>
}

const valido = (r: number, p: number) => Number.isInteger(r) && r >= 0 && !isNaN(p) && p >= 0

function Linha({ s, onOk, onUndo }: { s: SerieRealizada; onOk: (s: SerieRealizada, r: number, p: number) => void; onUndo: (s: SerieRealizada) => void }) {
  const [reps, setReps] = useState(String(s.reps ?? s.repsPlan))
  const [peso, setPeso] = useState(String(s.peso ?? s.pesoPlan))
  const salvar = () => { const r = num(reps), p = num(peso); if (!s.ok && valido(r, p)) db.seriesRealizadas.update(s.id!, { reps: r, peso: p }) }
  return (
    <div className={'row ' + (s.ok ? 'done' : '')} style={{ marginBottom: 8 }}>
      <span style={{ width: 22 }}>{s.numero}</span>
      <input className="num" inputMode="decimal" aria-label="Peso em kg" value={peso} disabled={s.ok} onChange={(e) => setPeso(e.target.value)} onBlur={salvar} />
      <span className="mut">kg</span>
      <input className="num" inputMode="numeric" aria-label="Repetições" value={reps} disabled={s.ok} onChange={(e) => setReps(e.target.value)} onBlur={salvar} />
      <span className="mut">rep</span>
      {s.ok ? <button onClick={() => onUndo(s)}>↩</button>
        : <button className="pri" onClick={() => { const r = num(reps), p = num(peso); valido(r, p) ? onOk(s, r, p) : alert('Informe repetições (inteiro) e peso (número) válidos.') }}>✓</button>}
    </div>
  )
}

export default function TreinoAtual() {
  const nav = useNavigate()
  // null = carregando; undefined = não há treino em andamento
  const sessao = useLiveQuery(() => db.sessoes.where('status').equals('andamento').first(), [], null)
  const series = useLiveQuery(async () => (sessao ? db.seriesRealizadas.where('sessaoId').equals(sessao.id!).toArray() : []), [sessao?.id]) ?? []
  const [vis, setVis] = useState<number | null>(null)
  const [agora, setAgora] = useState(Date.now())
  const ate = sessao?.descansoAte
  const rest = ate ? Math.ceil((ate - agora) / 1000) : 0

  useEffect(() => {
    if (!ate) return
    const t = setInterval(() => setAgora(Date.now()), 250)
    return () => clearInterval(t)
  }, [ate])
  useEffect(() => {
    if (sessao && ate && rest <= 0) { navigator.vibrate?.([300, 120, 300]); db.sessoes.update(sessao.id!, { descansoAte: undefined }) }
  }, [rest, ate])
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const pedir = () => (navigator as any).wakeLock?.request('screen').then((l: WakeLockSentinel) => (lock = l)).catch(() => {})
    pedir()
    const vc = () => document.visibilityState === 'visible' && pedir()
    document.addEventListener('visibilitychange', vc)
    return () => { document.removeEventListener('visibilitychange', vc); lock?.release() }
  }, [])

  if (sessao === null) return <p>Carregando…</p>
  if (!sessao) return <div className="card">Nenhum treino em andamento.<br /><button className="pri" style={{ marginTop: 10 }} onClick={() => nav('/')}>Voltar ao início</button></div>

  const poss = [...new Set(series.map((s) => s.pos))].sort((a, b) => a - b)
  const doEx = (p: number) => series.filter((s) => s.pos === p).sort((a, b) => a.numero - b.numero)
  const idx = Math.min(vis ?? sessao.atual, Math.max(poss.length - 1, 0))
  const pos = poss[idx]
  const atual = doEx(pos)
  const feitas = series.filter((s) => s.ok).length
  const ir = (n: number) => { setVis(n); db.sessoes.update(sessao.id!, { atual: n }) }
  const iniciarDescanso = (seg: number) => db.sessoes.update(sessao.id!, { descansoAte: Date.now() + seg * 1000 })

  async function concluir(s: SerieRealizada, reps: number, peso: number) {
    await db.seriesRealizadas.update(s.id!, { reps, peso, ok: true, em: Date.now() })
    iniciarDescanso(s.descanso)
  }
  async function addSerie() {
    const u = atual[atual.length - 1]
    await db.seriesRealizadas.add({ ...u, id: undefined, numero: u.numero + 1, reps: undefined, peso: undefined, ok: false, em: undefined })
  }
  async function finalizar() {
    const pend = series.filter((s) => !s.ok).length
    if (pend && !confirm(`Faltam ${pend} séries. Finalizar mesmo assim?`)) return
    await db.sessoes.update(sessao!.id!, { status: 'finalizada', fim: Date.now(), descansoAte: undefined })
    nav('/historico')
  }
  async function cancelar() {
    if (!confirm('Cancelar e apagar este treino em andamento?')) return
    await db.transaction('rw', [db.sessoes, db.seriesRealizadas], async () => {
      await db.seriesRealizadas.where('sessaoId').equals(sessao!.id!).delete()
      await db.sessoes.delete(sessao!.id!)
    })
    nav('/')
  }

  return (
    <>
      <div className="row"><button className="sm" onClick={() => nav('/')}>← Sair (progresso salvo)</button></div>
      <h1 style={{ marginTop: 12 }}>{sessao.nome}</h1>
      <div className="prog"><i style={{ width: `${series.length ? (feitas / series.length) * 100 : 0}%` }} /></div>
      <div className="mut" style={{ margin: '4px 0 12px' }}>Treino: {feitas}/{series.length} séries · Exercício {idx + 1} de {poss.length}</div>

      {ate && (
        <div className="card sticky">
          <div className="timer">{Math.floor(Math.max(rest, 0) / 60)}:{String(Math.max(rest, 0) % 60).padStart(2, '0')}</div>
          <div className="row"><button className="grow" onClick={() => iniciarDescanso(Math.max(rest - 15, 0))}>−15s</button>
            <button className="grow" onClick={() => iniciarDescanso(rest + 15)}>+15s</button>
            <button className="grow" onClick={() => db.sessoes.update(sessao.id!, { descansoAte: undefined })}>Pular</button></div>
        </div>
      )}

      {atual.length > 0 && (
        <div className="card">
          <h2 style={{ margin: 0 }}>{atual[0].nome}</h2>
          <div className="mut">Planejado: {atual.map((s) => `${s.repsPlan}×${s.pesoPlan}kg`).join(' · ')}</div>
          <Anterior exId={atual[0].exercicioId} sid={sessao.id!} />
          {atual[0].obs && <div className="mut">📝 {atual[0].obs}</div>}
          <div className="prog" style={{ margin: '10px 0' }}><i style={{ width: `${(atual.filter((s) => s.ok).length / atual.length) * 100}%` }} /></div>
          {atual.map((s) => <Linha key={s.id + '-' + s.ok} s={s} onOk={concluir} onUndo={(x) => db.seriesRealizadas.update(x.id!, { ok: false, em: undefined })} />)}
          <div className="row wrap"><button className="sm" onClick={addSerie}>+ Série extra</button>
            {!ate && <button className="sm" onClick={() => iniciarDescanso(atual[0].descanso)}>⏱ Descanso {atual[0].descanso}s</button>}</div>
        </div>
      )}

      <div className="row">
        <button className="grow" disabled={idx === 0} onClick={() => ir(idx - 1)}>← Anterior</button>
        <button className="pri grow" disabled={idx >= poss.length - 1} onClick={() => ir(idx + 1)}>Próximo →</button>
      </div>

      <h2>Exercícios do treino</h2>
      {poss.map((p, k) => { const l = doEx(p); return (
        <button key={p} className={'big ' + (k === idx ? 'on' : '')} style={{ marginBottom: 6, textAlign: 'left', minHeight: 48, fontSize: '1rem' }} onClick={() => ir(k)}>
          {k + 1}. {l[0].nome} — {l.filter((s) => s.ok).length}/{l.length}
        </button>) })}

      <h2>Anotações da sessão</h2>
      <textarea defaultValue={sessao.obs} placeholder="Como foi o treino?" onBlur={(e) => db.sessoes.update(sessao.id!, { obs: e.target.value })} />
      <div style={{ height: 12 }} />
      <button className="pri big" onClick={finalizar}>Finalizar treino</button>
      <button className="danger" style={{ width: '100%', marginTop: 8 }} onClick={cancelar}>Cancelar treino</button>
    </>
  )
}
