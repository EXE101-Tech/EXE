-- Additive, data-preserving migration for existing SportGo PostgreSQL databases.
-- Take a database backup first. It does not delete or rewrite user-generated rows.
-- Safe to re-run. Existing legacy teams retain their integer sports.id foreign key.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS owner_status VARCHAR(20) NOT NULL DEFAULT 'none';

ALTER TABLE venues
    ADD COLUMN IF NOT EXISTS sport_key VARCHAR(40),
    ADD COLUMN IF NOT EXISTS price_label VARCHAR(100),
    ADD COLUMN IF NOT EXISTS court_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS facilities JSON NOT NULL DEFAULT '{}'::json,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE courts
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS price_info VARCHAR(120);

ALTER TABLE match_participants
    ADD COLUMN IF NOT EXISTS note TEXT;

CREATE TABLE IF NOT EXISTS venue_reservation_blocks (
    id SERIAL PRIMARY KEY,
    venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    court_id INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_venue_reservation_block_time CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS ix_venue_reservation_blocks_venue_id ON venue_reservation_blocks(venue_id);
CREATE INDEX IF NOT EXISTS ix_venue_reservation_blocks_court_id ON venue_reservation_blocks(court_id);
CREATE INDEX IF NOT EXISTS ix_venue_reservation_blocks_created_by ON venue_reservation_blocks(created_by);

-- The deployed teams table predates the owner-managed team feature and uses
-- sport_id INTEGER -> sports.id. Keep that key and add new fields alongside it.
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    sport_id INTEGER REFERENCES sports(id),
    rating FLOAT,
    avatar_badge VARCHAR,
    bg_gradient VARCHAR,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sport_key VARCHAR(40),
    ADD COLUMN IF NOT EXISTS sport_name VARCHAR(80),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS total_slots INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS tags JSON NOT NULL DEFAULT '[]'::json,
    ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0;

UPDATE teams AS t
SET sport_name = COALESCE(t.sport_name, s.name),
    sport_key = COALESCE(t.sport_key,
        CASE lower(s.name)
            WHEN 'badminton' THEN 'badminton'
            WHEN 'cầu lông' THEN 'badminton'
            WHEN 'football' THEN 'football'
            WHEN 'bóng đá' THEN 'football'
            WHEN 'pickleball' THEN 'pickleball'
            WHEN 'tennis' THEN 'tennis'
            WHEN 'basketball' THEN 'basketball'
            WHEN 'bóng rổ' THEN 'basketball'
            WHEN 'volleyball' THEN 'volleyball'
            WHEN 'bóng chuyền' THEN 'volleyball'
            ELSE NULL
        END)
FROM sports AS s
WHERE t.sport_id = s.id
  AND (t.sport_name IS NULL OR t.sport_key IS NULL);

CREATE INDEX IF NOT EXISTS ix_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS ix_teams_sport_key ON teams(sport_key);

CREATE TABLE IF NOT EXISTS team_memberships (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_membership UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS ix_team_memberships_user_id ON team_memberships(user_id);

CREATE TABLE IF NOT EXISTS team_reviews (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    tags JSON NOT NULL DEFAULT '[]'::json,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_team_review UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_team_reviews_team_id ON team_reviews(team_id);
CREATE INDEX IF NOT EXISTS ix_team_reviews_user_id ON team_reviews(user_id);

CREATE TABLE IF NOT EXISTS lfg_posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sport_id VARCHAR(40) NOT NULL,
    sport_name VARCHAR(80) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    time_slot VARCHAR(100) NOT NULL,
    date_label VARCHAR(100) NOT NULL,
    current_members INTEGER NOT NULL DEFAULT 1,
    total_members INTEGER NOT NULL DEFAULT 4,
    price VARCHAR(120),
    skill_level VARCHAR(80) NOT NULL,
    image_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_lfg_posts_author_id ON lfg_posts(author_id);
CREATE INDEX IF NOT EXISTS ix_lfg_posts_sport_id ON lfg_posts(sport_id);

CREATE TABLE IF NOT EXISTS lfg_post_participants (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES lfg_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_lfg_post_participant UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_lfg_post_participants_post_id ON lfg_post_participants(post_id);
CREATE INDEX IF NOT EXISTS ix_lfg_post_participants_user_id ON lfg_post_participants(user_id);

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message VARCHAR,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text VARCHAR NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS ix_messages_sender_id ON messages(sender_id);

-- The current production data has no duplicate user pairs in either order.
-- This expression index also prevents a second conversation with reversed ids.
CREATE UNIQUE INDEX IF NOT EXISTS uq_direct_conversation_pair_unordered
    ON conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));
