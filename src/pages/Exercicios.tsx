import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, norm, GRUPOS } from '../data/db'

export default function Exercicios() {
  const [q, setQ] = useState('')
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState(GRUPOS[0])
  const lista = useLiveQuery(() => db.exercicios.orderBy('nome').toArray(), []) ?? []
  const f = lista.filter((e) => norm(e.nome).includes(norm(q)) || norm(e.grupo).includes(norm(q)))

  async function adicionar() {
    if (!nome.trim()) return alert('Informe o nome do exercício.')
    try { await db.exercicios.add({ nome: nome.trim(), grupo, personalizado: true }); setNome('') }
    catch { alert('Já existe um exercício com esse nome.') }
  }
  async function excluir(id: number) {
    if (await db.treinoExercicios.where('exercicioId').equals(id).count()) return alert('Este exercício está em algum treino. Remova-o do treino antes.')
    if (confirm('Excluir este exercício?')) await db.exercicios.delete(id)
  }
  return (
    <>
      <h1>Exercícios</h1>
      <div className="card">
        <b>Novo exercício</b>
        <input style={{ margin: '8px 0' }} placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="row"><select value={grupo} onChange={(e) => setGrupo(e.target.value)}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select>
          <button className="pri" onClick={adicionar}>Adicionar</button></div>
      </div>
      <input placeholder="🔎 Pesquisar" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ height: 12 }} />
      {f.map((e) => (
        <div className="card row" key={e.id}><div className="grow"><b>{e.nome}</b><div className="mut">{e.grupo}{e.personalizado ? ' · personalizado' : ''}</div></div>
          <button className="sm danger" onClick={() => excluir(e.id!)}>Excluir</button></div>
      ))}
    </>
  )
}
