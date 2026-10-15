import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import worker from "../src/index.js";

globalThis.crypto ??= webcrypto;

function request(path, options = {}) {
  return new Request("https://api.example.test" + path, options);
}
const ORIGIN = "https://abdallah1959.github.io";
function env(overrides = {}) {
  return { SITE_ORIGIN: ORIGIN, ADMIN_PASSWORD_HASH: "c2FsdA$100000$invalid", ADMIN_SESSION_SECRET: "test-session-secret-long-enough", ...overrides };
}
function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function passwordHash(password, salt = new TextEncoder().encode("test-salt")) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const digest = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256));
  return b64url(salt) + "$100000$" + b64url(digest);
}
function withOrigin(extra = {}) {
  return { Origin: ORIGIN, ...extra };
}

test("health endpoint returns only a generic status", async () => {
  const response = await worker.fetch(request("/api/health"), env());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("unknown routes return 404", async () => {
  const response = await worker.fetch(request("/unknown"), env());
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not_found" });
});

test("admin API fails closed when required secrets or database are absent", async () => {
  const response = await worker.fetch(request("/api/admin/login", { method: "POST", headers: withOrigin({ "Content-Type": "application/json" }), body: JSON.stringify({ password: "x" }) }), { SITE_ORIGIN: ORIGIN });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "admin_not_configured" });
});

test("public endpoints reject disallowed origins", async () => {
  const response = await worker.fetch(request("/api/courses", { headers: { Origin: "https://evil.example" } }), env({ DB: {} }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "origin_not_allowed" });
});

test("public endpoint returns only rows returned by published-only SQL", async () => {
  const statements = [];
  const DB = { prepare(sql) { statements.push(sql); return { async all() { return { results: [{ id: "c1", code: "CS101" }] }; } }; } };
  const response = await worker.fetch(request("/api/courses", { headers: withOrigin() }), env({ DB }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [{ id: "c1", code: "CS101" }] });
  assert.match(statements[0], /status = 'published'/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
});

test("public endpoint fails safely when D1 is not configured", async () => {
  const response = await worker.fetch(request("/api/rooms", { headers: withOrigin() }), env({ DB: undefined }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "service_unavailable" });
});

test("admin endpoints require a signed session before listing or mutation", async () => {
  const response = await worker.fetch(request("/api/admin/courses", { headers: withOrigin() }), env({ DB: {} }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("login rejects wrong password and sets secure cookie on success", async () => {
  const goodEnv = env({ ADMIN_PASSWORD_HASH: await passwordHash("correct horse battery") , DB: {} });
  const wrong = await worker.fetch(request("/api/admin/login", { method: "POST", headers: withOrigin({ "Content-Type": "application/json" }), body: JSON.stringify({ password: "wrong" }) }), goodEnv);
  assert.equal(wrong.status, 401);
  assert.deepEqual(await wrong.json(), { error: "invalid_credentials" });

  const success = await worker.fetch(request("/api/admin/login", { method: "POST", headers: withOrigin({ "Content-Type": "application/json" }), body: JSON.stringify({ password: "correct horse battery" }) }), goodEnv);
  assert.equal(success.status, 200);
  const cookie = success.headers.get("Set-Cookie");
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=None/);
  assert.match(cookie, /Path=\/api\/admin/);
});

test("admin CRUD validates input and uses prepared bindings", async () => {
  let inserted;
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async run() { inserted = { sql, values }; return { meta: { changes: 1 } }; },
            async all() { return { results: [] }; },
            async first() { return { id: values.at(-1), code: "CS101", name_ar: "مقدمة" }; }
          };
        },
        async all() { return { results: [] }; }
      };
    }
  };
  const session = "placeholder";
  const login = await worker.fetch(request("/api/admin/login", { method: "POST", headers: withOrigin({ "Content-Type": "application/json" }), body: JSON.stringify({ password: "correct horse battery" }) }), env({ ADMIN_PASSWORD_HASH: await passwordHash("correct horse battery"), DB }));
  const cookie = login.headers.get("Set-Cookie").split(";")[0];
  const invalid = await worker.fetch(request("/api/admin/courses", { method: "POST", headers: withOrigin({ Cookie: cookie, "Content-Type": "application/json" }), body: JSON.stringify({ code: "CS101", name_ar: "Course", status: "magic" }) }), env({ ADMIN_PASSWORD_HASH: await passwordHash("correct horse battery"), DB }));
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { error: "invalid_status" });

  const created = await worker.fetch(request("/api/admin/courses", { method: "POST", headers: withOrigin({ Cookie: cookie, "Content-Type": "application/json" }), body: JSON.stringify({ code: "CS101", name_ar: "مقدمة" }) }), env({ ADMIN_PASSWORD_HASH: await passwordHash("correct horse battery"), DB }));
  assert.equal(created.status, 201);
  assert.equal(inserted.sql.startsWith("INSERT INTO courses"), true);
  assert.equal(inserted.values.includes("published"), false);
  assert.equal(inserted.values.includes("draft"), true);
});

test("logout clears the session cookie", async () => {
  const response = await worker.fetch(request("/api/admin/logout", { method: "POST", headers: withOrigin() }), env({ DB: {} }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
});
