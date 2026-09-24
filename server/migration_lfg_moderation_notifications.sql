-- Additive migration for LFG participant moderation and in-app notifications.
-- Existing participant rows represent users who joined before moderation existed,
-- so preserve them as approved members.

ALTER TABLE lfg_post_participants
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE lfg_post_participants
SET status = 'APPROVED'
WHERE status IS NULL;

ALTER TABLE lfg_post_participants
    ALTER COLUMN status SET DEFAULT 'PENDING',
    ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_lfg_post_participants_status
    ON lfg_post_participants(status);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    target_url TEXT,
    entity_type VARCHAR(40),
    entity_id INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS ix_notifications_actor_id ON notifications(actor_id);
CREATE INDEX IF NOT EXISTS ix_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS ix_notifications_recipient_read_created
    ON notifications(recipient_id, is_read, created_at DESC);
