-- Additive schema required by persistent profile covers and chat friendships.
-- Apply once to the PostgreSQL database selected by DATABASE_URL.
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS cover_url TEXT;

CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_low_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_high_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_friendship_pair UNIQUE (user_low_id, user_high_id),
    CONSTRAINT ck_friendship_ordered_users CHECK (user_low_id < user_high_id),
    CONSTRAINT ck_friendship_requester_member CHECK (requester_id IN (user_low_id, user_high_id)),
    CONSTRAINT ck_friendship_status CHECK (status IN ('pending', 'accepted'))
);

CREATE INDEX IF NOT EXISTS ix_friendships_user_low_id ON friendships(user_low_id);
CREATE INDEX IF NOT EXISTS ix_friendships_user_high_id ON friendships(user_high_id);
CREATE INDEX IF NOT EXISTS ix_friendships_requester_id ON friendships(requester_id);
