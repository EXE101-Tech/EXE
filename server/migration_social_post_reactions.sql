-- Additive, data-preserving migration for SportGo sports sticker reactions on posts.
-- Existing likes keep working: a like without a row here is shown as the "like" sticker.
-- Apply once to the PostgreSQL database selected by DATABASE_URL.

CREATE TABLE IF NOT EXISTS social_post_reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(20) NOT NULL DEFAULT 'like',
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_social_post_reaction UNIQUE (post_id, user_id),
    CONSTRAINT ck_social_post_reaction_type
        CHECK (reaction IN ('like', 'fire', 'bolt', 'gg', 'trophy', 'haha', 'toang'))
);

CREATE INDEX IF NOT EXISTS ix_social_post_reactions_post_id
    ON social_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS ix_social_post_reactions_user_id
    ON social_post_reactions(user_id);
