-- Premium automatic game-room matching preferences.
-- Safe to re-run on the deployed PostgreSQL database.

CREATE TABLE IF NOT EXISTS room_search_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sport_id INTEGER REFERENCES sports(id) ON DELETE SET NULL,
    required_level VARCHAR(20),
    max_price INTEGER,
    location VARCHAR(255),
    time_slots JSON NOT NULL DEFAULT '[]'::json,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_room_search_preferences_user_id UNIQUE (user_id),
    CONSTRAINT ck_room_search_preferences_max_price CHECK (max_price IS NULL OR max_price >= 0)
);

CREATE INDEX IF NOT EXISTS ix_room_search_preferences_user_id ON room_search_preferences(user_id);
CREATE INDEX IF NOT EXISTS ix_room_search_preferences_sport_id ON room_search_preferences(sport_id);
CREATE INDEX IF NOT EXISTS ix_room_search_preferences_is_active ON room_search_preferences(is_active);
