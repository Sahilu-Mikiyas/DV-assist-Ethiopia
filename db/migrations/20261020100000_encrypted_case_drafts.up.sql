CREATE TABLE cycle_form_schemas (
    cycle_key text NOT NULL CHECK (cycle_key ~ '^DV-[0-9]{4}$'),
    schema_version integer NOT NULL CHECK (schema_version > 0),
    status text NOT NULL CHECK (status IN ('blocked_pending_official_instructions', 'verified')),
    is_current boolean NOT NULL DEFAULT false,
    schema_json jsonb NOT NULL CHECK (jsonb_typeof(schema_json) = 'object'),
    verified_at timestamptz,
    approval_one uuid REFERENCES users(id) ON DELETE RESTRICT,
    approval_two uuid REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK (schema_json->>'cycle' = cycle_key),
    CHECK ((schema_json->>'schemaVersion')::integer = schema_version),
    CHECK (schema_json->>'status' = status),
    CHECK (
        (status = 'blocked_pending_official_instructions' AND verified_at IS NULL AND approval_one IS NULL AND approval_two IS NULL)
        OR
        (status = 'verified' AND verified_at IS NOT NULL AND approval_one IS NOT NULL AND approval_two IS NOT NULL AND approval_one <> approval_two)
    ),
    CHECK (status <> 'blocked_pending_official_instructions' OR is_current = false),
    PRIMARY KEY (cycle_key, schema_version)
);

CREATE UNIQUE INDEX cycle_form_schemas_current_idx ON cycle_form_schemas(cycle_key) WHERE is_current;

INSERT INTO cycle_form_schemas(cycle_key, schema_version, status, schema_json)
VALUES ('DV-2027', 1, 'blocked_pending_official_instructions',
    '{"schemaVersion":1,"cycle":"DV-2027","status":"blocked_pending_official_instructions","verifiedAt":null,"sections":[],"sources":["https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-instructions.html","https://travel.state.gov/content/travel/en/News/visas-news/changes-to-2027-dv-program-entry-period.html"],"releaseNotes":["No DV-2027 applicant fields are published until the applicable official instructions are available and reviewed.","Do not use this empty configuration to collect DV answers."]}'::jsonb
);

CREATE TABLE case_drafts (
    case_id uuid PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
    cycle_key text NOT NULL,
    schema_version integer NOT NULL CHECK (schema_version > 0),
    ciphertext bytea NOT NULL CHECK (octet_length(ciphertext) >= 29),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (cycle_key, schema_version) REFERENCES cycle_form_schemas(cycle_key, schema_version) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX case_drafts_cycle_updated_idx ON case_drafts(cycle_key, updated_at);
