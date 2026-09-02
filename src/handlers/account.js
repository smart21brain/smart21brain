import { getSessionUser, hashPassword, verifyPassword, json, badRequest, unauthorized } from '../lib/auth.js';

async function currentUser(request, env) {
  return getSessionUser(request, env.DB);
}

export async function updateProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return badRequest('Name and a valid email are required.');
  const duplicate = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND id != ?').bind(email, user.id).first();
  if (duplicate) return badRequest('That email address is already in use.');
  await env.DB.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').bind(name, email, user.id).run();
  return json({ user: { ...user, name, email } });
}

export async function updatePassword({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body?.currentPassword || typeof body.newPassword !== 'string' || body.newPassword.length < 8) {
    return badRequest('Current password and a new password of at least 8 characters are required.');
  }
  const stored = await env.DB.prepare('SELECT password_hash, password_salt FROM users WHERE id = ?').bind(user.id).first();
  if (!stored || !(await verifyPassword(body.currentPassword, stored.password_hash, stored.password_salt))) {
    return badRequest('Current password is incorrect.');
  }
  const { hash, salt } = await hashPassword(body.newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?').bind(hash, salt, user.id).run();
  return json({ updated: true });
}

export async function getProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  return json({ user });
}