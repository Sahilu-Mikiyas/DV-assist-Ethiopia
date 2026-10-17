# Phase 6: photo review

## Current state

The wizard now shows a Phase 6 gate after the synthetic family example. It explains planned hard checks (file type, pixel dimensions, aspect ratio, and size), the distinction between optional local visual advisories and human review, and the rule that automated feedback cannot guarantee acceptance. The gate contains no file input and does not inspect or upload photos.

## Why intake remains disabled

The official State Department instructions page currently describes DV-2026; no verified DV-2027 photo policy is in this repository. Do not reuse prior-cycle measurements as current rules. Set cycle-specific photo checks only from the exact official instructions after review and record source, cycle, and verification date. Current cycle metadata remains `blocked_pending_official_instructions`.

## Before enabling photo upload

- Verify allowed format, byte limit, dimensions, aspect ratio, background/head-position requirements, and per-person photo requirements from current instructions.
- Add client-side file checks against that versioned policy; do not hard-code cycle values in the UI.
- Decide whether any visual heuristic is needed. Run it on-device where possible, describe false positives, and do not build face recognition, face embeddings, or biometric identity links.
- Secure the backend path first: per-case/person authorization, private object storage, short-lived upload intent, content validation, malware scanning/quarantine, encryption, access audit, and deletion enforcement.
- Add per-person photo review status and a human review rubric. Keep advice distinct from official acceptance.
- Do not collect real applicant photos until Phase 3 persistence/access gates and the data-retention/security review are complete.

## Current limits

There is no photo selection, capture, upload, image analysis, object storage, staff photo review, or deletion workflow in this prototype. It uses no real photos or identity data.
