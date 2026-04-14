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
    const {
      quadrant,
      context_text,
      ai_task,
      estimate_min,
      tags,
      ai_status,
      ai_output,
      blocked_reason,
    } = body

    const now = new Date().toISOString()

    // Determine if last_processed should be updated
    const updateLastProcessed = ai_status !== undefined || ai_output !== undefined

    db.prepare(`
      INSERT INTO context (apple_id, quadrant, context_text, ai_task, estimate_min, tags, ai_status, ai_output, blocked_reason, last_processed, updated_at)
      VALUES (@apple_id, @quadrant, @context_text, @ai_task, @estimate_min, @tags, @ai_status, @ai_output, @blocked_reason, @last_processed, @updated_at)
      ON CONFLICT(apple_id) DO UPDATE SET
        quadrant       = COALESCE(@quadrant, quadrant),
        context_text   = COALESCE(@context_text, context_text),
        ai_task        = COALESCE(@ai_task, ai_task),
        estimate_min   = COALESCE(@estimate_min, estimate_min),
        tags           = COALESCE(@tags, tags),
        ai_status      = COALESCE(@ai_status, ai_status),
        ai_output      = COALESCE(@ai_output, ai_output),
        blocked_reason = COALESCE(@blocked_reason, blocked_reason),
        last_processed = CASE WHEN @last_processed IS NOT NULL THEN @last_processed ELSE last_processed END,
        updated_at     = @updated_at
    `).run({
      apple_id: id,
      quadrant: quadrant ?? null,
      context_text: context_text ?? null,
      ai_task: ai_task ?? null,
      estimate_min: estimate_min ?? null,
      tags: tags ?? null,
      ai_status: ai_status ?? null,
      ai_output: ai_output ?? null,
      blocked_reason: blocked_reason ?? null,
      last_processed: updateLastProcessed ? now : null,
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
