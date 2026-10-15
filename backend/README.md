# ERU Student Hub backend

Cloudflare Workers + D1 backend candidate for the first-year AI cohort at Egyptian Russian University. The public frontend remains on GitHub Pages; this Worker is a separate API/admin origin.

## Cloudflare resources
- Worker name: `eru-student-hub-api`
- D1 database: `eru-student-hub-db`
- D1 binding: `DB`
- Public site origin: `https://abdallah1959.github.io`
- Wrangler config: this directory is the project root for Workers Builds.
- Static admin asset directory: `./public`.

## Deployment configuration
- `wrangler.toml` is the source of truth for Worker name, D1 binding/database ID, migrations directory, asset binding, and `SITE_ORIGIN`.
- The Cloudflare dashboard currently has a manually created Worker and D1 binding. Its currently deployed script is still the temporary Hello World scaffold until the repository-backed build is configured and a verified deployment is made.
- In Cloudflare Worker Settings → Builds, connect repository `abdallah1959/eru-hub`, choose branch `feature/academic-hub-foundation`, and set Root directory to `backend`. The Worker name in Wrangler must match the existing Worker name.
- Do not merge this feature branch into `main` or configure GitHub Pages to deploy this branch as part of the backend rollout.
- Do not deploy the production Worker until CI passes, the migrations are reviewed and applied, secrets are configured, and rate limiting plus live smoke tests are addressed.

## Database migrations
- Migration files are in `backend/migrations` and are relative to the Wrangler project root.
- Review the SQL before applying it to the remote D1 database.
- Apply migrations with Wrangler from this directory using the `DB` binding, then verify the migration list and expected row counts before enabling the frontend.
- Do not run the same SQL manually in the dashboard and then apply migrations again; Wrangler tracks applied migrations in D1.
- The preliminary schedule migration imports 6 courses, 3 halls, and 24 sessions. Every imported record is `needs_review`, and public API queries expose only `published` records.

## Authentication and secrets
- Set `SITE_ORIGIN` to the exact GitHub Pages origin: `https://abdallah1959.github.io`. It is a non-secret Worker variable in Wrangler configuration.
- Generate a password hash locally with Node.js: `node scripts/hash-password.mjs 'your-long-unique-password'`. Use a password manager; do not share or commit the password or hash.
- Configure the printed value as Worker secret `ADMIN_PASSWORD_HASH`, and set a separate random `ADMIN_SESSION_SECRET` (at least 32 random bytes).
- The login uses PBKDF2-HMAC-SHA-256 and an 8-hour signed, HttpOnly, Secure, SameSite=Strict cookie. The Worker admin page is same-origin with the API.
- Admin endpoints fail closed unless all required configuration is present.

## Security requirements before public use
- The Worker now has a Cloudflare Rate Limiting binding for login attempts (5 requests per 60 seconds per key, per Cloudflare location). This is defense-in-depth, not a global/strict accounting limit; consider an additional WAF rule if a custom domain/zone is later added.
- Verify origin checks, cookie behavior, input validation, and admin authorization against the deployed Worker.
- Test CRUD operations against real D1 using unpublished test records, then remove them.
- Public endpoints return only published records.
- Never publish unverified lecture schedules or room/instructor details.
- Never put passwords, hashes, API tokens, or session secrets in source control or chat.

## Tests
From this directory, run `npm test`. The repository workflow also checks the JavaScript syntax and validates migrations using SQLite.
