# WORKLOG — ERU Student Hub

## Current checkpoint
- Date: 2026-10-16
- Working branch: `feature/academic-hub-foundation`
- Production branch: `main` (unchanged; do not merge without explicit approval)
- Audience: first-year students in the College of Artificial Intelligence at Egyptian Russian University.
- Existing frontend: single-file `index.html` on GitHub Pages; preserve its design, Arabic/English toggle, links, QR/copy controls, and GoatCounter stats.

## Agreed scope (do not expand)
1. Academic Schedule
2. Campus & Room Guide
3. Section Groups
4. Admin Dashboard
5. Security and hosting required for those features

No student accounts. Public users can view only published records. Admin changes should not require editing frontend source. Use available schedule and group links now; incomplete details can be added later through the dashboard. The website's visible name/branding may be updated later to target first-year AI students; the internal resource names need not match the future public brand.

## Architecture
- Keep GitHub Pages for the public static frontend.
- Cloudflare Worker + D1 is the backend.
- Cloudflare resources created: Worker `eru-student-hub-api`, D1 database `eru-student-hub-db`, binding `DB`.
- The Worker currently deployed in Cloudflare is still the temporary Hello World scaffold; the real backend has not been deployed or connected to the public site.
- Secrets must be configured in the provider secret store, never committed.
- Admin endpoints fail closed until required authentication configuration is present.
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
- Created isolated branch `feature/academic-hub-foundation`; production branch remains unchanged.
- Added initial D1 schema/migrations, Worker configuration, published-only public API, and Node test suite.
- Imported the available Level 1 lecture schedule as 6 courses, 3 halls, and 24 lecture entries. Every imported record is marked `needs_review`; none is public by default.
- Added a SQLite migration validation test to check record counts, review statuses, and foreign-key integrity.
- Implemented PBKDF2 password verification, signed 8-hour HttpOnly/Secure/SameSite=Strict admin session cookies, strict Origin checks, allowlisted CRUD endpoints for the four resource types, input validation, and generic errors.
- Added an Arabic admin dashboard with login and CRUD for courses, sessions, rooms, and section groups. The Worker serves its same-origin copy at `/admin.html`; the GitHub Pages copy stays disabled until the real API is deployed and verified.
- Added a GitHub Actions workflow to run Node tests, JS syntax check, and SQLite migration validation.
- Public API paths: `/api/courses`, `/api/sessions`, `/api/rooms`, `/api/section-groups`, and `/api/health`.
- Public API queries return only `published` records. The admin API returns 503 until required secrets are configured.
- Created Cloudflare D1 database and bound it to the Worker as `DB`. Database ID is recorded in `backend/wrangler.toml`; do not paste secrets into chat.
- Updated `backend/wrangler.toml` to match the actual Worker name, D1 database name/ID, migration directory, assets binding, and `SITE_ORIGIN=https://abdallah1959.github.io`.
- Updated `backend/README.md` with Cloudflare Builds setup instructions. For the existing Worker, the intended build connection is repository `abdallah1959/eru-hub`, branch `feature/academic-hub-foundation`, root directory `backend`.
- A draft PR remains open: https://github.com/abdallah1959/eru-hub/pull/1. It is not merged.
- The current Worker in Cloudflare still returns `Hello World!`; no production API deployment or frontend connection has happened.

## Remaining before production
1. Confirm CI passes for the latest branch head after the Wrangler/README updates.
2. Connect the existing Worker through Settings → Builds to the repository and `backend` root directory, using the feature branch intentionally; understand that a push can trigger a production deployment.
3. Add Worker secrets `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` using the Cloudflare secret UI; never commit them or send them in chat.
4. Review and apply D1 migrations exactly once with Wrangler; verify migration history and row counts.
5. Add Cloudflare rate limiting/WAF protection for admin login; the code currently has no persistent login rate limiter.
6. Test the deployed API, same-origin admin login, CRUD, and published-only public reads against real D1.
7. Only then configure the GitHub Pages frontend to use the API URL and run public smoke tests.
8. Review the full diff and security checklist. Do not merge or publish broader changes without explicit approval.
