-- Run this migration on existing databases. New databases get these columns from models.py.
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS invite_source VARCHAR(20);
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS invite_round INTEGER;
CREATE INDEX IF NOT EXISTS ix_match_participants_invite_source ON match_participants (invite_source);
CREATE INDEX IF NOT EXISTS ix_match_participants_invited_at ON match_participants (invited_at);
