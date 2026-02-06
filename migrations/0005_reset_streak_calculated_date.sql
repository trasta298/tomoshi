-- Subtract 1 from streak_count because old code included today's achievement (todayAchieved=true).
-- New code stores "base streak" (through yesterday only), display adds +1 if today achieved.
-- Do NOT reset streak_calculated_date: the adjusted base is already correct for today,
-- and the next day's natural calculation will use it properly.
-- Note: Users at exactly 7/14/21-day streaks may receive one duplicate shield award.
-- Acceptable for migration simplicity (MAX_SHIELDS=3 caps the impact).
UPDATE users SET
  streak_count = MAX(0, streak_count - 1);
