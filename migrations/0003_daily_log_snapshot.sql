-- daily_logsテーブルにカラム追加
ALTER TABLE daily_logs ADD COLUMN tasks_total INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN habits_total INTEGER DEFAULT 0;
ALTER TABLE daily_logs ADD COLUMN achieved INTEGER DEFAULT 0;

-- daily_log_habitsテーブル作成（その日の習慣スナップショット）
CREATE TABLE IF NOT EXISTS daily_log_habits (
  id TEXT PRIMARY KEY,
  daily_log_id TEXT NOT NULL,
  habit_id TEXT,           -- 追跡用（習慣削除後もNULLで残る）
  habit_time_id TEXT,      -- 追跡用
  habit_title TEXT NOT NULL,
  habit_icon TEXT,
  time TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_log_habits_log ON daily_log_habits(daily_log_id);
