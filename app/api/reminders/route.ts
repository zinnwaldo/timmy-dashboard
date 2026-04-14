import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') ?? 'active'
    const quadrant = searchParams.get('quadrant')

    const db = getDb()
    const today = new Date().toISOString().split('T')[0]

    let whereClause = ''
    const params: Record<string, string> = { today }

    switch (filter) {
      case 'active':
        whereClause = 'WHERE r.is_completed = 0'
        break
      case 'today':
        whereClause = 'WHERE r.is_completed = 0 AND r.due_date = @today'
        break
      case 'overdue':
        whereClause = 'WHERE r.is_completed = 0 AND r.due_date < @today'
        break
      case 'done':
        whereClause = 'WHERE r.is_completed = 1'
        break
      case 'all':
      default:
        whereClause = ''
        break
    }

    if (quadrant) {
      const conjunction = whereClause ? 'AND' : 'WHERE'
      whereClause += ` ${conjunction} c.quadrant = @quadrant`
      params.quadrant = quadrant
    }

    const sql = `
      SELECT
        r.apple_id, r.title, r.list_name, r.due_date, r.priority, r.is_completed, r.synced_at,
        COALESCE(c.ai_status, 'none') AS ai_status,
        c.quadrant, c.context_text, c.ai_task, c.estimate_min, c.tags,
        c.ai_output, c.blocked_reason, c.last_processed, c.updated_at
      FROM reminders r
      LEFT JOIN context c ON r.apple_id = c.apple_id
      ${whereClause}
      ORDER BY
        CASE WHEN r.due_date IS NOT NULL AND r.due_date < @today THEN 0 ELSE 1 END ASC,
        CASE WHEN r.due_date IS NOT NULL THEN 0 ELSE 1 END ASC,
        r.due_date ASC
    `

    const rows = db.prepare(sql).all(params)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('Reminders GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
