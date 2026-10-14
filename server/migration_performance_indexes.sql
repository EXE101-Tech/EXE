-- Migration: High-Performance Composite Indexes (No duplicates)
-- 1. Messages table composite indexes (Fast conversation timeline & unread count)
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, sender_id, is_read);

-- 2. Conversations table indexes (Fast conversation lookup)
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- 3. Matches / Gamerooms composite indexes (Fast filtered listing)
CREATE INDEX IF NOT EXISTS idx_matches_sport_status ON matches(sport_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_end_time_status ON matches(end_time, status);
CREATE INDEX IF NOT EXISTS idx_matches_host_id ON matches(host_id);

-- 4. Teams composite indexes
CREATE INDEX IF NOT EXISTS idx_team_memberships_team_status ON team_memberships(team_id, status);

-- 5. Courts and Venues composite indexes
CREATE INDEX IF NOT EXISTS idx_courts_venue_active ON courts(venue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_venues_active ON venues(is_active);

-- 6. Friendships pair index
CREATE INDEX IF NOT EXISTS idx_friendships_users ON friendships(user_low_id, user_high_id);
