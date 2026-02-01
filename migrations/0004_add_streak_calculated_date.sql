-- Add streak_calculated_date column to track the last date streak was calculated
-- This enables calculating streak once per day on app startup
ALTER TABLE users ADD COLUMN streak_calculated_date TEXT DEFAULT NULL;
