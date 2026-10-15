# ERU Student Hub backend

Initial backend candidate: Cloudflare Workers + D1. This folder is isolated on the feature branch and is not yet deployed or connected to the public website.

## D1 setup
1. Create a D1 database in the Cloudflare dashboard.
2. Add its database ID to `wrangler.toml`.
3. Apply `schema.sql` using Wrangler or the D1 dashboard.
4. Configure authentication secrets separately; never put passwords or tokens in source control.

## Security requirements before public deployment
- Admin authentication and server-side authorization on every mutation.
- Secure, HttpOnly, SameSite cookies; session expiry and logout.
- Login rate limiting and generic error messages.
- Validate request origin and input; use parameterized SQL.
- Restrict CORS to the exact production site origin.
- Return only `published` records from public endpoints.
- Do not enable writes until an admin secret/session implementation is configured and tested.

## Data status
The schema allows incomplete records. Records should remain `draft` or `needs_review` until the details are confirmed. Only `published` data should appear publicly.


## Admin authentication configuration (not deployed yet)
- Set `SITE_ORIGIN` to the exact GitHub Pages origin, for example `https://abdallah1959.github.io`.
- Generate a password hash locally with Node.js 22: `node scripts/hash-password.mjs 'your-long-unique-password'`. Use a password manager; do not share or commit the password or hash.
- Configure the printed value as the Worker secret `ADMIN_PASSWORD_HASH`, and set a separate random `ADMIN_SESSION_SECRET` (at least 32 random bytes).
- Bind the D1 database as `DB` and configure `SITE_ORIGIN` as a Worker variable.
- The login uses PBKDF2-HMAC-SHA-256 and an 8-hour signed, HttpOnly, Secure, SameSite=Strict cookie. The admin API is unavailable unless all required configuration is present.
- The login endpoint currently has no persistent rate limiter. Before exposing it publicly, add Cloudflare rate limiting / WAF protection and verify it in the deployed environment.
- Only deploy after the test workflow passes and the Worker configuration, database migrations, secrets, and CORS origin are checked.
