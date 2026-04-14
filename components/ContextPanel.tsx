'use client'

import { useState, useEffect } from 'react'
import { Reminder } from '@/lib/types'

interface Props {
  reminder: Reminder | null
  onSave: (id: string, data: Partial<Reminder>) => Promise<void>
  onComplete: (id: string) => void
}

const QUADRANTS = ['Q1', 'Q2', 'Q3', 'Q4']
const AI_STATUSES = ['none', 'working', 'done', 'blocked']

function formatMeta(r: Reminder): string {
  const parts: string[] = []
  if (r.list_name) parts.push(r.list_name)
  if (r.due_date) {
    const today = new Date().toISOString().split('T')[0]
    if (r.due_date < today) {
      const diff = Math.round((new Date(today).getTime() - new Date(r.due_date).getTime()) / 86400000)
      parts.push(`Fällig: ${r.due_date} (+${diff}d überfällig)`)
    } else if (r.due_date === today) {
      parts.push('Heute fällig')
    } else {
      parts.push(`Fällig: ${r.due_date}`)
    }
  }
  return parts.join(' · ')
}

export default function ContextPanel({ reminder, onSave, onComplete }: Props) {
  const [draft, setDraft] = useState<Partial<Reminder>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (reminder) {
      setDraft({
        quadrant: reminder.quadrant,
        estimate_min: reminder.estimate_min,
        context_text: reminder.context_text ?? '',
        ai_task: reminder.ai_task ?? '',
        ai_status: reminder.ai_status,
        ai_output: reminder.ai_output ?? '',
        blocked_reason: reminder.blocked_reason ?? '',
      })
    } else {
      setDraft({})
    }
  }, [reminder?.apple_id])

  if (!reminder) {
    return (
      <div style={{
        width: 380,
        minWidth: 380,
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted)',
        fontStyle: 'italic',
      }}>
        ← Reminder auswählen
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(reminder.apple_id, draft)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '4px 6px',
    fontSize: 13,
    background: 'white',
    color: 'var(--text)',
    outline: 'none',
  }

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    width: '100%',
    resize: 'vertical',
    minHeight: 64,
    fontFamily: 'inherit',
    lineHeight: 1.5,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 3,
    display: 'block',
  }

  const isBlocked = (draft.ai_status ?? reminder.ai_status) === 'blocked'
  const isDone = (draft.ai_status ?? reminder.ai_status) === 'done'

  return (
    <div style={{
      width: 380,
      minWidth: 380,
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 12px',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3, lineHeight: 1.3 }}>
          {reminder.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          {formatMeta(reminder)}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Quadrant + Estimate */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Quadrant</label>
            <select
              value={draft.quadrant ?? ''}
              onChange={e => setDraft(d => ({ ...d, quadrant: e.target.value || null }))}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option value="">—</option>
              {QUADRANTS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Schätzung</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                min={0}
                step={5}
                value={draft.estimate_min ?? ''}
                onChange={e => setDraft(d => ({ ...d, estimate_min: e.target.value ? Number(e.target.value) : null }))}
                style={{ ...inputStyle, width: 64 }}
                placeholder="—"
              />
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>min</span>
            </div>
          </div>
        </div>

        {/* Context */}
        <div>
          <label style={labelStyle}>Kontext</label>
          <textarea
            value={draft.context_text ?? ''}
            onChange={e => setDraft(d => ({ ...d, context_text: e.target.value }))}
            style={textareaStyle}
            placeholder="Hintergrund, Abhängigkeiten…"
          />
        </div>

        {/* AI Task — das wichtigste Feld */}
        <div>
          <label style={{ ...labelStyle, color: 'var(--cinnamon)' }}>Cody-Aufgabe</label>
          <textarea
            value={draft.ai_task ?? ''}
            onChange={e => setDraft(d => ({ ...d, ai_task: e.target.value }))}
            style={{
              ...textareaStyle,
              background: 'var(--cinnamon-light)',
              border: '1px solid var(--cinnamon)',
              minHeight: 80,
            }}
            placeholder="Was soll Cody konkret tun?"
          />
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cody
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        {/* AI Status */}
        <div>
          <label style={labelStyle}>AI-Status</label>
          <select
            value={draft.ai_status ?? reminder.ai_status}
            onChange={e => setDraft(d => ({ ...d, ai_status: e.target.value }))}
            style={{ ...inputStyle, width: '100%' }}
          >
            {AI_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* AI Output */}
        <div>
          <label style={labelStyle}>Ergebnis</label>
          <textarea
            value={draft.ai_output ?? ''}
            onChange={e => !isDone && setDraft(d => ({ ...d, ai_output: e.target.value }))}
            readOnly={isDone}
            style={{
              ...textareaStyle,
              background: 'var(--blue-light)',
              border: '1px solid var(--blue-mid)',
              color: isDone ? 'var(--muted)' : 'var(--text)',
            }}
            placeholder="Cody-Output…"
          />
        </div>

        {/* Blocked reason */}
        {isBlocked && (
          <div>
            <label style={{ ...labelStyle, color: '#8b3a3a' }}>Blockiert durch</label>
            <textarea
              value={draft.blocked_reason ?? ''}
              onChange={e => setDraft(d => ({ ...d, blocked_reason: e.target.value }))}
              style={{
                ...textareaStyle,
                background: '#f5e8e8',
                border: '1px solid #d4a0a0',
              }}
              placeholder="Was blockiert diese Aufgabe?"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '8px 12px',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 13,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Speichert…' : 'Speichern'}
        </button>
        <button
          onClick={() => onComplete(reminder.apple_id)}
          style={{
            background: '#f5e8e8',
            color: '#8b3a3a',
            border: '1px solid #d4a0a0',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          ✓ Erledigt
        </button>
      </div>
    </div>
  )
}
