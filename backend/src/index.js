const ALLOWED_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const PUBLIC_PATHS = new Set(["/api/courses", "/api/sessions", "/api/rooms", "/api/section-groups"]);
const SESSION_SECONDS = 8 * 60 * 60;
const COOKIE_NAME = "eru_admin_session";
const RESOURCES = {
  courses: {
    table: "courses",
    fields: ["code", "name_ar", "name_en", "instructor", "description_ar", "description_en", "resource_url", "status"],
    required: ["code", "name_ar"],
    order: "code",
  },
  rooms: {
    table: "rooms",
    fields: ["building", "floor", "room_code", "name_ar", "name_en", "description_ar", "description_en", "status"],
    required: ["room_code"],
    order: "building, room_code",
  },
  sessions: {
    table: "sessions",
    fields: ["course_id", "day_of_week", "start_time", "end_time", "session_type", "section_code", "room_id", "instructor", "notes", "status"],
    required: ["course_id", "day_of_week", "start_time", "end_time", "session_type"],
    order: "day_of_week, start_time",
  },
  "section-groups": {
    table: "section_groups",
    fields: ["course_id", "section_code", "group_url", "status", "notes"],
    required: ["section_code", "group_url"],
    order: "section_code, id",
  },
};
const STATUSES = new Set(["draft", "needs_review", "published", "archived"]);
const SESSION_TYPES = new Set(["lecture", "tutorial", "lab"]);

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  };
  if (origin && env.SITE_ORIGIN && origin === env.SITE_ORIGIN) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });
}
function isAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  // Browsers commonly omit Origin on same-origin GET requests. GET routes are read-only;
  // all state-changing requests and preflights still require an explicitly allowed Origin.
  if (!origin) return request.method === "GET";
  const requestOrigin = new URL(request.url).origin;
  return origin === requestOrigin || (Boolean(env.SITE_ORIGIN) && origin === env.SITE_ORIGIN);
}
function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromB64url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(base64);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
async function hmac(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}
async function createSession(secret) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  return payload + "." + b64url(await hmac(payload, secret));
}
async function validSession(request, secret) {
  if (!secret) return false;
  const cookie = request.headers.get("Cookie") || "";
  const item = cookie.split(";").map(v => v.trim()).find(v => v.startsWith(COOKIE_NAME + "="));
  if (!item) return false;
  const value = item.slice(COOKIE_NAME.length + 1);
  const parts = value.split(".");
  if (parts.length !== 2) return false;
  try {
    const expected = await hmac(parts[0], secret);
    const actual = fromB64url(parts[1]);
    if (expected.length !== actual.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
    if (diff !== 0) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0])));
    return Number.isInteger(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
function cookieHeader(value, maxAge) {
  return COOKIE_NAME + "=" + value + "; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}
async function readJson(request) {
  const length = Number(request.headers.get("Content-Length") || "0");
  if (length > 32768) throw new Error("payload_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 32768) throw new Error("payload_too_large");
  return JSON.parse(text);
}
function validateRecord(resource, body, creating) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "invalid_body";
  const unknown = Object.keys(body).filter(key => !resource.fields.includes(key));
  if (unknown.length) return "unknown_fields";
  for (const key of resource.required) {
    if (creating && (body[key] === undefined || body[key] === null || String(body[key]).trim() === "")) return "missing_required_field";
    if (!creating && Object.hasOwn(body, key) && String(body[key] ?? "").trim() === "") return "invalid_required_field";
  }
  if (body.status !== undefined && !STATUSES.has(body.status)) return "invalid_status";
  if (body.session_type !== undefined && !SESSION_TYPES.has(body.session_type)) return "invalid_session_type";
  if (body.day_of_week !== undefined && (!Number.isInteger(body.day_of_week) || body.day_of_week < 0 || body.day_of_week > 6)) return "invalid_day_of_week";
  for (const key of ["start_time", "end_time"]) {
    if (body[key] !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(body[key])) return "invalid_time";
  }
  for (const key of ["resource_url", "group_url"]) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      try {
        const url = new URL(body[key]);
        if (url.protocol !== "https:" && url.protocol !== "http:") return "invalid_url";
      } catch { return "invalid_url"; }
    }
  }
  for (const key of ["code", "name_ar", "name_en", "instructor", "description_ar", "description_en", "building", "floor", "room_code", "section_code", "notes", "course_id", "room_id"]) {
    if (body[key] !== undefined && body[key] !== null && typeof body[key] !== "string") return "invalid_field_type";
    if (typeof body[key] === "string" && body[key].length > 2000) return "field_too_long";
  }
  return null;
}
async function publicData(path, db) {
  const queries = {
    "/api/courses": "SELECT id, code, name_ar, name_en, instructor, description_ar, description_en, resource_url FROM courses WHERE status = 'published' ORDER BY code",
    "/api/rooms": "SELECT id, building, floor, room_code, name_ar, name_en, description_ar, description_en FROM rooms WHERE status = 'published' ORDER BY building, room_code",
    "/api/sessions": "SELECT s.id, s.course_id, c.code AS course_code, c.name_ar AS course_name_ar, c.name_en AS course_name_en, s.day_of_week, s.start_time, s.end_time, s.session_type, s.section_code, s.room_id, r.room_code, r.building, r.floor, s.instructor FROM sessions s JOIN courses c ON c.id = s.course_id LEFT JOIN rooms r ON r.id = s.room_id AND r.status = 'published' WHERE s.status = 'published' AND c.status = 'published' ORDER BY s.day_of_week, s.start_time",
    "/api/section-groups": "SELECT g.id, g.course_id, c.code AS course_code, g.section_code, g.group_url FROM section_groups g LEFT JOIN courses c ON c.id = g.course_id AND c.status = 'published' WHERE g.status = 'published' ORDER BY g.section_code, c.code",
  };
  const result = await db.prepare(queries[path]).all();
  return result.results ?? [];
}
export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "OPTIONS") {
      if (!isAllowedOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403, headers);
      return new Response(null, { status: 204, headers });
    }
    if (path === "/api/health" && request.method === "GET") return json({ ok: true }, 200, headers);
    if (PUBLIC_PATHS.has(path) && request.method === "GET") {
      if (!isAllowedOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403, headers);
      try { return json({ data: await publicData(path, env.DB) }, 200, headers); }
      catch (error) {
        console.error("[ERU Hub API] Public read failed:", error);
        return json({ error: "service_unavailable" }, 503, headers);
      }
    }
    if (path === "/admin") return Response.redirect(new URL("/admin.html", url).toString(), 302);
    if (!path.startsWith("/api/admin")) {
      if (env.ASSETS) return env.ASSETS.fetch(request);
      return json({ error: "not_found" }, 404, headers);
    }
    if (!isAllowedOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403, headers);
    if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_SESSION_SECRET || !env.DB || !env.LOGIN_LIMITER) return json({ error: "admin_not_configured" }, 503, headers);

    if (path === "/api/admin/login" && request.method === "POST") {
      try {
        const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
        const limit = await env.LOGIN_LIMITER.limit({ key: clientKey });
        if (!limit.success) return json({ error: "too_many_attempts" }, 429, headers);
        const body = await readJson(request);
        if (typeof body.password !== "string" || body.password.length > 1024) return json({ error: "invalid_credentials" }, 401, headers);
        const [salt, iterationsText, expectedText] = env.ADMIN_PASSWORD_HASH.split("$");
        const iterations = Number(iterationsText);
        if (!salt || !expectedText || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return json({ error: "admin_not_configured" }, 503, headers);
        const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(body.password), "PBKDF2", false, ["deriveBits"]);
        const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: fromB64url(salt), iterations, hash: "SHA-256" }, key, 256));
        const expected = fromB64url(expectedText);
        if (derived.length !== expected.length) return json({ error: "invalid_credentials" }, 401, headers);
        let diff = 0;
        for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
        if (diff !== 0) return json({ error: "invalid_credentials" }, 401, headers);
        const session = await createSession(env.ADMIN_SESSION_SECRET);
        return json({ ok: true, expires_in: SESSION_SECONDS }, 200, { ...headers, "Set-Cookie": cookieHeader(session, SESSION_SECONDS) });
      } catch (error) {
        // Log only exception metadata; never log request bodies, passwords, or secrets.
        console.error("[ERU Hub API] Admin login failed:", {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
        });
        return json({ error: error.message === "payload_too_large" ? "payload_too_large" : "invalid_request" }, error.message === "payload_too_large" ? 413 : 400, headers);
      }
    }
    if (path === "/api/admin/logout" && request.method === "POST") {
      return json({ ok: true }, 200, { ...headers, "Set-Cookie": cookieHeader("", 0) });
    }
    if (!(await validSession(request, env.ADMIN_SESSION_SECRET))) return json({ error: "unauthorized" }, 401, headers);
    if (path === "/api/admin/me" && request.method === "GET") return json({ ok: true }, 200, headers);

    const match = path.match(/^\/api\/admin\/(courses|rooms|sessions|section-groups)(?:\/([a-zA-Z0-9_-]{1,80}))?$/);
    if (!match) return json({ error: "not_found" }, 404, headers);
    const resource = RESOURCES[match[1]];
    const id = match[2];
    if (!env.DB) return json({ error: "service_unavailable" }, 503, headers);
    try {
      if (request.method === "GET" && !id) {
        const rows = await env.DB.prepare("SELECT * FROM " + resource.table + " ORDER BY " + resource.order).all();
        return json({ data: rows.results ?? [] }, 200, headers);
      }
      if (request.method === "POST" && !id) {
        const body = await readJson(request);
        const error = validateRecord(resource, body, true);
        if (error) return json({ error }, 400, headers);
        const keys = Object.keys(body);
        const record = { id: crypto.randomUUID(), ...body };
        if (!Object.hasOwn(body, "status")) record.status = "draft";
        const insertKeys = Object.keys(record);
        const sql = "INSERT INTO " + resource.table + " (" + insertKeys.join(", ") + ") VALUES (" + insertKeys.map(() => "?").join(", ") + ")";
        await env.DB.prepare(sql).bind(...insertKeys.map(key => record[key])).run();
        return json({ data: record }, 201, headers);
      }
      if (request.method === "PATCH" && id) {
        const body = await readJson(request);
        const error = validateRecord(resource, body, false);
        if (error) return json({ error }, 400, headers);
        const keys = Object.keys(body);
        if (!keys.length) return json({ error: "empty_update" }, 400, headers);
        const result = await env.DB.prepare("UPDATE " + resource.table + " SET " + keys.map(key => key + " = ?").join(", ") + ", updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").bind(...keys.map(key => body[key]), id).run();
        if (!result.meta?.changes) return json({ error: "not_found" }, 404, headers);
        const row = await env.DB.prepare("SELECT * FROM " + resource.table + " WHERE id = ?").bind(id).first();
        return json({ data: row }, 200, headers);
      }
      if (request.method === "DELETE" && id) {
        const result = await env.DB.prepare("DELETE FROM " + resource.table + " WHERE id = ?").bind(id).run();
        if (!result.meta?.changes) return json({ error: "not_found" }, 404, headers);
        return json({ ok: true }, 200, headers);
      }
      return json({ error: "method_not_allowed" }, 405, headers);
    } catch (error) {
      console.error("[ERU Hub API] Admin operation failed:", error);
      if (error.message === "payload_too_large") return json({ error }, 413, headers);
      if (error instanceof SyntaxError) return json({ error: "invalid_json" }, 400, headers);
      if (String(error.message).includes("UNIQUE constraint failed")) return json({ error: "duplicate_record" }, 409, headers);
      if (String(error.message).includes("FOREIGN KEY constraint failed")) return json({ error: "invalid_relation" }, 400, headers);
      return json({ error: "service_unavailable" }, 503, headers);
    }
  },
};
