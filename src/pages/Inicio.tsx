import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, iniciarTreino, volume, fmtData, fmtDur, DIAS } from '../data/db'

export default function Inicio() {
  const nav = useNavigate()
  const treinos = useLiveQuery(() => db.treinos.orderBy('posicao').filter((t) => !t.arquivado).toArray(), []) ?? []
  const contagem = useLiveQuery(async () => {
    const m: Record<number, number> = {}
    for (const te of await db.treinoExercicios.toArray()) m[te.treinoId] = (m[te.treinoId] ?? 0) + 1
    return m
  }, []) ?? {}
  const ativa = useLiveQuery(() => db.sessoes.where('status').equals('andamento').first(), [])
  const ultima = useLiveQuery(async () => {
    const s = (await db.sessoes.where('status').equals('finalizada').toArray()).sort((a, b) => b.inicio - a.inicio)[0]
    if (!s) return null
    return { s, series: await db.seriesRealizadas.where('sessaoId').equals(s.id!).toArray() }
  }, [])

  const hoje = new Date().getDay()
  const doDia = treinos.filter((t) => t.dias.includes(hoje))
  const proximos: { dia: string; nome: string }[] = []
  for (let o = 1; o <= 7 && proximos.length < 3; o++)
    for (const t of treinos) if (t.dias.includes((hoje + o) % 7)) proximos.push({ dia: DIAS[(hoje + o) % 7], nome: t.nome })

  async function iniciar(id: number) {
    try { await iniciarTreino(id); nav('/treino') } catch (e) { alert((e as Error).message) }
  }

  return (
    <>
      <h1>Início</h1>
      {ativa && <div className="card"><b>Treino em andamento: {ativa.nome}</b><br /><button className="pri big" style={{ marginTop: 10 }} onClick={() => nav('/treino')}>Continuar treino</button></div>}
      <h2>Treino de hoje ({DIAS[hoje]})</h2>
      {doDia.length === 0 && <div className="card mut">Nenhum treino programado para hoje. Defina os dias em “Treinos”.</div>}
      {doDia.map((t) => (
        <div className="card" key={t.id}>
          <b>{t.nome}</b> <span className="mut">· {contagem[t.id!] ?? 0} exercícios</span>
          {!ativa && <button className="pri big" style={{ marginTop: 10 }} onClick={() => iniciar(t.id!)}>Iniciar treino</button>}
        </div>
      ))}
      {treinos.length > 0 && !ativa && doDia.length === 0 && (
        <div className="card"><div className="mut" style={{ marginBottom: 8 }}>Ou inicie outro treino:</div>
          <div className="row wrap">{treinos.map((t) => <button key={t.id} onClick={() => iniciar(t.id!)}>{t.nome}</button>)}</div></div>
      )}
      {proximos.length > 0 && <><h2>Próximos treinos</h2><div className="card">{proximos.map((p, i) => <div key={i}>{p.dia} — {p.nome}</div>)}</div></>}
      <h2>Último treino</h2>
      <div className="card">
        {ultima ? <><b>{ultima.s.nome}</b><div className="mut">{fmtData(ultima.s.inicio)} · {fmtDur((ultima.s.fim ?? ultima.s.inicio) - ultima.s.inicio)}</div>
          <div>{ultima.series.filter((s) => s.ok).length} séries · volume {Math.round(volume(ultima.series))} kg</div></> : <span className="mut">Nenhum treino realizado ainda.</span>}
      </div>
    </>
  )
}
