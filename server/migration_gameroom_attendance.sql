-- Additive migration for recording post-match attendance confirmations.
-- Safe to re-run; existing match participants remain unconfirmed (NULL).

ALTER TABLE match_participants
    ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(16);

CREATE INDEX IF NOT EXISTS ix_match_participants_user_attendance
    ON match_participants (user_id, attendance_status);
