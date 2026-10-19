CREATE TABLE auth_rate_limits (
    rate_key text PRIMARY KEY CHECK (length(rate_key) BETWEEN 1 AND 128),
    window_started_at timestamptz NOT NULL,
    request_count integer NOT NULL CHECK (request_count > 0)
);

CREATE INDEX auth_rate_limits_window_started_idx ON auth_rate_limits (window_started_at);
