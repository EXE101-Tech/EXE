-- Supabase PostgreSQL Migration Script

-- Create blacklisted_tokens table
CREATE TABLE IF NOT EXISTS blacklisted_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(500) UNIQUE NOT NULL,
    blacklisted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Create login_attempts table
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- Alter total_price and price_per_hour fields to Integer to avoid floating-point issues
ALTER TABLE courts ALTER COLUMN price_per_hour TYPE INTEGER USING price_per_hour::INTEGER;
ALTER TABLE bookings ALTER COLUMN total_price TYPE INTEGER USING total_price::INTEGER;
