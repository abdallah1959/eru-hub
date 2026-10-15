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
