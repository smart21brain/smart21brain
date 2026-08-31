var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/auth.js
var PBKDF2_ITERATIONS = 1e5;
var SESSION_DAYS = 30;
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
__name(fromHex, "fromHex");
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === hashHex;
}
__name(verifyPassword, "verifyPassword");
function randomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
__name(randomToken, "randomToken");
async function createSession(db, userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1e3).toISOString();
  await db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expires).run();
  return { token, expires };
}
__name(createSession, "createSession");
function sessionCookie(token, expires) {
  const expiresStr = new Date(expires).toUTCString();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresStr}`;
}
__name(sessionCookie, "sessionCookie");
function clearSessionCookie() {
  return "s21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
__name(clearSessionCookie, "clearSessionCookie");
function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match2 = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match2 ? match2[1] : null;
}
__name(getCookie, "getCookie");
async function getSessionUser(request, db) {
  const token = getCookie(request, "s21_session");
  if (!token) return null;
  const session = await db.prepare(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return null;
  const user = await db.prepare(
    "SELECT id, name, email, role, avatar_key, created_at FROM users WHERE id = ?"
  ).bind(session.user_id).first();
  return user || null;
}
__name(getSessionUser, "getSessionUser");
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers || {} }
  });
}
__name(json, "json");
function badRequest(message) {
  return json({ error: message }, { status: 400 });
}
__name(badRequest, "badRequest");
function unauthorized(message = "Not signed in") {
  return json({ error: message }, { status: 401 });
}
__name(unauthorized, "unauthorized");
function forbidden(message = "Admins only") {
  return json({ error: message }, { status: 403 });
}
__name(forbidden, "forbidden");
function notFound(message = "Not found") {
  return json({ error: message }, { status: 404 });
}
__name(notFound, "notFound");
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `item-${Date.now()}`;
}
__name(slugify, "slugify");

// api/games/[id]/score.js
async function onRequestPost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isFinite(score)) return badRequest("A numeric score is required.");
  await env.DB.prepare(
    "INSERT INTO game_scores (user_id, game_id, score) VALUES (?, ?, ?)"
  ).bind(user.id, params.id, score).run();
  return json({ ok: true }, { status: 201 });
}
__name(onRequestPost, "onRequestPost");

// api/quizzes/[id]/attempt.js
async function onRequestPost2({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const quiz = await env.DB.prepare("SELECT questions FROM quizzes WHERE id = ?").bind(params.id).first();
  if (!quiz) return notFound();
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.answers)) return badRequest("answers[] is required.");
  const questions = JSON.parse(quiz.questions);
  let score = 0;
  questions.forEach((q, i) => {
    if (body.answers[i] === q.correct_index) score++;
  });
  await env.DB.prepare(
    "INSERT INTO quiz_attempts (user_id, quiz_id, score, total) VALUES (?, ?, ?, ?)"
  ).bind(user.id, params.id, score, questions.length).run();
  return json({ score, total: questions.length }, { status: 201 });
}
__name(onRequestPost2, "onRequestPost");

// api/auth/login.js
async function onRequestPost3({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) {
    return badRequest("Email and password are required.");
  }
  const email = String(body.email).trim().toLowerCase();
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return unauthorized("Incorrect email or password.");
  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return unauthorized("Incorrect email or password.");
  const { token, expires } = await createSession(env.DB, user.id);
  return json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_key: user.avatar_key } },
    { headers: { "Set-Cookie": sessionCookie(token, expires) } }
  );
}
__name(onRequestPost3, "onRequestPost");

// api/auth/logout.js
async function onRequestPost4({ request, env }) {
  const header = request.headers.get("Cookie") || "";
  const match2 = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match2) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match2[1]).run();
  }
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
__name(onRequestPost4, "onRequestPost");

// api/auth/me.js
async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return json({ user: null });
  return json({ user });
}
__name(onRequestGet, "onRequestGet");

// api/auth/register.js
async function onRequestPost5({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.email || !body.password) {
    return badRequest("Name, email and password are required.");
  }
  const email = String(body.email).trim().toLowerCase();
  if (body.password.length < 8) {
    return badRequest("Password must be at least 8 characters.");
  }
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return badRequest("An account with that email already exists.");
  const { hash, salt } = await hashPassword(body.password);
  const result = await env.DB.prepare(
    "INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)"
  ).bind(String(body.name).trim(), email, hash, salt, "user").run();
  const userId = result.meta.last_row_id;
  const { token, expires } = await createSession(env.DB, userId);
  return json(
    { user: { id: userId, name: body.name, email, role: "user" } },
    { status: 201, headers: { "Set-Cookie": sessionCookie(token, expires) } }
  );
}
__name(onRequestPost5, "onRequestPost");

// api/blog/[slug].js
async function onRequestGet2({ params, env }) {
  const post = await env.DB.prepare("SELECT * FROM blog_posts WHERE slug = ?").bind(params.slug).first();
  if (!post) return notFound();
  return json({ post });
}
__name(onRequestGet2, "onRequestGet");
async function onRequestPut({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE blog_posts SET title = ?, excerpt = ?, content = ?, cover_key = ?, published = ? WHERE slug = ?`
  ).bind(
    body.title,
    body.excerpt || null,
    body.content,
    body.cover_key || null,
    body.published === false ? 0 : 1,
    params.slug
  ).run();
  return json({ ok: true });
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM blog_posts WHERE slug = ?").bind(params.slug).run();
  return json({ ok: true });
}
__name(onRequestDelete, "onRequestDelete");

// api/games/[id].js
async function onRequestGet3({ params, env }) {
  const game = await env.DB.prepare("SELECT * FROM games WHERE id = ?").bind(params.id).first();
  if (!game) return notFound();
  return json({ game });
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPut2({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE games SET title = ?, subject = ?, description = ?, emoji = ?, published = ? WHERE id = ?`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    body.emoji || "\u{1F3AE}",
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(onRequestPut2, "onRequestPut");
async function onRequestDelete2({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM games WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(onRequestDelete2, "onRequestDelete");

// api/materials/[id].js
async function onRequestGet4({ params, env }) {
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(params.id).first();
  if (!material) return notFound();
  const object = await env.MATERIALS.get(material.file_key);
  if (!object) return notFound("File missing from storage.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `inline; filename="${material.title}"`);
  return new Response(object.body, { headers });
}
__name(onRequestGet4, "onRequestGet");
async function onRequestDelete3({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(params.id).first();
  if (!material) return notFound();
  await env.MATERIALS.delete(material.file_key);
  await env.DB.prepare("DELETE FROM materials WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(onRequestDelete3, "onRequestDelete");

// api/quizzes/[id].js
async function onRequestGet5({ params, env }) {
  const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(params.id).first();
  if (!quiz) return notFound();
  quiz.questions = JSON.parse(quiz.questions);
  return json({ quiz });
}
__name(onRequestGet5, "onRequestGet");
async function onRequestPut3({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE quizzes SET title = ?, subject = ?, description = ?, questions = ?, published = ? WHERE id = ?`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    JSON.stringify(body.questions || []),
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(onRequestPut3, "onRequestPut");
async function onRequestDelete4({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM quizzes WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(onRequestDelete4, "onRequestDelete");

// api/blog/index.js
async function onRequestGet6({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, slug, excerpt, cover_key, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ posts: results });
}
__name(onRequestGet6, "onRequestGet");
async function onRequestPost6({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.content) return badRequest("Title and content are required.");
  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO blog_posts (title, slug, excerpt, content, cover_key, published, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    slug,
    body.excerpt || null,
    body.content,
    body.cover_key || null,
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(onRequestPost6, "onRequestPost");

// api/dashboard.js
async function onRequestGet7({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const [quizStats, gameStats, recentQuizzes, recentGames] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(*) AS attempts, COALESCE(AVG(score * 1.0 / NULLIF(total, 0)), 0) AS avg_ratio FROM quiz_attempts WHERE user_id = ?"
    ).bind(user.id).first(),
    env.DB.prepare(
      "SELECT COUNT(*) AS plays, COALESCE(MAX(score), 0) AS best_score FROM game_scores WHERE user_id = ?"
    ).bind(user.id).first(),
    env.DB.prepare(
      `SELECT qa.score, qa.total, qa.completed_at, q.title
       FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? ORDER BY qa.completed_at DESC LIMIT 5`
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT gs.score, gs.played_at, g.title
       FROM game_scores gs JOIN games g ON g.id = gs.game_id
       WHERE gs.user_id = ? ORDER BY gs.played_at DESC LIMIT 5`
    ).bind(user.id).all()
  ]);
  return json({
    user,
    quiz_attempts: quizStats.attempts,
    quiz_avg_percent: Math.round((quizStats.avg_ratio || 0) * 100),
    games_played: gameStats.plays,
    best_game_score: gameStats.best_score,
    recent_quizzes: recentQuizzes.results,
    recent_games: recentGames.results
  });
}
__name(onRequestGet7, "onRequestGet");

// api/games/index.js
async function onRequestGet8({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM games WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ games: results });
}
__name(onRequestGet8, "onRequestGet");
async function onRequestPost7({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest("Title is required.");
  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO games (title, slug, subject, description, emoji, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    slug,
    body.subject || null,
    body.description || null,
    body.emoji || "\u{1F3AE}",
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(onRequestPost7, "onRequestPost");

// api/materials/index.js
async function onRequestGet9({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, subject, file_type, file_size, created_at FROM materials ORDER BY created_at DESC"
  ).all();
  return json({ materials: results });
}
__name(onRequestGet9, "onRequestGet");
async function onRequestPost8({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const title = form?.get("title");
  if (!form || !file || typeof file === "string" || !title) {
    return badRequest("title and file are required (multipart/form-data).");
  }
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return badRequest("Only PDF or image files (png/jpg/webp/gif) are allowed.");
  }
  const MAX_BYTES = 25 * 1024 * 1024;
  if (file.size > MAX_BYTES) return badRequest("File is too large (25MB max).");
  const key = `materials/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  await env.MATERIALS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });
  const fileType = file.type === "application/pdf" ? "pdf" : "image";
  const result = await env.DB.prepare(
    `INSERT INTO materials (title, subject, file_key, file_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(title, form.get("subject") || null, key, fileType, file.size, user.id).run();
  return json({ id: result.meta.last_row_id, file_key: key }, { status: 201 });
}
__name(onRequestPost8, "onRequestPost");

// api/quizzes/index.js
async function onRequestGet10({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, subject, description, published, created_at FROM quizzes WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ quizzes: results });
}
__name(onRequestGet10, "onRequestGet");
async function onRequestPost9({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return badRequest("Title and at least one question are required.");
  }
  for (const q of body.questions) {
    if (!q.prompt || !Array.isArray(q.options) || typeof q.correct_index !== "number") {
      return badRequest("Each question needs a prompt, options[], and correct_index.");
    }
  }
  const result = await env.DB.prepare(
    `INSERT INTO quizzes (title, subject, description, questions, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    JSON.stringify(body.questions),
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(onRequestPost9, "onRequestPost");

// ../.wrangler/tmp/pages-5sTnNM/functionsRoutes-0.4006990057230424.mjs
var routes = [
  {
    routePath: "/api/games/:id/score",
    mountPath: "/api/games/:id",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/quizzes/:id/attempt",
    mountPath: "/api/quizzes/:id",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/auth/register",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/blog/:slug",
    mountPath: "/api/blog",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/blog/:slug",
    mountPath: "/api/blog",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/blog/:slug",
    mountPath: "/api/blog",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/games/:id",
    mountPath: "/api/games",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/games/:id",
    mountPath: "/api/games",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/games/:id",
    mountPath: "/api/games",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/materials/:id",
    mountPath: "/api/materials",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/materials/:id",
    mountPath: "/api/materials",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/quizzes/:id",
    mountPath: "/api/quizzes",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete4]
  },
  {
    routePath: "/api/quizzes/:id",
    mountPath: "/api/quizzes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/quizzes/:id",
    mountPath: "/api/quizzes",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut3]
  },
  {
    routePath: "/api/blog",
    mountPath: "/api/blog",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/blog",
    mountPath: "/api/blog",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/dashboard",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/games",
    mountPath: "/api/games",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/games",
    mountPath: "/api/games",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/materials",
    mountPath: "/api/materials",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/materials",
    mountPath: "/api/materials",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/quizzes",
    mountPath: "/api/quizzes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/quizzes",
    mountPath: "/api/quizzes",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  }
];

// ../../../../../AppData/Roaming/npm/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../AppData/Roaming/npm/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
