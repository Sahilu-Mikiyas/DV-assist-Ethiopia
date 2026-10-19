CREATE TABLE auth_email_outbox (
    id uuid PRIMARY KEY,
    challenge_id uuid NOT NULL UNIQUE REFERENCES auth_challenges(id) ON DELETE CASCADE,
    payload_ciphertext bytea,
    status text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled', 'expired')),
    attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    available_at timestamptz NOT NULL DEFAULT now(),
    locked_until timestamptz,
    last_error_code text
        CHECK (last_error_code IS NULL OR last_error_code IN ('smtp_delivery_failed', 'payload_decryption_failed')),
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK ((status IN ('pending', 'processing')) = (payload_ciphertext IS NOT NULL)),
    CHECK ((status = 'processing') = (locked_until IS NOT NULL)),
    CHECK ((status = 'delivered') = (delivered_at IS NOT NULL))
);

CREATE INDEX auth_email_outbox_available_idx
    ON auth_email_outbox (available_at, created_at)
    WHERE status IN ('pending', 'processing');
