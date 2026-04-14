export interface Reminder {
  apple_id: string
  title: string
  list_name: string | null
  due_date: string | null
  priority: string
  is_completed: number
  synced_at: string | null
  // context (nullable wenn noch kein Kontext)
  quadrant: string | null
  context_text: string | null
  ai_task: string | null
  estimate_min: number | null
  tags: string | null
  ai_status: string
  ai_output: string | null
  blocked_reason: string | null
  last_processed: string | null
  updated_at: string | null
}
