-- Add shield_consumed_at to users table
-- This tracks when a shield was last consumed to protect the streak

ALTER TABLE users ADD COLUMN shield_consumed_at INTEGER;
