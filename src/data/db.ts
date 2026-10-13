import Dexie, { Table } from 'dexie'

export type Exercicio = { id?: number; nome: string; grupo: string; personalizado?: boolean }
export type Treino = { id?: number; nome: string; posicao: number; dias: number[]; arquivado?: boolean }
export type TreinoExercicio = { id?: number; treinoId: number; exercicioId: number; posicao: number; descanso: number; obs: string }
export type SeriePlanejada = { id?: number; treinoExercicioId: number; numero: number; reps: number; peso: number }
export type Sessao = { id?: number; treinoId?: number; nome: string; inicio: number; fim?: number; status: 'andamento' | 'finalizada'; atual: number; obs: string; descansoAte?: number }
/** Planejado (repsPlan/pesoPlan) e realizado (reps/peso) ficam separados. Nome do exercício é copiado para não mudar o histórico. */
export type SerieRealizada = {
  id?: number; sessaoId: number; exercicioId: number; nome: string; pos: number; numero: number
  repsPlan: number; pesoPlan: number; descanso: number; obs: string
  reps?: number; peso?: number; ok: boolean; em?: number
}

class MeuTreinoDB extends Dexie {
  exercicios!: Table<Exercicio, number>
  treinos!: Table<Treino, number>
  treinoExercicios!: Table<TreinoExercicio, number>
  seriesPlanejadas!: Table<SeriePlanejada, number>
  sessoes!: Table<Sessao, number>
  seriesRealizadas!: Table<SerieRealizada, number>
  constructor() {
    super('meutreino')
    // Mudanças futuras: criar this.version(2) em vez de editar a 1, para nunca perder dados.
    this.version(1).stores({
      exercicios: '++id,&nome,grupo',
      treinos: '++id,posicao',
      treinoExercicios: '++id,treinoId',
      seriesPlanejadas: '++id,treinoExercicioId',
      sessoes: '++id,status,inicio',
      seriesRealizadas: '++id,sessaoId,exercicioId'
    })
  }
}
export const db = new MeuTreinoDB()

export const GRUPOS = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteos', 'Abdômen', 'Panturrilha', 'Outro']
export const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const SEED: [string, string][] = [
  ['Supino reto com barra', 'Peito'], ['Supino inclinado com halteres', 'Peito'], ['Crucifixo', 'Peito'], ['Crossover', 'Peito'],
  ['Puxada frontal', 'Costas'], ['Remada curvada', 'Costas'], ['Remada baixa', 'Costas'], ['Barra fixa', 'Costas'],
  ['Desenvolvimento com halteres', 'Ombros'], ['Elevação lateral', 'Ombros'], ['Elevação frontal', 'Ombros'],
  ['Rosca direta', 'Bíceps'], ['Rosca alternada', 'Bíceps'], ['Rosca martelo', 'Bíceps'],
  ['Tríceps pulley', 'Tríceps'], ['Tríceps testa', 'Tríceps'], ['Tríceps francês', 'Tríceps'],
  ['Agachamento livre', 'Pernas'], ['Leg press 45', 'Pernas'], ['Cadeira extensora', 'Pernas'], ['Mesa flexora', 'Pernas'], ['Stiff', 'Pernas'],
  ['Elevação pélvica', 'Glúteos'], ['Abdominal na máquina', 'Abdômen'], ['Prancha', 'Abdômen'], ['Panturrilha em pé', 'Panturrilha']
]
db.on('populate', (tx) => { tx.table('exercicios').bulkAdd(SEED.map(([nome, grupo]) => ({ nome, grupo }))) })

export const num = (s: string | number) => Number(String(s).trim().replace(',', '.'))
export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
export const fmtData = (ms: number) => new Date(ms).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
export const fmtDur = (ms: number) => `${Math.max(1, Math.round(ms / 60000))} min`
export const volume = (s: SerieRealizada[]) => s.filter((x) => x.ok).reduce((t, x) => t + (x.peso ?? 0) * (x.reps ?? 0), 0)

/** Cria a sessão a partir do plano. Se já houver treino em andamento, reaproveita. */
export async function iniciarTreino(treinoId: number): Promise<number> {
  const ativa = await db.sessoes.where('status').equals('andamento').first()
  if (ativa) return ativa.id!
  const t = await db.treinos.get(treinoId)
  if (!t) throw new Error('Treino não encontrado.')
  return db.transaction('rw', [db.sessoes, db.seriesRealizadas, db.treinoExercicios, db.seriesPlanejadas, db.exercicios], async () => {
    const tes = await db.treinoExercicios.where('treinoId').equals(treinoId).sortBy('posicao')
    const rows: SerieRealizada[] = []
    const sessaoId = await db.sessoes.add({ treinoId, nome: t.nome, inicio: Date.now(), status: 'andamento', atual: 0, obs: '' })
    for (const [pos, te] of tes.entries()) {
      const ex = await db.exercicios.get(te.exercicioId)
      const sp = await db.seriesPlanejadas.where('treinoExercicioId').equals(te.id!).sortBy('numero')
      for (const s of sp) rows.push({ sessaoId, exercicioId: te.exercicioId, nome: ex?.nome ?? 'Exercício', pos, numero: s.numero, repsPlan: s.reps, pesoPlan: s.peso, descanso: te.descanso, obs: te.obs, ok: false })
    }
    if (!rows.length) throw new Error('Este treino não tem exercícios com séries. Edite o treino primeiro.')
    await db.seriesRealizadas.bulkAdd(rows)
    return sessaoId
  })
}

export async function exportar() {
  const dados: Record<string, unknown[]> = {}
  for (const t of db.tables) dados[t.name] = await t.toArray()
  return JSON.stringify({ app: 'meu-treino', versao: 1, em: new Date().toISOString(), dados })
}
export async function importar(texto: string) {
  const j = JSON.parse(texto)
  if (j?.app !== 'meu-treino' || !j.dados) throw new Error('Arquivo de backup inválido.')
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      await t.clear()
      const l = j.dados[t.name]
      if (Array.isArray(l) && l.length) await t.bulkAdd(l)
    }
  })
}
