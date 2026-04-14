'use client'

import { Reminder } from '@/lib/types'

interface Props {
  reminders: Reminder[]
  selectedId: string | null
  onSelect: (id: string) => void
  onComplete: (id: string) => void
}

function formatDue(due: string | null): { text: string; style: React.CSSProperties } {
  if (!due) return { text: '—', style: { color: 'var(--muted)' } }
  const today = new Date().toISOString().split('T')[0]
  if (due < today) {
    const diffDays = Math.round(
      (new Date(today).getTime() - new Date(due).getTime()) / 86400000
    )
    return {
      text: `${due.slice(5)} (+${diffDays}d)`,
      style: { color: '#a84040', fontWeight: 500 },
    }
  }
  if (due === today) {
    return { text: 'Heute', style: { color: 'var(--cinnamon)', fontWeight: 500 } }
  }
  return { text: due.slice(5), style: { color: 'var(--muted)' } }
}

function QuadrantBadge({ q }: { q: string | null }) {
  if (!q) return <span style={{ color: 'var(--muted)' }}>—</span>
  const styles: Record<string, React.CSSProperties> = {
    Q1: { background: '#f5e8e8', color: '#8b3a3a' },
    Q2: { background: 'var(--cinnamon-light)', color: 'var(--cinnamon)' },
    Q3: { background: '#e8f0e8', color: '#3a6e3a' },
    Q4: { background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' },
  }
  const s = styles[q] ?? { background: 'var(--bg)', color: 'var(--muted)' }
  return (
    <span style={{
      ...s,
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {q}
    </span>
  )
}

function AiBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    none: { background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' },
    working: { background: 'var(--blue-light)', color: 'var(--blue)' },
    done: { background: '#e8f0e8', color: '#3a6e3a' },
    blocked: { background: '#f5e8e8', color: '#8b3a3a' },
  }
  const s = styles[status] ?? styles.none
  return (
    <span style={{
      ...s,
      padding: '1px 5px',
      borderRadius: 3,
      fontSize: 11,
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      {status}
    </span>
  )
}

export default function ReminderTable({ reminders, selectedId, onSelect, onComplete }: Props) {
  const today = new Date().toISOString().split('T')[0]

  function getRowStyle(r: Reminder, isSelected: boolean): React.CSSProperties {
    if (isSelected) {
      return { background: 'var(--blue-light)', borderLeft: '3px solid var(--blue)', cursor: 'pointer', opacity: r.is_completed ? 0.45 : 1 }
    }
    if (r.is_completed) {
      return { opacity: 0.45, cursor: 'pointer', borderLeft: '3px solid transparent' }
    }
    if (r.due_date && r.due_date < today) {
      return { borderLeft: '3px solid #a84040', cursor: 'pointer' }
    }
    if (r.due_date === today) {
      return { borderLeft: '3px solid var(--cinnamon)', cursor: 'pointer' }
    }
    return { borderLeft: '3px solid transparent', cursor: 'pointer' }
  }

  const thStyle: React.CSSProperties = {
    background: 'var(--bg)',
    borderBottom: '2px solid var(--border)',
    padding: '5px 8px',
    fontWeight: 600,
    fontSize: 11,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  }

  const tdStyle: React.CSSProperties = {
    padding: '5px 8px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'middle',
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minWidth: 0 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: 32 }} />
          <col style={{ minWidth: 220 }} />
          <col style={{ width: 100 }} />
          <col style={{ width: 90 }} />
          <col style={{ width: 50 }} />
          <col style={{ width: 80 }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th style={thStyle}></th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Aufgabe</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Liste</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Fällig</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>Q</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>AI</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>AI-Aufgabe</th>
          </tr>
        </thead>
        <tbody>
          {reminders.map(r => {
            const isSelected = r.apple_id === selectedId
            const due = formatDue(r.due_date)
            const rowStyle = getRowStyle(r, isSelected)
            const aiTaskFirst = r.ai_task ? r.ai_task.split('\n')[0] : ''

            return (
              <tr
                key={r.apple_id}
                style={rowStyle}
                onClick={() => onSelect(r.apple_id)}
                onMouseEnter={e => {
                  if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--blue-light)'
                }}
                onMouseLeave={e => {
                  if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = ''
                }}
              >
                <td style={{ ...tdStyle, textAlign: 'center', paddingLeft: 0 }}>
                  <input
                    type="checkbox"
                    checked={r.is_completed === 1}
                    onChange={e => { e.stopPropagation(); onComplete(r.apple_id) }}
                    onClick={e => e.stopPropagation()}
                    style={{ cursor: 'pointer', accentColor: 'var(--blue)' }}
                  />
                </td>
                <td style={{ ...tdStyle, fontWeight: r.is_completed === 0 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </td>
                <td style={{ ...tdStyle, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.list_name ?? '—'}
                </td>
                <td style={{ ...tdStyle, ...due.style, whiteSpace: 'nowrap' }}>
                  {due.text}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <QuadrantBadge q={r.quadrant} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <AiBadge status={r.ai_status} />
                </td>
                <td style={{ ...tdStyle, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                  {aiTaskFirst}
                </td>
              </tr>
            )
          })}
          {reminders.length === 0 && (
            <tr>
              <td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: 32, fontStyle: 'italic' }}>
                Keine Reminders
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
