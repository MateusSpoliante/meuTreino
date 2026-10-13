import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, num, DIAS } from '../data/db'

type EdSerie = { reps: string; peso: string }
type EdEx = { exercicioId: number; descanso: string; obs: string; series: EdSerie[] }

export default function EditarTreino() {
  const { id } = useParams()
  const nav = useNavigate()
  const exs = useLiveQuery(() => db.exercicios.orderBy('nome').toArray(), []) ?? []
  const [nome, setNome] = useState('')
  const [dias, setDias] = useState<number[]>([])
  const [lista, setLista] = useState<EdEx[]>([])
  const [pronto, setPronto] = useState(id === 'novo')

  useEffect(() => {
    if (id === 'novo') return
    ;(async () => {
      const t = await db.treinos.get(Number(id))
      if (!t) return nav('/treinos')
      const l: EdEx[] = []
      for (const te of await db.treinoExercicios.where('treinoId').equals(t.id!).sortBy('posicao')) {
        const s = await db.seriesPlanejadas.where('treinoExercicioId').equals(te.id!).sortBy('numero')
        l.push({ exercicioId: te.exercicioId, descanso: String(te.descanso), obs: te.obs, series: s.map((x) => ({ reps: String(x.reps), peso: String(x.peso) })) })
      }
      setNome(t.nome); setDias(t.dias); setLista(l); setPronto(true)
    })()
  }, [id])

  const nomeEx = (i: number) => exs.find((e) => e.id === i)?.nome ?? '…'
  const setEx = (i: number, p: Partial<EdEx>) => setLista((l) => l.map((e, k) => (k === i ? { ...e, ...p } : e)))
  const setSerie = (i: number, j: number, p: Partial<EdSerie>) => setEx(i, { series: lista[i].series.map((s, k) => (k === j ? { ...s, ...p } : s)) })
  const mover = (i: number, d: number) => setLista((l) => {
    const n = [...l]; if (!n[i + d]) return l; [n[i], n[i + d]] = [n[i + d], n[i]]; return n
  })

  async function salvar() {
    if (!nome.trim()) return alert('Dê um nome ao treino.')
    for (const e of lista) {
      const d = num(e.descanso)
      if (!Number.isInteger(d) || d < 0) return alert('Descanso deve ser um número inteiro de segundos.')
      if (!e.series.length) return alert(`“${nomeEx(e.exercicioId)}” precisa de pelo menos 1 série.`)
      for (const s of e.series) {
        const r = num(s.reps), p = num(s.peso)
        if (!Number.isInteger(r) || r <= 0 || isNaN(p) || p < 0) return alert('Confira: repetições devem ser inteiros maiores que 0 e pesos, 0 ou mais.')
      }
    }
    await db.transaction('rw', [db.treinos, db.treinoExercicios, db.seriesPlanejadas], async () => {
      let tid: number
      if (id === 'novo') tid = await db.treinos.add({ nome: nome.trim(), posicao: Date.now(), dias })
      else {
        tid = Number(id)
        await db.treinos.update(tid, { nome: nome.trim(), dias })
        const antigos = await db.treinoExercicios.where('treinoId').equals(tid).primaryKeys()
        await db.seriesPlanejadas.where('treinoExercicioId').anyOf(antigos).delete()
        await db.treinoExercicios.bulkDelete(antigos)
      }
      for (const [i, e] of lista.entries()) {
        const teId = await db.treinoExercicios.add({ treinoId: tid, exercicioId: e.exercicioId, posicao: i, descanso: num(e.descanso), obs: e.obs })
        await db.seriesPlanejadas.bulkAdd(e.series.map((s, n) => ({ treinoExercicioId: teId, numero: n + 1, reps: num(s.reps), peso: num(s.peso) })))
      }
    })
    nav('/treinos')
  }

  if (!pronto) return <p>Carregando…</p>
  return (
    <>
      <h1>{id === 'novo' ? 'Novo treino' : 'Editar treino'}</h1>
      <input placeholder="Nome (ex.: Treino A – Peito e Tríceps)" value={nome} onChange={(e) => setNome(e.target.value)} />
      <h2>Dias da semana</h2>
      <div className="row wrap">{DIAS.map((d, i) => (
        <button key={i} className={'sm ' + (dias.includes(i) ? 'on' : '')} onClick={() => setDias((x) => (x.includes(i) ? x.filter((k) => k !== i) : [...x, i]))}>{d}</button>
      ))}</div>
      <h2>Exercícios</h2>
      {lista.map((e, i) => (
        <div className="card" key={i}>
          <div className="row"><b className="grow">{i + 1}. {nomeEx(e.exercicioId)}</b>
            <button className="sm" onClick={() => mover(i, -1)}>↑</button><button className="sm" onClick={() => mover(i, 1)}>↓</button>
            <button className="sm danger" onClick={() => setLista((l) => l.filter((_, k) => k !== i))}>✕</button></div>
          <div className="mut" style={{ margin: '8px 0 4px' }}>Série · peso (kg) · repetições</div>
          {e.series.map((s, j) => (
            <div className="row" key={j} style={{ marginBottom: 6 }}>
              <span style={{ width: 24 }}>{j + 1}</span>
              <input className="num" inputMode="decimal" value={s.peso} onChange={(ev) => setSerie(i, j, { peso: ev.target.value })} />
              <input className="num" inputMode="numeric" value={s.reps} onChange={(ev) => setSerie(i, j, { reps: ev.target.value })} />
              <button className="sm danger" onClick={() => setEx(i, { series: e.series.filter((_, k) => k !== j) })}>−</button>
            </div>
          ))}
          <button className="sm" onClick={() => setEx(i, { series: [...e.series, { ...(e.series[e.series.length - 1] ?? { reps: '10', peso: '0' }) }] })}>+ Série</button>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="mut">Descanso (s)</span><input className="num" style={{ width: 90 }} inputMode="numeric" value={e.descanso} onChange={(ev) => setEx(i, { descanso: ev.target.value })} />
          </div>
          <input style={{ marginTop: 8 }} placeholder="Observação (opcional)" value={e.obs} onChange={(ev) => setEx(i, { obs: ev.target.value })} />
        </div>
      ))}
      <select value="" onChange={(ev) => ev.target.value && setLista((l) => [...l, { exercicioId: Number(ev.target.value), descanso: '60', obs: '', series: [{ reps: '12', peso: '0' }, { reps: '10', peso: '0' }, { reps: '8', peso: '0' }] }])}>
        <option value="">+ Adicionar exercício…</option>
        {exs.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.grupo})</option>)}
      </select>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="grow" onClick={() => nav('/treinos')}>Cancelar</button>
        <button className="pri grow" onClick={salvar}>Salvar</button>
      </div>
    </>
  )
}
