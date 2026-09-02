var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/router.js
var Router = class {
  static {
    __name(this, "Router");
  }
  constructor() {
    this.routes = [];
  }
  add(method, path, handler) {
    const keys = [];
    const pattern = new RegExp(
      "^" + path.split("/").map((seg) => {
        if (seg.startsWith(":")) {
          keys.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("/") + "$"
    );
    this.routes.push({ method, pattern, keys, handler });
    return this;
  }
  get(path, handler) {
    return this.add("GET", path, handler);
  }
  post(path, handler) {
    return this.add("POST", path, handler);
  }
  put(path, handler) {
    return this.add("PUT", path, handler);
  }
  delete(path, handler) {
    return this.add("DELETE", path, handler);
  }
  // Returns a Response, or null if no route matched (caller should fall
  // through to static asset serving / 404).
  async handle(request, env, ctx) {
    const url = new URL(request.url);
    for (const route of this.routes) {
      if (route.method !== request.method) continue;
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });
      return route.handler({ request, env, ctx, params, url });
    }
    return null;
  }
};

// src/lib/auth.js
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
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
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

// src/handlers/auth.js
async function register({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.email || !body.password) {
    return badRequest("Name, email and password are required.");
  }
  const email = String(body.email).trim().toLowerCase();
  if (body.password.length < 8) return badRequest("Password must be at least 8 characters.");
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
__name(register, "register");
async function login({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) return badRequest("Email and password are required.");
  const email = String(body.email).trim().toLowerCase();
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return unauthorized("Incorrect email or password.");
  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return unauthorized("Incorrect email or password.");
  const { token, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    "INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)"
  ).bind(
    user.id,
    request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null,
    request.headers.get("User-Agent") || null
  ).run();
  return json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_key: user.avatar_key } },
    { headers: { "Set-Cookie": sessionCookie(token, expires) } }
  );
}
__name(login, "login");
async function logout({ request, env }) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match[1]).run();
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
__name(logout, "logout");
async function me({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  return json({ user: user || null });
}
__name(me, "me");

// src/handlers/games.js
async function listGames({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM games WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ games: results });
}
__name(listGames, "listGames");
async function createGame({ request, env }) {
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
__name(createGame, "createGame");
async function getGame({ params, env }) {
  const game = await env.DB.prepare("SELECT * FROM games WHERE id = ?").bind(params.id).first();
  if (!game) return notFound();
  return json({ game });
}
__name(getGame, "getGame");
async function updateGame({ request, params, env }) {
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
__name(updateGame, "updateGame");
async function deleteGame({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM games WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteGame, "deleteGame");
async function submitGameScore({ request, params, env }) {
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
__name(submitGameScore, "submitGameScore");

// src/handlers/quizzes.js
async function listQuizzes({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, subject, description, published, created_at FROM quizzes WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ quizzes: results });
}
__name(listQuizzes, "listQuizzes");
async function createQuiz({ request, env }) {
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
__name(createQuiz, "createQuiz");
async function getQuiz({ params, env }) {
  const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(params.id).first();
  if (!quiz) return notFound();
  quiz.questions = JSON.parse(quiz.questions);
  return json({ quiz });
}
__name(getQuiz, "getQuiz");
async function updateQuiz({ request, params, env }) {
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
__name(updateQuiz, "updateQuiz");
async function deleteQuiz({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM quizzes WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteQuiz, "deleteQuiz");
async function submitQuizAttempt({ request, params, env }) {
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
__name(submitQuizAttempt, "submitQuizAttempt");

// src/handlers/blog.js
async function listPosts({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, slug, excerpt, cover_key, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ posts: results });
}
__name(listPosts, "listPosts");
async function createPost({ request, env }) {
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
__name(createPost, "createPost");
async function getPost({ params, env }) {
  const post = await env.DB.prepare("SELECT * FROM blog_posts WHERE slug = ?").bind(params.slug).first();
  if (!post) return notFound();
  return json({ post });
}
__name(getPost, "getPost");
async function updatePost({ request, params, env }) {
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
__name(updatePost, "updatePost");
async function deletePost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM blog_posts WHERE slug = ?").bind(params.slug).run();
  return json({ ok: true });
}
__name(deletePost, "deletePost");

// src/handlers/materials.js
async function listMaterials({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, subject, file_type, file_size, created_at FROM materials ORDER BY created_at DESC"
  ).all();
  return json({ materials: results });
}
__name(listMaterials, "listMaterials");
async function uploadMaterial({ request, env }) {
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
__name(uploadMaterial, "uploadMaterial");
async function getMaterial({ params, env }) {
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(params.id).first();
  if (!material) return notFound();
  const object = await env.MATERIALS.get(material.file_key);
  if (!object) return notFound("File missing from storage.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `inline; filename="${material.title}"`);
  return new Response(object.body, { headers });
}
__name(getMaterial, "getMaterial");
async function deleteMaterial({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(params.id).first();
  if (!material) return notFound();
  await env.MATERIALS.delete(material.file_key);
  await env.DB.prepare("DELETE FROM materials WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteMaterial, "deleteMaterial");

// src/handlers/dashboard.js
async function getDashboard({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const [quizStats, gameStats, recentQuizzes, recentGames, recentActivity] = await Promise.all([
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
      "SELECT game_key AS title, score, played_at FROM game_activity WHERE user_id = ? ORDER BY played_at DESC LIMIT 5"
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
    recent_games: [...recentGames.results, ...recentActivity.results]
  });
}
__name(getDashboard, "getDashboard");

// src/handlers/newsletter.js
async function subscribe({ request, env }) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid email address is required.");
  }
  await env.DB.prepare(
    "INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)"
  ).bind(email).run();
  return json({ subscribed: true });
}
__name(subscribe, "subscribe");

// src/handlers/contact.js
async function sendMessage({ request, env }) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !subject || !message) {
    return badRequest("Name, valid email, subject, and message are required.");
  }
  await env.DB.prepare(
    "INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, email, body.phone?.trim() || null, subject, message).run();
  return json({ sent: true }, { status: 201 });
}
__name(sendMessage, "sendMessage");
async function listMessages({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { results } = await env.DB.prepare(
    "SELECT id, name, email, phone, subject, message, status, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100"
  ).all();
  return json({ messages: results });
}
__name(listMessages, "listMessages");
async function listSubscribers({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { results } = await env.DB.prepare(
    "SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 1000"
  ).all();
  return json({ subscribers: results });
}
__name(listSubscribers, "listSubscribers");

// src/handlers/search.js
async function search({ url, env }) {
  const query = (url.searchParams.get("q") || "").trim();
  if (query.length < 2) return badRequest("Search query must contain at least 2 characters.");
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const [games, quizzes, posts, materials] = await Promise.all([
    env.DB.prepare("SELECT id, title, subject AS detail, 'Game' AS type FROM games WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT id, title, subject AS detail, 'Quiz' AS type FROM quizzes WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT slug AS id, title, excerpt AS detail, 'Blog' AS type FROM blog_posts WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT id, title, subject AS detail, 'Material' AS type FROM materials WHERE title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\' LIMIT 8").bind(pattern, pattern).all()
  ]);
  const results = [
    ...games.results.map((item) => ({ ...item, href: `game.html?id=${item.id}` })),
    ...quizzes.results.map((item) => ({ ...item, href: `quiz.html?id=${item.id}` })),
    ...posts.results.map((item) => ({ ...item, href: `blog-post.html?slug=${encodeURIComponent(item.id)}` })),
    ...materials.results.map((item) => ({ ...item, href: `library.html?id=${item.id}` }))
  ];
  return json({ results });
}
__name(search, "search");

// src/handlers/assistant.js
async function ask({ request, env }) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 1e3) return badRequest("A question up to 1,000 characters is required.");
  if (!env.AI || typeof env.AI.run !== "function") return json({ error: "AI service is not configured." }, { status: 503 });
  const result = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: "You are Smart21Brain Study Buddy. Give concise, age-appropriate educational help. Do not claim to replace a teacher." },
      { role: "user", content: prompt }
    ]
  });
  return json({ answer: result.response || "I could not generate an answer right now." });
}
__name(ask, "ask");

// src/handlers/account.js
async function currentUser(request, env) {
  return getSessionUser(request, env.DB);
}
__name(currentUser, "currentUser");
async function updateProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return badRequest("Name and a valid email are required.");
  const duplicate = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND id != ?").bind(email, user.id).first();
  if (duplicate) return badRequest("That email address is already in use.");
  await env.DB.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").bind(name, email, user.id).run();
  return json({ user: { ...user, name, email } });
}
__name(updateProfile, "updateProfile");
async function updatePassword({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body?.currentPassword || typeof body.newPassword !== "string" || body.newPassword.length < 8) {
    return badRequest("Current password and a new password of at least 8 characters are required.");
  }
  const stored = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?").bind(user.id).first();
  if (!stored || !await verifyPassword(body.currentPassword, stored.password_hash, stored.password_salt)) {
    return badRequest("Current password is incorrect.");
  }
  const { hash, salt } = await hashPassword(body.newPassword);
  await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, user.id).run();
  return json({ updated: true });
}
__name(updatePassword, "updatePassword");
async function getProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  return json({ user });
}
__name(getProfile, "getProfile");

// src/handlers/activity.js
async function submitGameScore2({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const gameKey = typeof body?.gameKey === "string" ? body.gameKey.trim().slice(0, 80) : "";
  const score = Number(body?.score);
  if (!gameKey || !Number.isFinite(score) || score < 0) return badRequest("A game key and non-negative score are required.");
  await env.DB.prepare(
    "INSERT INTO game_activity (user_id, game_key, score, details) VALUES (?, ?, ?, ?)"
  ).bind(user.id, gameKey, score, JSON.stringify(body.details || {})).run();
  return json({ recorded: true }, { status: 201 });
}
__name(submitGameScore2, "submitGameScore");

// src/handlers/google.js
var cachedKeys = null;
var cachedKeysExpires = 0;
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
__name(decodeBase64Url, "decodeBase64Url");
async function googleClaims(token, clientId) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (header.alg !== "RS256" || !header.kid || !payload.sub || payload.iss !== "https://accounts.google.com" || payload.aud !== clientId) return null;
  if (!payload.email || payload.email_verified !== true || payload.exp * 1e3 <= Date.now()) return null;
  if (!cachedKeys || cachedKeysExpires < Date.now()) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) return null;
    cachedKeys = await response.json();
    cachedKeysExpires = Date.now() + 60 * 60 * 1e3;
  }
  const jwk = cachedKeys.keys.find((key) => key.kid === header.kid);
  if (!jwk) return null;
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  return valid ? payload : null;
}
__name(googleClaims, "googleClaims");
async function config({ env }) {
  return json({ clientId: env.GOOGLE_CLIENT_ID || "" });
}
__name(config, "config");
async function signIn({ request, env }) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.credential === "string" ? body.credential : "";
  const clientId = env.GOOGLE_CLIENT_ID || "";
  if (!token || !clientId) return badRequest("Google sign-in is not configured.");
  let claims;
  try {
    claims = await googleClaims(token, clientId);
  } catch (error) {
    claims = null;
  }
  if (!claims) return unauthorized("Google sign-in could not be verified.");
  let account = await env.DB.prepare(
    "SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_sub = ?"
  ).bind("google", claims.sub).first();
  let isNewUser = false;
  let user;
  if (account) {
    user = await env.DB.prepare("SELECT id, name, email, role, avatar_key FROM users WHERE id = ?").bind(account.user_id).first();
  } else {
    user = await env.DB.prepare("SELECT id, name, email, role, avatar_key FROM users WHERE email = ?").bind(claims.email.toLowerCase()).first();
    if (!user) {
      const randomPassword = crypto.randomUUID();
      const { hash, salt } = await hashPassword(randomPassword);
      const result = await env.DB.prepare(
        "INSERT INTO users (name, email, password_hash, password_salt, role, avatar_key) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(claims.name || claims.email.split("@")[0], claims.email.toLowerCase(), hash, salt, "user", claims.picture || null).run();
      user = { id: result.meta.last_row_id, name: claims.name || claims.email.split("@")[0], email: claims.email.toLowerCase(), role: "user", avatar_key: claims.picture || null };
      isNewUser = true;
    }
    await env.DB.prepare(
      "INSERT INTO oauth_accounts (user_id, provider, provider_sub) VALUES (?, ?, ?)"
    ).bind(user.id, "google", claims.sub).run();
  }
  const { token: sessionToken, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    "INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)"
  ).bind(user.id, request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null, request.headers.get("User-Agent") || null).run();
  return json({ user, isNewUser }, { headers: { "Set-Cookie": sessionCookie(sessionToken, expires) } });
}
__name(signIn, "signIn");

// src/index.js
var router = new Router();
router.post("/api/auth/register", register);
router.post("/api/auth/login", login);
router.post("/api/auth/logout", logout);
router.get("/api/auth/me", me);
router.post("/api/newsletter/subscribe", subscribe);
router.post("/api/contact", sendMessage);
router.get("/api/contact", listMessages);
router.get("/api/newsletter/subscribers", listSubscribers);
router.get("/api/search", search);
router.post("/api/ai-assistant", ask);
router.put("/api/account/profile", updateProfile);
router.get("/api/account/profile", getProfile);
router.put("/api/account/password", updatePassword);
router.post("/api/activity/game-score", submitGameScore2);
router.get("/api/auth/google/config", config);
router.post("/api/auth/google", signIn);
router.get("/api/games", listGames);
router.post("/api/games", createGame);
router.get("/api/games/:id", getGame);
router.put("/api/games/:id", updateGame);
router.delete("/api/games/:id", deleteGame);
router.post("/api/games/:id/score", submitGameScore);
router.get("/api/quizzes", listQuizzes);
router.post("/api/quizzes", createQuiz);
router.get("/api/quizzes/:id", getQuiz);
router.put("/api/quizzes/:id", updateQuiz);
router.delete("/api/quizzes/:id", deleteQuiz);
router.post("/api/quizzes/:id/attempt", submitQuizAttempt);
router.get("/api/blog", listPosts);
router.post("/api/blog", createPost);
router.get("/api/blog/:slug", getPost);
router.put("/api/blog/:slug", updatePost);
router.delete("/api/blog/:slug", deletePost);
router.get("/api/materials", listMaterials);
router.post("/api/materials", uploadMaterial);
router.get("/api/materials/:id", getMaterial);
router.delete("/api/materials/:id", deleteMaterial);
router.get("/api/dashboard", getDashboard);
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    const protectedPages = {
      "/dashboard.html": ["user", "admin", "teacher", "parent"],
      "/dashboard": ["user", "admin", "teacher", "parent"],
      "/admin.html": ["admin"],
      "/admin": ["admin"],
      "/teachers.html": ["teacher", "admin"],
      "/teachers": ["teacher", "admin"],
      "/parents.html": ["parent", "admin"],
      "/parents": ["parent", "admin"],
      "/profile.html": ["user", "admin", "teacher", "parent"],
      "/profile": ["user", "admin", "teacher", "parent"]
    };
    const allowedRoles = protectedPages[normalizedPath];
    if (allowedRoles) {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        return Response.redirect(new URL("/login.html", request.url), 302);
      }
      if (!allowedRoles.includes(user.role)) {
        return Response.redirect(new URL("/dashboard.html", request.url), 302);
      }
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await router.handle(request, env, ctx);
        if (response) return response;
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Server error", detail: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
