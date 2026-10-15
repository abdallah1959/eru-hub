# WORKLOG — ERU Student Hub

## Current checkpoint
- Date: 2026-10-16
- Working branch: `feature/academic-hub-foundation`
- Production branch: `main` (unchanged)
- Existing frontend: single-file `index.html` on GitHub Pages; preserve its design, Arabic/English toggle, links, QR/copy controls, and GoatCounter stats.

## Agreed scope (do not expand)
1. Academic Schedule
2. Campus & Room Guide
3. Section Groups
4. Admin Dashboard
5. Security and hosting required for those features

No student accounts. Public users can view only published records. Admin changes should not require editing frontend source. Use available schedule and group links now; incomplete details can be added later through the dashboard.

## Architecture
- Keep GitHub Pages for the public static frontend.
- Cloudflare Worker + D1 is the initial backend candidate; not deployed.
- Secrets must be configured in the provider secret store, never committed.
- Admin endpoints fail closed until authentication and authorization are implemented.
- Do not change `main` or production until tests and deployment configuration are reviewed.

## Data model
- Courses: code, Arabic/English names, instructor/description as available, optional Drive/resource URL, status.
- Sessions: course, day, start/end, type (lecture/tutorial/lab), section, room, instructor, status, source/notes.
- Rooms: building, floor, room code/name, description, status.
- Section groups: course, section, group URL, status.
- Statuses: draft, needs_review, published, archived. Public API returns only published records.
- Missing optional data remains blank; never invent schedule, room, instructor, or group details.

## Work completed on feature branch
- Confirmed GitHub repository access and reviewed the current `main` branch.
- Repository root previously contained only `index.html` (581,834 bytes).
- Created isolated branch `feature/academic-hub-foundation`; production branch unchanged.
- Added this worklog, initial D1 schema and migration, Worker configuration template, read-only public API scaffold, and Node built-in test suite.
- Added a GitHub Actions workflow to run `npm test` for this feature branch.
- Public API paths: `/api/courses`, `/api/sessions`, `/api/rooms`, `/api/section-groups`, and `/api/health`.
- Public SQL filters for `published` records. Admin API currently returns 503 by design; no writes or login are enabled yet.
- Cloudflare account/database/origin configuration and deployment have not been done.
- Automated CI status has not yet been confirmed; tests are committed but must run before relying on this scaffold.

## Next
1. Run CI and fix any failures.
2. Implement admin login/session security and authorized CRUD, then test it.
3. Integrate public UI into existing `index.html` without removing existing features.
4. Add currently available schedule and group data only after validating the source files.
5. Review full diff and security checklist; ask before merging/publishing.
