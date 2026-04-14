import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    const row = db.prepare(`
      SELECT
        r.apple_id, r.title, r.list_name, r.due_date, r.priority, r.is_completed, r.synced_at,
        COALESCE(c.ai_status, 'none') AS ai_status,
        c.quadrant, c.context_text, c.ai_task, c.estimate_min, c.tags,
        c.ai_output, c.blocked_reason, c.last_processed, c.updated_at
      FROM reminders r
      LEFT JOIN context c ON r.apple_id = c.apple_id
      WHERE r.apple_id = ?
    `).get(id)

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(row)
  } catch (err) {
    console.error('Reminder GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    // Ensure the reminder exists
    const reminder = db.prepare('SELECT apple_id FROM reminders WHERE apple_id = ?').get(id)
    if (!reminder) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const now = new Date().toISOString()

    // Fetch existing context row (may be null if no context yet)
    const existing = db.prepare('SELECT * FROM context WHERE apple_id = ?').get(id) as Record<string, unknown> | undefined

    // Mergeable fields — only fields present in body override; absent fields keep DB value
    const contextFields = ['quadrant', 'context_text', 'ai_task', 'estimate_min', 'tags', 'ai_status', 'ai_output', 'blocked_reason'] as const

    const merged: Record<string, unknown> = {}
    for (const field of contextFields) {
      if (field in body) {
        // Explicit value from client — may be null (null-reset allowed)
        merged[field] = body[field] ?? null
      } else {
        // Not in body — preserve existing DB value (or null for new rows)
        merged[field] = existing ? (existing[field] ?? null) : null
      }
    }

    db.prepare(`
      INSERT INTO context (apple_id, quadrant, context_text, ai_task, estimate_min, tags, ai_status, ai_output, blocked_reason, last_processed, updated_at)
      VALUES (@apple_id, @quadrant, @context_text, @ai_task, @estimate_min, @tags, @ai_status, @ai_output, @blocked_reason, @last_processed, @updated_at)
      ON CONFLICT(apple_id) DO UPDATE SET
        quadrant       = @quadrant,
        context_text   = @context_text,
        ai_task        = @ai_task,
        estimate_min   = @estimate_min,
        tags           = @tags,
        ai_status      = @ai_status,
        ai_output      = @ai_output,
        blocked_reason = @blocked_reason,
        last_processed = @last_processed,
        updated_at     = @updated_at
    `).run({
      apple_id: id,
      ...merged,
      last_processed: now,
      updated_at: now,
    })

    const updated = db.prepare(`
      SELECT
        r.apple_id, r.title, r.list_name, r.due_date, r.priority, r.is_completed, r.synced_at,
        COALESCE(c.ai_status, 'none') AS ai_status,
        c.quadrant, c.context_text, c.ai_task, c.estimate_min, c.tags,
        c.ai_output, c.blocked_reason, c.last_processed, c.updated_at
      FROM reminders r
      LEFT JOIN context c ON r.apple_id = c.apple_id
      WHERE r.apple_id = ?
    `).get(id)

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Reminder PATCH error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
