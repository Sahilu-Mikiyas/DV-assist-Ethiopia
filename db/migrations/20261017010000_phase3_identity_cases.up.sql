CREATE TABLE users (
    id uuid PRIMARY KEY,
    email text NOT NULL,
    email_normalized text NOT NULL UNIQUE,
    email_verified_at timestamptz,
    disabled_at timestamptz,
    mfa_secret_ciphertext bytea,
    mfa_enabled_at timestamptz,
    mfa_last_step bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (email = btrim(email)),
    CHECK (email_normalized = lower(email_normalized))
);

CREATE TABLE auth_challenges (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_digest bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    consumed_at timestamptz,
    CHECK (expires_at > created_at)
);
CREATE INDEX auth_challenges_user_created_idx ON auth_challenges (user_id, created_at DESC);
CREATE INDEX auth_challenges_expiry_idx ON auth_challenges (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE sessions (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_digest bytea NOT NULL UNIQUE,
    csrf_digest bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    mfa_verified_at timestamptz,
    CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_active_idx ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE role_grants (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('applicant', 'staff', 'administrator')),
    granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
    granted_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CHECK (granted_by IS NULL OR granted_by <> user_id)
);
CREATE UNIQUE INDEX role_grants_active_unique_idx ON role_grants (user_id, role) WHERE revoked_at IS NULL;

CREATE TABLE cases (
    id uuid PRIMARY KEY,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cycle_key text NOT NULL CHECK (cycle_key ~ '^[A-Za-z0-9._-]{1,32}$'),
    status text NOT NULL DEFAULT 'in_preparation'
        CHECK (status IN ('in_preparation', 'needs_review', 'ready_for_applicant', 'closed')),
    assigned_staff_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    closed_at timestamptz,
    CHECK ((status = 'closed') = (closed_at IS NOT NULL))
);
CREATE INDEX cases_owner_updated_idx ON cases (owner_user_id, updated_at DESC);
CREATE INDEX cases_staff_queue_idx ON cases (assigned_staff_user_id, status, updated_at DESC);
CREATE UNIQUE INDEX cases_owner_active_cycle_idx ON cases (owner_user_id, cycle_key) WHERE status <> 'closed';

CREATE TABLE case_events (
    id uuid PRIMARY KEY,
    case_id uuid NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    event_type text NOT NULL CHECK (event_type IN ('case_created', 'case_viewed', 'status_changed', 'staff_assigned', 'timeline_viewed')),
    previous_status text,
    new_status text,
    safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(safe_metadata) = 'object')
);
CREATE INDEX case_events_case_created_idx ON case_events (case_id, created_at DESC);

CREATE TABLE audit_events (
    id uuid PRIMARY KEY,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    target_type text NOT NULL,
    target_id text,
    request_id text NOT NULL,
    outcome text NOT NULL CHECK (outcome IN ('success', 'denied', 'failure')),
    safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK (jsonb_typeof(safe_metadata) = 'object')
);
CREATE INDEX audit_events_actor_created_idx ON audit_events (actor_user_id, created_at DESC);
CREATE INDEX audit_events_target_created_idx ON audit_events (target_type, target_id, created_at DESC);

CREATE FUNCTION reject_append_only_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'append-only records cannot be changed';
END;
$$;
CREATE TRIGGER case_events_append_only BEFORE UPDATE OR DELETE ON case_events
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
