-- Issue #44: additive attendance evidence tables; no legacy outcomes are backfilled.

BEGIN;

CREATE TABLE IF NOT EXISTS match_trust_sessions (
	match_id INTEGER NOT NULL,
	organizer_id INTEGER,
	cancelled_by INTEGER,
	policy JSON NOT NULL,
	verification_status VARCHAR(20) NOT NULL,
	removed_at TIMESTAMP WITHOUT TIME ZONE,
	code_hash VARCHAR(64),
	code_salt VARCHAR(64),
	code_expires_at TIMESTAMP WITHOUT TIME ZONE,
	reviewed_status VARCHAR(20),
	reviewed_at TIMESTAMP WITHOUT TIME ZONE,
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	PRIMARY KEY (match_id),
	FOREIGN KEY(match_id) REFERENCES matches (id) ON DELETE CASCADE,
	FOREIGN KEY(organizer_id) REFERENCES users (id) ON DELETE SET NULL,
	FOREIGN KEY(cancelled_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_attendance_records (
	id SERIAL NOT NULL,
	match_id INTEGER NOT NULL,
	user_id INTEGER NOT NULL,
	confirmation_status VARCHAR(20) NOT NULL,
	confirmed_at TIMESTAMP WITHOUT TIME ZONE,
	terms JSON,
	cancelled_at TIMESTAMP WITHOUT TIME ZONE,
	cancellation_reason TEXT,
	late_cancellation BOOLEAN NOT NULL,
	checked_in_at TIMESTAMP WITHOUT TIME ZONE,
	failed_attempts INTEGER NOT NULL,
	locked_until TIMESTAMP WITHOUT TIME ZONE,
	host_report VARCHAR(16),
	host_reported_at TIMESTAMP WITHOUT TIME ZONE,
	self_occurred BOOLEAN,
	self_attended BOOLEAN,
	self_reported_at TIMESTAMP WITHOUT TIME ZONE,
	dispute_reason TEXT,
	dispute_at TIMESTAMP WITHOUT TIME ZONE,
	resolved_outcome VARCHAR(16),
	resolution_note TEXT,
	reviewed_by INTEGER,
	reviewed_at TIMESTAMP WITHOUT TIME ZONE,
	PRIMARY KEY (id),
	CONSTRAINT uq_match_attendance_user UNIQUE (match_id, user_id),
	FOREIGN KEY(match_id) REFERENCES matches (id) ON DELETE CASCADE,
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
	FOREIGN KEY(reviewed_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS match_trust_events (
	id SERIAL NOT NULL,
	match_id INTEGER NOT NULL,
	actor_id INTEGER,
	subject_id INTEGER,
	event_type VARCHAR(40) NOT NULL,
	details JSON NOT NULL,
	created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(match_id) REFERENCES matches (id) ON DELETE CASCADE,
	FOREIGN KEY(actor_id) REFERENCES users (id) ON DELETE SET NULL,
	FOREIGN KEY(subject_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_match_trust_sessions_cancelled_by ON match_trust_sessions (cancelled_by);

CREATE INDEX IF NOT EXISTS ix_match_trust_sessions_organizer_id ON match_trust_sessions (organizer_id);

CREATE INDEX IF NOT EXISTS ix_match_trust_sessions_verification_status ON match_trust_sessions (verification_status);

CREATE INDEX IF NOT EXISTS ix_match_attendance_records_match_id ON match_attendance_records (match_id);

CREATE INDEX IF NOT EXISTS ix_match_attendance_records_user_id ON match_attendance_records (user_id);

CREATE INDEX IF NOT EXISTS ix_match_trust_events_created_at ON match_trust_events (created_at);

CREATE INDEX IF NOT EXISTS ix_match_trust_events_match_id ON match_trust_events (match_id);

CREATE INDEX IF NOT EXISTS ix_match_trust_events_subject_id ON match_trust_events (subject_id);

COMMIT;
