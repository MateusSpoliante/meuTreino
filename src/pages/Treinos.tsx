import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db, iniciarTreino, DIAS } from '../data/db'

export default function Treinos() {
  const nav = useNavigate()
  const treinos = useLiveQuery(() => db.treinos.orderBy('posicao').filter((t) => !t.arquivado).toArray(), []) ?? []

  async function mover(i: number, d: number) {
    const a = treinos[i], b = treinos[i + d]
    if (!b) return
    await db.transaction('rw', db.treinos, async () => {
      await db.treinos.update(a.id!, { posicao: b.posicao })
      await db.treinos.update(b.id!, { posicao: a.posicao })
    })
  }
  async function duplicar(id: number) {
    await db.transaction('rw', [db.treinos, db.treinoExercicios, db.seriesPlanejadas], async () => {
      const t = await db.treinos.get(id)
      if (!t) return
      const novo = await db.treinos.add({ nome: t.nome + ' (cópia)', posicao: Date.now(), dias: [] })
      for (const te of await db.treinoExercicios.where('treinoId').equals(id).toArray()) {
        const sp = await db.seriesPlanejadas.where('treinoExercicioId').equals(te.id!).toArray()
        const neId = await db.treinoExercicios.add({ ...te, id: undefined, treinoId: novo })
        await db.seriesPlanejadas.bulkAdd(sp.map((s) => ({ ...s, id: undefined, treinoExercicioId: neId })))
      }
    })
  }
  async function arquivar(id: number) {
    if (confirm('Excluir este treino? O histórico de treinos já realizados será mantido.')) await db.treinos.update(id, { arquivado: true })
  }
  async function iniciar(id: number) {
    try { await iniciarTreino(id); nav('/treino') } catch (e) { alert((e as Error).message) }
  }

  return (
    <>
      <h1>Meus treinos</h1>
      <button className="pri big" onClick={() => nav('/treinos/novo')}>+ Novo treino</button>
      <div style={{ height: 12 }} />
      {treinos.length === 0 && <div className="card mut">Nenhum treino criado ainda.</div>}
      {treinos.map((t, i) => (
        <div className="card" key={t.id}>
          <div className="row"><b className="grow">{t.nome}</b>
            <button className="sm" onClick={() => mover(i, -1)} disabled={i === 0}>↑</button>
            <button className="sm" onClick={() => mover(i, 1)} disabled={i === treinos.length - 1}>↓</button></div>
          <div className="mut">{t.dias.length ? t.dias.map((d) => DIAS[d]).join(', ') : 'Sem dias definidos'}</div>
          <div className="row wrap" style={{ marginTop: 10 }}>
            <button className="pri sm" onClick={() => iniciar(t.id!)}>Iniciar</button>
            <button className="sm" onClick={() => nav('/treinos/' + t.id)}>Editar</button>
            <button className="sm" onClick={() => duplicar(t.id!)}>Duplicar</button>
            <button className="sm danger" onClick={() => arquivar(t.id!)}>Excluir</button>
          </div>
        </div>
      ))}
    </>
  )
}
