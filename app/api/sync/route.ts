import { NextResponse } from 'next/server'
import fs from 'fs'
import { getDb } from '@/lib/db'

const CACHE_PATH = '/var/cache/reminder-sync/reminders.json'

interface CacheReminder {
  id: string
  title: string
  listName?: string
  priority?: string
  isCompleted?: boolean
  dueDate?: string
}

export async function POST() {
  try {
    if (!fs.existsSync(CACHE_PATH)) {
      return NextResponse.json({ error: `Cache file not found: ${CACHE_PATH}` }, { status: 404 })
    }

    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const reminders: CacheReminder[] = JSON.parse(raw)

    const db = getDb()
    const now = new Date().toISOString()

    const upsert = db.prepare(`
      INSERT INTO reminders (apple_id, title, list_name, due_date, priority, is_completed, synced_at)
      VALUES (@apple_id, @title, @list_name, @due_date, @priority, @is_completed, @synced_at)
      ON CONFLICT(apple_id) DO UPDATE SET
        title        = excluded.title,
        list_name    = excluded.list_name,
        due_date     = excluded.due_date,
        priority     = excluded.priority,
        is_completed = excluded.is_completed,
        synced_at    = excluded.synced_at
    `)

    const incomingIds = new Set(reminders.map(r => r.id))

    // Mark reminders no longer in cache as completed
    const existing = db.prepare('SELECT apple_id FROM reminders WHERE is_completed = 0').all() as { apple_id: string }[]
    const markCompleted = db.prepare('UPDATE reminders SET is_completed = 1, synced_at = ? WHERE apple_id = ?')

    const syncMany = db.transaction((items: CacheReminder[]) => {
      for (const r of items) {
        const dueDate = r.dueDate ? r.dueDate.split('T')[0] : null
        upsert.run({
          apple_id: r.id,
          title: r.title,
          list_name: r.listName ?? null,
          due_date: dueDate,
          priority: r.priority ?? 'none',
          is_completed: r.isCompleted ? 1 : 0,
          synced_at: now,
        })
      }
      for (const row of existing) {
        if (!incomingIds.has(row.apple_id)) {
          markCompleted.run(now, row.apple_id)
        }
      }
    })

    syncMany(reminders)

    return NextResponse.json({ synced: reminders.length, total: reminders.length })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
