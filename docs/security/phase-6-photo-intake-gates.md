# Phase 6: photo intake and secure-upload launch gates

**Status:** Design contract only. Real photo selection, processing, upload, storage, and staff review remain disabled.  
**Cycle status:** DV-2027 photo requirements are not verified in this repository.  
**Scope:** Define what must be true before implementation accepts a real applicant image. This document does not authorize collecting photos.

## Product boundary

Photo guidance is preparation support. It is not an official eligibility decision and cannot guarantee that a government system will accept a photo. Any future automatic result must be labeled advisory, explain what was checked, and let a human reviewer make the service's final review decision.

Keep the feature closed unless all launch gates below have named evidence and an operator has approved the release. Do not infer DV-2027 rules from prior cycles, sample images, blog posts, or prototype copy.

## Gate A — verify the current cycle policy

An operator must review the exact current-cycle official instructions and record:

- Cycle key and the date the instructions were checked.
- Official source URL and the relevant section/page.
- Reviewer identity and a second-person review where available.
- Allowed file formats, maximum bytes, pixel width/height, aspect ratio, and any composition/background requirements.
- Whether each applicant, spouse, and child needs a separate image and which family members must be included.
- Whether any rule is ambiguous and the resulting unresolved question.

Only policy values explicitly supported by that source may be marked verified. Ambiguous requirements keep the gate closed. Preserve the source citation and review record so future cycle updates can be compared.

### Versioned policy record

Store cycle-specific values as data, never as UI constants. The shape below is illustrative and intentionally contains no active DV-2027 values:

```json
{
  "cycleKey": "DV-YYYY",
  "policyVersion": "1",
  "status": "draft",
  "source": {
    "url": "https://travel.state.gov/...",
    "checkedAt": null,
    "reviewedBy": [],
    "notes": ""
  },
  "file": {
    "allowedMimeTypes": [],
    "maxBytes": null,
    "minWidthPx": null,
    "maxWidthPx": null,
    "minHeightPx": null,
    "maxHeightPx": null,
    "minAspectRatio": null,
    "maxAspectRatio": null
  },
  "composition": {
    "requirements": [],
    "perPersonRules": []
  }
}
```

A policy may become active only after source review, value validation, and approval are recorded. Activating a new version must not silently change checks for an in-progress case: persist the policy version used for each review and explicitly request re-check when policy changes.

## Gate B — applicant and case authorization

Before issuing an upload intent, the server must:

1. Authenticate the applicant and verify ownership of the case.
2. Confirm the case is open for the relevant workflow step and the cycle has an active, approved photo policy.
3. Bind the image slot to a specific case and person record (applicant, spouse, or child); reject arbitrary object keys and client-selected storage paths.
4. Check that the person is eligible for a photo slot under the active cycle policy.
5. Record a reason-coded audit event without logging image bytes, filenames containing personal details, or other image metadata.
6. Apply request and case-level rate/size limits.

Unknown, unowned, closed, or ineligible resources should not reveal whether another applicant's case or person exists.

## Gate C — private upload and quarantine

The secure upload flow must be designed and tested before any real file can be submitted:

1. The API issues a short-lived, single-purpose upload intent for one authorized case/person slot. It carries no reusable credential and expires quickly.
2. The browser uploads to a private quarantine location. The bucket/container must have public access disabled, encryption at rest, TLS in transit, and no public listing.
3. The server independently checks the actual byte count, file signature, decodability, and allowed format. Do not trust the browser's MIME type, extension, or client-side result.
4. Reject malformed files and files exceeding the active policy before they can be reviewed. Never serve quarantined content inline.
5. Run malware scanning or an explicitly approved equivalent before marking a file safe. A scan failure, timeout, or unavailable scanner keeps the file quarantined and inaccessible to staff.
6. Normalize or strip unnecessary metadata where safe, while preserving the original only if the approved review process requires it. Document the behavior.
7. Promote only successfully validated files to private review storage; bind the stored object to an opaque server-generated ID.
8. Issue short-lived, authorized access URLs only after checking the viewer's role and case assignment. Do not include object IDs or access tokens in analytics, chat, or ordinary logs.

The storage provider, scanner, encryption/key ownership, backup handling, and deployment region are open infrastructure decisions. Do not implement a pretend secure upload using public URLs, local disk, or an unreviewed third-party image endpoint.

## Gate D — applicant-side checks and advisory feedback

Client checks may improve usability but are not security controls. Once a verified policy exists, the UI may preflight file type, byte size, dimensions, and aspect ratio before upload. Repeat all checks on the server.

If composition checks are implemented:

- Prefer on-device processing so the photo is not sent to an external analysis provider.
- Describe the checks in plain language and their known limitations.
- Avoid face recognition, face embeddings, identity matching, and biometric templates.
- Do not label heuristic output “approved,” “compliant,” or “guaranteed.”
- Let the applicant continue after advisory warnings only according to the approved staff workflow; record that the warning was advisory.

## Gate E — human review and case workflow

Define an explicit rubric before staff review exists. At minimum, the rubric must distinguish:

- File/policy checks that passed or failed.
- Visual observations that need correction.
- Whether a reviewer is requesting a replacement.
- Reviewer identity, timestamp, policy version, and a concise reason code.
- Applicant notification and one-correction-round behavior for the pilot package.

Staff access must be limited to assigned cases and require the existing privileged-role MFA controls. Every image view, download, review decision, reassignment, and deletion must create an audit record. Notes must not include unnecessary sensitive image details. Review labels describe the service's review only; they do not predict official acceptance.

## Gate F — retention, deletion, and incident handling

Before real upload, approve retention periods for active cases, declined/replaced photos, closed cases, backups, and incident holds. Implement and verify deletion across:

- Quarantine and review object storage.
- Database metadata and any generated thumbnails/derivatives.
- Cache/CDN layers, if any.
- Backups and restore procedures, including expiry of deleted content from backups.
- Logs and audit records (retain only the approved minimum; never log image bytes).

Deletion must be idempotent, auditable, and retryable. A failed deletion remains visible to operators and must not be reported as complete. Define who can place an incident hold, why, for how long, and who can release it. Document breach triage, access revocation, applicant contact, and evidence preservation.

The pilot's proposed target is deletion within 30 days after review or case closure. Treat this as a design target, not an implemented or legally approved retention policy, until the operator approves it and the complete deletion path is verified.

## Required release evidence

Do not enable real photo intake until all of these are checked and linked to reviewable evidence:

- [ ] Current-cycle official policy reviewed and versioned; no unresolved rule is guessed.
- [ ] Data inventory, purpose, consent language, privacy notice, retention, refund, and deletion policy approved.
- [ ] Hosting region, private storage, encryption/key management, scanner, backups, and incident owner selected.
- [ ] API authorization tests cover another applicant, unassigned staff, closed cases, invalid person slots, expired/replayed intents, and revoked sessions.
- [ ] Upload tests cover spoofed MIME/extension, malformed images, oversize payloads, decompression/resource exhaustion, scanner errors/timeouts, and duplicate/replayed upload intents.
- [ ] Staff review and image access are MFA-gated, assignment-scoped, and audited.
- [ ] Deletion is exercised across originals, derivatives, quarantine, metadata, backups, and failure/retry scenarios.
- [ ] Applicant-facing wording makes advisory feedback and non-guarantee clear in Amharic and English.
- [ ] A synthetic-data pilot walkthrough and incident/deletion rehearsal are recorded.
- [ ] Product owner signs the launch decision and knows how to disable intake immediately.

## Current implementation limits

The app has no real photo selection, capture, upload endpoint, image analysis, object storage, staff photo review, or deletion workflow. Do not use real applicant photos or identity data in development or demonstrations. The current Phase 6 wizard gate remains informational until the release evidence above is complete.
