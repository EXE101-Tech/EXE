-- Social feed posts, likes, and comments. Existing lfg_posts are intentionally untouched.
CREATE TABLE IF NOT EXISTS social_posts (
    id SERIAL PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type VARCHAR(10),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_social_posts_media_type CHECK (media_type IS NULL OR media_type IN ('image', 'video'))
);
CREATE INDEX IF NOT EXISTS ix_social_posts_author_id ON social_posts(author_id);
CREATE INDEX IF NOT EXISTS ix_social_posts_created_at ON social_posts(created_at);

CREATE TABLE IF NOT EXISTS social_post_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_social_post_like UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS ix_social_post_likes_post_id ON social_post_likes(post_id);
CREATE INDEX IF NOT EXISTS ix_social_post_likes_user_id ON social_post_likes(user_id);

CREATE TABLE IF NOT EXISTS social_post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_social_post_comments_post_id ON social_post_comments(post_id);
CREATE INDEX IF NOT EXISTS ix_social_post_comments_author_id ON social_post_comments(author_id);
CREATE INDEX IF NOT EXISTS ix_social_post_comments_created_at ON social_post_comments(created_at);
