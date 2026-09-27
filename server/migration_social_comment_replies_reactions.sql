-- Additive, data-preserving migration for social comment replies and emoji reactions.
-- Apply once to the PostgreSQL database selected by DATABASE_URL.

ALTER TABLE social_post_comments
    ADD COLUMN IF NOT EXISTS parent_id INTEGER
    REFERENCES social_post_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_social_post_comments_parent_id
    ON social_post_comments(parent_id);

CREATE TABLE IF NOT EXISTS social_post_comment_reactions (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES social_post_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(16) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_social_post_comment_reaction UNIQUE (comment_id, user_id),
    CONSTRAINT ck_social_post_comment_reaction_type
        CHECK (reaction IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry'))
);

CREATE INDEX IF NOT EXISTS ix_social_post_comment_reactions_comment_id
    ON social_post_comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS ix_social_post_comment_reactions_user_id
    ON social_post_comment_reactions(user_id);
