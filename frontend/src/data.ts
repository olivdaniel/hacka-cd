export const uiTokens = {
  colors: {
    navy: '#082342',
    rail: '#0d4694',
    primary: '#1457cc',
    pageBackground: '#f7f8f8',
    surface: '#ffffff',
    border: '#d9dde1',
    text: '#20232a',
    textMuted: '#6d748b',
    success: '#4bd9bd',
    warning: '#c77b2d',
  },
  layout: { topbarHeight: 58, railWidth: 58, sidebarWidth: 248 },
  radius: { small: 6, medium: 10, large: 14 },
} as const

export type RecordStatus = 'Em preenchimento' | 'Verificação concluída' | 'Em análise'

export type RecordItem = {
  id: string
  subject: string
  type: string
  status: RecordStatus
  progress: number
  detail: string
  warning?: number
}

export const initialRecords: RecordItem[] = [
  { id: 'NC-2026-0012', subject: 'Vazamento na interface do conjunto de conexão hidráulica', type: 'Afundamento / Mossa / Amassamento', status: 'Em preenchimento', progress: 20, detail: 'Afundamento / Mossa / Amassamento / Ondulação / Vinco (Foco: Composto) · Etapa 1' },
  { id: 'NC-2026-0011', subject: 'Trinca na base estrutural do misturador', type: 'Trinca', status: 'Verificação concluída', progress: 85, detail: 'Trinca · Etapa 4' },
  { id: 'NC-2026-0010', subject: 'Desalinhamento do conjunto de posicionamento', type: 'Desalinhamento / Deslocamento', status: 'Em análise', progress: 70, detail: 'Desalinhamento / Deslocamento / Posicionamento incorreto · Etapa 3', warning: 2 },
  { id: 'NC-2026-0009', subject: 'Componente solto na carenagem', type: 'Componente solto', status: 'Em análise', progress: 55, detail: 'Componente solto · Etapa 2' },
  { id: 'NC-2026-0008', subject: 'Risco superficial no acabamento', type: 'Risco', status: 'Em preenchimento', progress: 35, detail: 'Risco · Etapa 2' },
]

export const sidebarRecords = initialRecords.slice(0, 5)
