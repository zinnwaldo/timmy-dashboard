import { getDb } from '@/lib/db'
import { Reminder } from '@/lib/types'
import ReminderApp from '@/components/ReminderApp'

export const dynamic = 'force-dynamic'

export default function Home() {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const reminders = db.prepare(`
    SELECT
      r.apple_id, r.title, r.list_name, r.due_date, r.priority, r.is_completed, r.synced_at,
      COALESCE(c.ai_status, 'none') AS ai_status,
      c.quadrant, c.context_text, c.ai_task, c.estimate_min, c.tags,
      c.ai_output, c.blocked_reason, c.last_processed, c.updated_at
    FROM reminders r
    LEFT JOIN context c ON r.apple_id = c.apple_id
    WHERE r.is_completed = 0
    ORDER BY
      CASE WHEN r.due_date IS NOT NULL AND r.due_date < @today THEN 0 ELSE 1 END ASC,
      CASE WHEN r.due_date IS NOT NULL THEN 0 ELSE 1 END ASC,
      r.due_date ASC
  `).all({ today }) as Reminder[]

  return <ReminderApp initialReminders={reminders} />
}
