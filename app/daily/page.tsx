import Link from 'next/link'
import { getDb } from '@/lib/db'
import { Reminder } from '@/lib/types'

function getCapacityColor(min: number): string {
  if (min <= 240) return '#22a855'
  if (min <= 360) return '#f59e0b'
  return '#ef4444'
}

function QuadrantSection({
  label,
  reminders,
}: {
  label: string
  reminders: Reminder[]
}) {
  if (reminders.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
        paddingBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}>
        {label} ({reminders.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {reminders.map(r => (
          <div
            key={r.apple_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              background: 'white',
              borderRadius: 4,
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
              {r.title}
            </span>
            {r.quadrant && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'var(--blue-light)',
                color: 'var(--blue)',
              }}>
                {r.quadrant}
              </span>
            )}
            {r.ai_status && r.ai_status !== 'none' && (
              <span style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 3,
                background: 'var(--cinnamon-light)',
                color: 'var(--cinnamon)',
              }}>
                {r.ai_status}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 40, textAlign: 'right' }}>
              {r.estimate_min != null ? `${r.estimate_min}min` : '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DailyPage() {
  const db = getDb()

  const rows = db.prepare(`
    SELECT r.*, c.quadrant, c.ai_task, c.ai_status, c.estimate_min
    FROM reminders r
    LEFT JOIN context c ON c.apple_id = r.apple_id
    WHERE r.is_completed = 0
      AND (
        r.due_date <= date('now')
        OR c.quadrant IN ('Q1', 'Q2', 'Q3', 'Q4')
      )
    ORDER BY
      CASE c.quadrant WHEN 'Q1' THEN 1 WHEN 'Q2' THEN 2 WHEN 'Q3' THEN 3 WHEN 'Q4' THEN 4 ELSE 5 END,
      r.due_date ASC NULLS LAST
  `).all() as Reminder[]

  const totalMin = rows.reduce((sum, r) => sum + (r.estimate_min ?? 0), 0)
  const capacityColor = getCapacityColor(totalMin)
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const q1 = rows.filter(r => r.quadrant === 'Q1')
  const q2 = rows.filter(r => r.quadrant === 'Q2')
  const q3 = rows.filter(r => r.quadrant === 'Q3')
  const q4 = rows.filter(r => r.quadrant === 'Q4')
  const noQ = rows.filter(r => !r.quadrant)

  const barMax = Math.max(totalMin, 240)
  const barPct = Math.min((totalMin / barMax) * 100, 100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Topbar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        height: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          timmy-context
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <Link href="/" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          Reminders
        </Link>
        <Link href="/daily" style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none' }}>
          Daily
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link
            href="/"
            style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}
          >
            ← Alle Reminders
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
            Daily View
          </h1>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            {today} · Kapazität: {totalMin}min / 240min
          </div>

          {/* Capacity bar */}
          <div style={{
            height: 8,
            background: 'var(--border)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${barPct}%`,
              height: '100%',
              background: capacityColor,
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 11, color: capacityColor, fontWeight: 600, marginTop: 4 }}>
            {totalMin <= 240 ? 'Im grünen Bereich' : totalMin <= 360 ? 'Etwas viel — priorisieren?' : 'Überlastet — kürzen!'}
          </div>
        </div>

        {/* Quadrant sections */}
        <QuadrantSection label="Q1 — Sofort" reminders={q1} />
        <QuadrantSection label="Q2 — Einplanen" reminders={q2} />
        <QuadrantSection label="Q3 — Delegieren" reminders={q3} />
        <QuadrantSection label="Q4 — Eliminieren" reminders={q4} />
        <QuadrantSection label="Ohne Quadrant" reminders={noQ} />

        {rows.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--muted)',
            padding: '48px 0',
            fontSize: 14,
          }}>
            Keine offenen Aufgaben für heute.
          </div>
        )}
      </div>
    </div>
  )
}
