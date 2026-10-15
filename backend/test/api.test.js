import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

function request(path, options = {}) {
  return new Request("https://api.example.test" + path, options);
}

function env(overrides = {}) {
  return { SITE_ORIGIN: "https://abdallah1959.github.io", ...overrides };
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

test("admin routes fail closed until authentication exists", async () => {
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    const response = await worker.fetch(request("/api/admin/courses", { method }), env());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "admin_api_not_configured" });
  }
});

test("public endpoints reject disallowed origins", async () => {
  const response = await worker.fetch(request("/api/courses", {
    headers: { Origin: "https://evil.example" }
  }), env({ DB: {} }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "origin_not_allowed" });
});

test("public endpoint returns only rows returned by published-only SQL", async () => {
  const statements = [];
  const DB = {
    prepare(sql) {
      statements.push(sql);
      return { async all() { return { results: [{ id: "c1", code: "CS101" }] }; } };
    }
  };
  const response = await worker.fetch(request("/api/courses", {
    headers: { Origin: "https://abdallah1959.github.io" }
  }), env({ DB }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: [{ id: "c1", code: "CS101" }] });
  assert.match(statements[0], /status = 'published'/);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://abdallah1959.github.io");
});

test("public endpoint fails safely when D1 is not configured", async () => {
  const response = await worker.fetch(request("/api/rooms"), env());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "service_unavailable" });
});
