'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Reminder } from '@/lib/types'
import ReminderTable from './ReminderTable'
import ContextPanel from './ContextPanel'

type Filter = 'all' | 'active' | 'today' | 'overdue' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'active', label: 'Aktiv' },
  { key: 'today', label: 'Heute' },
  { key: 'overdue', label: 'Überfällig' },
  { key: 'Q1', label: 'Q1' },
  { key: 'Q2', label: 'Q2' },
  { key: 'Q3', label: 'Q3' },
  { key: 'Q4', label: 'Q4' },
]

function countFor(reminders: Reminder[], filter: Filter): number {
  const today = new Date().toISOString().split('T')[0]
  switch (filter) {
    case 'all': return reminders.length
    case 'active': return reminders.filter(r => r.is_completed === 0).length
    case 'today': return reminders.filter(r => r.is_completed === 0 && r.due_date === today).length
    case 'overdue': return reminders.filter(r => r.is_completed === 0 && r.due_date != null && r.due_date < today).length
    case 'Q1': return reminders.filter(r => r.quadrant === 'Q1').length
    case 'Q2': return reminders.filter(r => r.quadrant === 'Q2').length
    case 'Q3': return reminders.filter(r => r.quadrant === 'Q3').length
    case 'Q4': return reminders.filter(r => r.quadrant === 'Q4').length
  }
}

export default function ReminderApp({ initialReminders }: { initialReminders: Reminder[] }) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('active')
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')

  const fetchReminders = useCallback(async (f: Filter) => {
    const isQuadrant = ['Q1', 'Q2', 'Q3', 'Q4'].includes(f)
    const url = isQuadrant
      ? `/api/reminders?filter=active&quadrant=${f}`
      : `/api/reminders?filter=${f}`
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setReminders(data)
    }
  }, [])

  useEffect(() => {
    fetchReminders(filter)
  }, [filter, fetchReminders])

  const handleSync = async () => {
    setSyncing(true)
    setSyncStatus('')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncStatus(`Synced ${data.synced}`)
        await fetchReminders(filter)
      } else {
        setSyncStatus(`Fehler: ${data.error ?? 'unbekannt'}`)
      }
    } catch {
      setSyncStatus('Sync fehlgeschlagen')
    } finally {
      setSyncing(false)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }

  const handleComplete = async (id: string) => {
    // Optimistic: remove from list
    setReminders(prev => prev.filter(r => r.apple_id !== id))
    if (selectedId === id) setSelectedId(null)
    try {
      await fetch(`/api/complete/${id}`, { method: 'POST' })
    } catch {
      // On error re-fetch
      await fetchReminders(filter)
    }
  }

  const handleSave = async (id: string, data: Partial<Reminder>) => {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated: Reminder = await res.json()
      // Optimistic update in list
      setReminders(prev => prev.map(r => r.apple_id === id ? updated : r))
    }
  }

  const selectedReminder = reminders.find(r => r.apple_id === selectedId) ?? null

  // Statusbar stats
  const today = new Date().toISOString().split('T')[0]
  const active = reminders.filter(r => r.is_completed === 0)
  const overdue = active.filter(r => r.due_date != null && r.due_date < today)
  const todayCount = active.filter(r => r.due_date === today)
  const totalMin = active.reduce((sum, r) => sum + (r.estimate_min ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
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
        <Link href="/" style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)', textDecoration: 'none' }}>
          Reminders
        </Link>
        <Link href="/daily" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
          Daily
        </Link>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            background: syncing ? 'var(--bg)' : 'white',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '3px 10px',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: 12,
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {syncing ? '↻ Syncing…' : '↻ Sync'}
        </button>
        {syncStatus && (
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{syncStatus}</span>
        )}
      </div>

      {/* Filterbar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        height: 34,
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        flexShrink: 0,
      }}>
        {FILTERS.map(f => {
          const count = countFor(reminders, f.key)
          const isActive = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                padding: '0 12px',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--blue)' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
              <span style={{
                background: isActive ? 'var(--blue-light)' : 'var(--bg)',
                color: isActive ? 'var(--blue)' : 'var(--muted)',
                borderRadius: 10,
                padding: '0 5px',
                fontSize: 10,
                fontWeight: 600,
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <ReminderTable
          reminders={reminders}
          selectedId={selectedId}
          onSelect={handleSelect}
          onComplete={handleComplete}
        />
        <ContextPanel
          reminder={selectedReminder}
          onSave={handleSave}
          onComplete={handleComplete}
        />
      </div>

      {/* Statusbar */}
      <div style={{
        background: 'var(--blue)',
        color: 'white',
        height: 22,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: 11,
        gap: 8,
        flexShrink: 0,
      }}>
        <span>{reminders.length} Reminders</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>{overdue.length} überfällig</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>Heute: {todayCount.length}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>Kapazität: {totalMin}min / 240min</span>
      </div>
    </div>
  )
}
