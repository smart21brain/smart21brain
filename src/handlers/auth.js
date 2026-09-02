import {
  hashPassword, verifyPassword, createSession, sessionCookie, clearSessionCookie,
  getSessionUser, json, badRequest, unauthorized,
} from '../lib/auth.js';

export async function register({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.name || !body.email || !body.password) {
    return badRequest('Name, email and password are required.');
  }
  const email = String(body.email).trim().toLowerCase();
  if (body.password.length < 8) return badRequest('Password must be at least 8 characters.');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return badRequest('An account with that email already exists.');

  const { hash, salt } = await hashPassword(body.password);
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)'
  ).bind(String(body.name).trim(), email, hash, salt, 'user').run();

  const userId = result.meta.last_row_id;
  const { token, expires } = await createSession(env.DB, userId);

  return json(
    { user: { id: userId, name: body.name, email, role: 'user' } },
    { status: 201, headers: { 'Set-Cookie': sessionCookie(token, expires) } }
  );
}

export async function login({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) return badRequest('Email and password are required.');
  const email = String(body.email).trim().toLowerCase();

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) return unauthorized('Incorrect email or password.');

  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return unauthorized('Incorrect email or password.');

  const { token, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    'INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)'
  ).bind(
    user.id,
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null,
    request.headers.get('User-Agent') || null
  ).run();

  return json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_key: user.avatar_key } },
    { headers: { 'Set-Cookie': sessionCookie(token, expires) } }
  );
}

export async function logout({ request, env }) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}

export async function me({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  return json({ user: user || null });
}
