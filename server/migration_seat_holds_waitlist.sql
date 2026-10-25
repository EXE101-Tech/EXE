-- Apply before starting the updated API. Existing memberships have no deadline.
BEGIN;
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP;
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS hold_policy_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE match_participants ADD COLUMN IF NOT EXISTS expected_arrival_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS ix_match_participants_response_deadline ON match_participants(response_deadline);
COMMIT;
