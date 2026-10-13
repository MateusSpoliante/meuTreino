import { useEffect } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './data/db'
import Inicio from './pages/Inicio'
import Treinos from './pages/Treinos'
import EditarTreino from './pages/EditarTreino'
import TreinoAtual from './pages/TreinoAtual'
import Historico from './pages/Historico'
import Exercicios from './pages/Exercicios'
import Ajustes from './pages/Ajustes'

const ABAS = [['/', '🏠', 'Início'], ['/treinos', '📋', 'Treinos'], ['/historico', '📈', 'Histórico'], ['/exercicios', '🏋️', 'Exercícios'], ['/ajustes', '⚙️', 'Ajustes']]

export default function App() {
  const { pathname } = useLocation()
  const ativa = useLiveQuery(() => db.sessoes.where('status').equals('andamento').first(), [])
  useEffect(() => { navigator.storage?.persist?.() }, [])
  const emTreino = pathname === '/treino'
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/treinos" element={<Treinos />} />
        <Route path="/treinos/:id" element={<EditarTreino />} />
        <Route path="/treino" element={<TreinoAtual />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/exercicios" element={<Exercicios />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!emTreino && ativa && <Link className="bar" to="/treino">▶ Continuar: {ativa.nome}</Link>}
      {!emTreino && (
        <nav className="tabs">
          {ABAS.map(([to, ic, nome]) => (
            <NavLink key={to} to={to} end={to === '/'}><div style={{ fontSize: 20 }}>{ic}</div>{nome}</NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
