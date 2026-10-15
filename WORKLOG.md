# WORKLOG — ERU Student Hub

## Current checkpoint
- Date: 2026-10-16
- Working branch: `feature/academic-hub-foundation`
- Production branch: `main` (left unchanged)
- Existing frontend: single-file `index.html` on GitHub Pages; preserve its design, Arabic/English toggle, links, QR/copy controls, and GoatCounter stats.

## Agreed scope (do not expand)
1. Academic Schedule
2. Campus & Room Guide
3. Section Groups
4. Admin Dashboard
5. Security and hosting required for those features

No student accounts. Public users can view only published records. Admin changes should not require editing frontend source. Use available schedule and group links now; incomplete details can be added later through the dashboard.

## Architecture under evaluation
- Keep GitHub Pages for the public static frontend.
- Cloudflare Worker + D1 is the initial backend candidate, subject to configuration and deployment checks.
- Secrets must be configured in the provider dashboard/secret store, never committed.
- Do not publish or expose any unconfigured admin endpoint. Do not change `main` or production until tests and deployment configuration are reviewed.

## Data model
- Courses: code, Arabic/English names, instructor/description as available, optional Drive/resource URL, status.
- Sessions: course, day, start/end, type (lecture/tutorial/lab), section, room, instructor, status, source/notes.
- Rooms: building, floor, room code/name, description, status.
- Section groups: course, section, group URL, status.
- Statuses: draft, needs_review, published, archived. Public API returns only published records.
- Missing optional data remains null/blank; never invent schedule, room, instructor, or group details.

## Work completed
- Confirmed GitHub repository access and reviewed the current `main` branch.
- Confirmed repository root currently contains only `index.html` (581,834 bytes); no existing `WORKLOG.md` or backend files were listed.
- Created isolated working branch `feature/academic-hub-foundation`. No production files changed.

## Next
1. Add and validate the initial D1 schema and API skeleton on the feature branch.
2. Add tests and implement admin CRUD with server-side authorization.
3. Integrate the public frontend while preserving existing functionality.
4. Verify all tests, review diff, then ask before merging/publishing.
