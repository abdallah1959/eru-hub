const ALLOWED_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const PUBLIC_PATHS = new Set([
  "/api/courses",
  "/api/sessions",
  "/api/rooms",
  "/api/section-groups",
]);

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  };
  if (origin && env.SITE_ORIGIN && origin === env.SITE_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function isSafeOrigin(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || (Boolean(env.SITE_ORIGIN) && origin === env.SITE_ORIGIN);
}

async function getPublicData(path, db) {
  if (!db) throw new Error("D1 binding is not configured");
  switch (path) {
    case "/api/courses":
      return db.prepare("SELECT id, code, name_ar, name_en, instructor, description_ar, description_en, resource_url FROM courses WHERE status = 'published' ORDER BY code").all();
    case "/api/rooms":
      return db.prepare("SELECT id, building, floor, room_code, name_ar, name_en, description_ar, description_en FROM rooms WHERE status = 'published' ORDER BY building, room_code").all();
    case "/api/sessions":
      return db.prepare("SELECT s.id, s.course_id, c.code AS course_code, c.name_ar AS course_name_ar, c.name_en AS course_name_en, s.day_of_week, s.start_time, s.end_time, s.session_type, s.section_code, s.room_id, r.room_code, r.building, r.floor, s.instructor FROM sessions s JOIN courses c ON c.id = s.course_id LEFT JOIN rooms r ON r.id = s.room_id AND r.status = 'published' WHERE s.status = 'published' AND c.status = 'published' ORDER BY s.day_of_week, s.start_time").all();
    case "/api/section-groups":
      return db.prepare("SELECT g.id, g.course_id, c.code AS course_code, g.section_code, g.group_url FROM section_groups g LEFT JOIN courses c ON c.id = g.course_id AND c.status = 'published' WHERE g.status = 'published' ORDER BY g.section_code, c.code").all();
    default:
      return null;
  }
}

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request, env);
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "OPTIONS") {
      if (!isSafeOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403, headers);
      return new Response(null, { status: 204, headers });
    }
    if (path === "/api/health" && request.method === "GET") {
      return json({ ok: true }, 200, headers);
    }
    if (PUBLIC_PATHS.has(path) && request.method === "GET") {
      if (!isSafeOrigin(request, env)) return json({ error: "origin_not_allowed" }, 403, headers);
      try {
        const result = await getPublicData(path, env.DB);
        return json({ data: result.results ?? [] }, 200, headers);
      } catch (error) {
        console.error("[ERU Hub API] Public read failed:", error);
        return json({ error: "service_unavailable" }, 503, headers);
      }
    }
    if (path.startsWith("/api/admin")) {
      // Fail closed until authentication and server-side authorization are implemented.
      return json({ error: "admin_api_not_configured" }, 503, headers);
    }
    return json({ error: "not_found" }, 404, headers);
  },
};
