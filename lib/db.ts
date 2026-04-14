import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'timmy.db')

let db: Database.Database | undefined

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
  }
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      apple_id     TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      list_name    TEXT,
      due_date     TEXT,
      priority     TEXT DEFAULT 'none',
      is_completed INTEGER DEFAULT 0,
      synced_at    TEXT
    );

    CREATE TABLE IF NOT EXISTS context (
      apple_id       TEXT PRIMARY KEY REFERENCES reminders(apple_id),
      quadrant       TEXT,
      context_text   TEXT,
      ai_task        TEXT,
      estimate_min   INTEGER,
      tags           TEXT,
      ai_status      TEXT DEFAULT 'none',
      ai_output      TEXT,
      blocked_reason TEXT,
      last_processed TEXT,
      updated_at     TEXT
    );
  `)
}
