import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
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

    execSync(`${COMPLETE_SCRIPT} "${id}"`)

    db.prepare('UPDATE reminders SET is_completed = 1 WHERE apple_id = ?').run(id)

    return NextResponse.json({ success: true, message: 'Reminder marked as completed' })
  } catch (err) {
    console.error('Complete error:', err)
    return NextResponse.json({ success: false, message: String(err) }, { status: 500 })
  }
}
