import { NextRequest, NextResponse } from 'next/server'
import { spawnSync } from 'child_process'
import { getDb } from '@/lib/db'

const COMPLETE_SCRIPT = '/Users/karsten/bin/reminder-complete.sh'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const db = getDb()

    const reminder = db.prepare('SELECT apple_id FROM reminders WHERE apple_id = ?').get(id)
    if (!reminder) {
      return NextResponse.json({ success: false, message: 'Reminder not found' }, { status: 404 })
    }

    const result = spawnSync(COMPLETE_SCRIPT, [id], {
      encoding: 'utf-8',
      timeout: 10000,
    })
    if (result.status !== 0) {
      return NextResponse.json(
        { success: false, message: result.stderr || 'Script failed' },
        { status: 500 }
      )
    }

    db.prepare('UPDATE reminders SET is_completed = 1 WHERE apple_id = ?').run(id)

    return NextResponse.json({ success: true, message: 'Reminder marked as completed' })
  } catch (err) {
    console.error('Complete error:', err)
    return NextResponse.json({ success: false, message: String(err) }, { status: 500 })
  }
}
