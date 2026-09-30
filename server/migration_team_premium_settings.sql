-- Premium club capacity, fee reminders and weekday activity schedule.
ALTER TABLE teams ALTER COLUMN total_slots SET DEFAULT 15;
UPDATE teams AS team
SET total_slots = 15
WHERE team.total_slots > 15
  AND team.owner_id IN (
      SELECT id FROM users
      WHERE premium_until IS NULL OR premium_until <= CURRENT_TIMESTAMP
  )
  AND (
      SELECT COUNT(*) FROM team_memberships membership
      WHERE membership.team_id = team.id AND membership.status = 'APPROVED'
  ) <= 15;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS fee_reminder_day INTEGER;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS fee_reminder_frequency VARCHAR(16);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS fee_reminder_last_sent_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS activity_schedule JSON NOT NULL DEFAULT '[]'::json;
CREATE INDEX IF NOT EXISTS ix_teams_fee_reminder_day ON teams (fee_reminder_day);
