# Official DV cycle status snapshot

**Checked:** October 21, 2026 (Africa/Addis_Ababa)  
**Cycle:** DV-2027  
**Status:** Entry schedule and cycle instructions remain unverified; applicant intake and cycle-specific form fields stay disabled.

This is a dated snapshot, not a substitute for the live official pages. The public landing page links to both source notices and keeps entry timing distinct from visa issuance.

## Sources checked

| Source | Official statement observed | Product consequence |
| --- | --- | --- |
| [Changes to Entry Period for DV-2027](https://travel.state.gov/en/newsroom/visas/2025/changes-to-2027-dv-program-entry-period.html), published November 5, 2025; page last updated November 5, 2025 | The Department says it will announce the DV-2027 registration start date and Entry Status Check result date as soon as practicable. | Do not advertise a DV-2027 entry window or publish cycle form fields based on the prior year. Keep `config/dv-cycles/dv-2027.json` blocked and empty until applicable instructions are published and reviewed. |
| [Diversity Visa Program — Submit an Entry](https://travel.state.gov/content/travel/en/us-visas/immigrate/diversity-visa-program-entry/diversity-visa-submit-entry1.html), checked October 21, 2026 | Each year's detailed instructions include the registration dates; entries must be submitted during that specific period; only one entry per person is allowed; the page says there is no cost to register and encourages entrants who receive help to be present and retain their confirmation number. | Do not imply a third party can submit an entry outside the official process. Keep applicant control, duplicate-entry warnings, and official fee handling separate from the service. Recheck if instructions change before the pilot. |
| [Diversity Visa Issuance Updated Guidance](https://travel.state.gov/en/newsroom/visas/2025/diversity-visa-issuance-updated-guidance.html), published August 31, 2026; page last updated August 31, 2026 | Effective immediately, the Department says it has paused visa issuances to DV immigrant visa applicants while reviewing screening and vetting. This notice discusses visa issuance, not the DV-2027 registration schedule. | Show the visa-issuance update as a separate, dated fact. Do not interpret it as a registration opening date, entry cancellation, or a promise about later visa issuance. Tell applicants to consult the Department's current notice. |

## Recheck procedure

1. Before publishing or changing cycle-specific copy, the operator checks the Department's DV instructions page, DV entry page, and current Visa News notices.
2. Record the access date, page's own last-updated date, applicable cycle, exact source URL, reviewer, observed statement, and affected product copy/config.
3. A second reviewer independently checks every field or rule before a new immutable cycle config is approved. No source screenshot or old-cycle PDF alone is sufficient to enable intake.
4. If an official source changes, update the public status notice and Amharic copy in the same release. Have a fluent reviewer check the Amharic rendering before publishing it.
5. Keep `dv-2027.json` at `blocked_pending_official_instructions` with zero sections until all official requirements and the internal security/privacy/operations gates are separately approved.

## Current limitations

- No DV-2027 entry dates or form instructions were available from these sources at the time of this check.
- This check did not verify photo specifications, passport fields, eligibility lists, family rules, any fee changes in a future cycle, or allowed local service practices in Ethiopia.
- The visa-issuance pause is a separate downstream processing issue. This snapshot does not establish how it will affect a future DV entry period or any individual's case.
- No applicant data, documents, photos, or payments may be accepted on the basis of this status check.
