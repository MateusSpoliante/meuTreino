import { useState } from 'react'
import { exportar, importar } from '../data/db'

export default function Ajustes() {
  const [tema, setTema] = useState(localStorage.getItem('tema') ?? 'dark')
  const trocar = () => { const t = tema === 'dark' ? 'light' : 'dark'; setTema(t); localStorage.setItem('tema', t); document.documentElement.dataset.theme = t }
  async function baixar() {
    const url = URL.createObjectURL(new Blob([await exportar()], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = `meu-treino-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url)
  }
  async function restaurar(f?: File) {
    if (!f || !confirm('Importar vai SUBSTITUIR todos os dados atuais. Continuar?')) return
    try { await importar(await f.text()); alert('Backup importado com sucesso.') } catch (e) { alert('Erro: ' + (e as Error).message) }
  }
  return (
    <>
      <h1>Ajustes</h1>
      <div className="card"><b>Aparência</b><br /><button style={{ marginTop: 8 }} onClick={trocar}>Tema: {tema === 'dark' ? 'Escuro' : 'Claro'} (alternar)</button></div>
      <div className="card"><b>Backup</b>
        <p className="mut">Seus dados ficam só neste aparelho. Se limpar os dados do navegador, eles somem. Faça backup com frequência.</p>
        <button className="pri big" onClick={baixar}>Exportar backup</button>
        <label className="mut" style={{ display: 'block', marginTop: 12 }}>Importar backup (.json)
          <input type="file" accept="application/json" onChange={(e) => { restaurar(e.target.files?.[0]); e.target.value = '' }} /></label></div>
    </>
  )
}
