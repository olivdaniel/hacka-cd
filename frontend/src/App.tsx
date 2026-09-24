import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Code2,
  Grid2X2,
  Home,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { db, seedRecords } from './db'
import { type RecordItem, type RecordStatus } from './data'

const navItems = [
  { label: 'Página inicial', icon: Home },
  { label: 'Rastreamento', icon: Search },
  { label: 'Histórico', icon: Grid2X2 },
]

const statusClass: Record<RecordStatus, string> = {
  'Em preenchimento': 'status-blue',
  'Verificação concluída': 'status-green',
  'Em análise': 'status-orange',
}

function ProgressRing({ value }: { value: number }) {
  return (
    <div className="progress-ring" style={{ '--progress': `${value * 3.6}deg` } as React.CSSProperties}>
      <span>{value}%</span>
    </div>
  )
}

function App() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [activeNav, setActiveNav] = useState('Página inicial')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    seedRecords().then(setRecords)
  }, [])

  const filteredRecords = useMemo(
    () => records.filter((record) => `${record.id} ${record.subject} ${record.type}`.toLowerCase().includes(query.toLowerCase())),
    [query, records],
  )

  async function createRecord() {
    const newRecord: RecordItem = {
      id: `NC-2026-${String(records.length + 13).padStart(4, '0')}`,
      subject: 'Novo registro aguardando preenchimento',
      type: 'A classificar',
      status: 'Em preenchimento',
      progress: 0,
      detail: 'Registro novo · Etapa 1',
    }
    await db.records.add(newRecord)
    setRecords((current) => [newRecord, ...current])
    setNotice(`${newRecord.id} criado como rascunho`)
    window.setTimeout(() => setNotice(''), 2800)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">Página inicial</div>
        <div className="topbar-actions">
          <span className="saved"><span className="saved-dot" /> Alterações salvas</span>
          <button className="icon-button top-icon" aria-label="Notificações"><Bell size={17} /><b>3</b></button>
          <button className="icon-button top-icon" aria-label="Ajuda"><CircleHelp size={17} /></button>
          <div className="profile"><div><strong>Ananda Soares</strong><small>Perfil demonstrativo</small></div><span>AS</span></div>
        </div>
      </header>

      <aside className="rail" aria-label="Navegação global">
        <div className="rail-logo"><ClipboardList size={23} /></div>
        <button className="rail-button active" aria-label="Portal"><BookOpen size={19} /></button>
        <button className="rail-button" aria-label="Conversas"><Search size={19} /></button>
        <button className="rail-button" aria-label="Código"><Code2 size={19} /></button>
        <button className="rail-button" aria-label="Ferramentas"><Wrench size={19} /></button>
        <div className="rail-user">AS</div>
      </aside>

      <aside className="sidebar">
        <div className="sidebar-shortcuts"><span>CTRL</span><span>+</span><span>C</span><span>+</span><span>D</span><button aria-label="Recolher menu"><ChevronLeft size={16} /></button></div>
        <button className="new-record" onClick={createRecord}><Plus size={17} /> Novo registro</button>
        <nav className="section-nav" aria-label="Navegação do portal">
          {navItems.map(({ label, icon: Icon }) => <button key={label} className={activeNav === label ? 'selected' : ''} onClick={() => setActiveNav(label)}><Icon size={16} /> {label}</button>)}
        </nav>
        <div className="sidebar-section">
          <h3>Em andamento</h3>
          <div className="mini-progress"><strong>NC-2026-0012</strong><span>20%</span><i><em style={{ width: '20%' }} /></i></div>
          <div className="mini-progress orange"><strong>NC-2026-0010</strong><span>70%</span><i><em style={{ width: '70%' }} /></i></div>
        </div>
        <label className="search-field"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar registros..." /></label>
        <div className="sidebar-section records-list"><h3>Meus registros</h3>{filteredRecords.map((record) => <button key={record.id} onClick={() => setQuery(record.id)}><strong>{record.id}</strong><small>{record.type} / {record.detail.split(' · ')[0]}</small></button>)}<a href="#recentes">Ver todos <ChevronRight size={12} /></a></div>
        <div className="sidebar-section reference-links"><h3>Instruções e referências</h3><a href="#referencias"><BookOpen size={14} /> Exemplos de anexos</a><a href="#referencias"><ClipboardList size={14} /> Requisitos por tipo</a><a href="#referencias"><Wrench size={14} /> Procedimentos aplicáveis</a></div>
      </aside>

      <main className="main-content">
        <section className="welcome"><p className="eyebrow">Portal de registros</p><h1>Olá, Ananda. <span>O que você deseja fazer?</span></h1><p>Gerencie registros de não conformidades para geração de anexos de Nota CD e AR.</p></section>
        <section className="action-grid" aria-label="Ações principais">
          <ActionCard icon={<Plus />} title="Novo registro" description="Inicie um novo anexo padronizado para Nota CD ou AR com formulário em cinco etapas." button="Iniciar registro" recommended onClick={createRecord} />
          <ActionCard icon={<Search />} title="Rastrear registro" description="Acompanhe o progresso de um registro específico e consulte o histórico de atividades." button="Acessar rastreamento" />
          <ActionCard icon={<Grid2X2 />} title="Ver histórico" description="Consulte todos os registros, aplique filtros e acesse versões anteriores de anexos." button="Acessar histórico" />
        </section>

        <section className="content-section"><div className="section-heading"><h2>Em andamento</h2><a href="#recentes">Ver todos <ChevronRight size={13} /></a></div><div className="ongoing-grid">{records.slice(0, 4).map((record) => <article className="ongoing-card" key={record.id}><ProgressRing value={record.progress} /><div><strong>{record.id} {record.warning && <mark><SlidersHorizontal size={11} /> {record.warning}</mark>}</strong><p>{record.detail}</p></div></article>)}</div></section>

        <section className="content-section" id="recentes"><div className="section-heading"><h2>Registros recentes</h2><a href="#top">Ver todos <ChevronRight size={13} /></a></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>Assunto</th><th>Tipo de NC</th><th>Status</th><th>Progresso</th></tr></thead><tbody>{filteredRecords.map((record) => <tr key={record.id}><td><strong className="record-id">{record.id}</strong></td><td>{record.subject}</td><td className="muted-cell">{record.type}</td><td><span className={`status ${statusClass[record.status]}`}>{record.status}</span></td><td><div className="table-progress"><i><em style={{ width: `${record.progress}%` }} /></i><strong>{record.progress}%</strong></div></td></tr>)}</tbody></table></div></section>
        {notice && <div className="toast" role="status"><Sparkles size={15} /> {notice}</div>}
      </main>
    </div>
  )
}

function ActionCard({ icon, title, description, button, recommended, onClick }: { icon: React.ReactNode; title: string; description: string; button: string; recommended?: boolean; onClick?: () => void }) {
  return <article className={`action-card ${recommended ? 'featured' : ''}`}><div className="action-icon">{icon}</div>{recommended && <span className="recommended">RECOMENDADO</span>}<h2>{title}</h2><p>{description}</p><button onClick={onClick}>{button} <span>→</span></button></article>
}

export default App
