-- Smart21Brain — D1 schema
-- Apply with: wrangler d1 execute smart21brain-db --file=./schema.sql (add --remote for production)

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Accounts & sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  avatar_key    TEXT,                            -- R2 object key
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  logged_in_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  provider_sub  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_sub)
);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

-- ---------------------------------------------------------------------
-- Newsletter subscriptions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- ---------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

-- ---------------------------------------------------------------------
-- Games (admin-managed catalog + per-user scores)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  subject     TEXT,
  description TEXT,
  emoji       TEXT DEFAULT '🎮',
  published   INTEGER NOT NULL DEFAULT 1,        -- 0/1
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  played_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game_id);

CREATE TABLE IF NOT EXISTS game_activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key   TEXT NOT NULL,
  score      INTEGER NOT NULL DEFAULT 0,
  details    TEXT,
  played_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_game_activity_user ON game_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_game_activity_game ON game_activity(game_key);

-- ---------------------------------------------------------------------
-- Quizzes (admin-managed, with questions stored as JSON) + attempts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subject     TEXT,
  description TEXT,
  questions   TEXT NOT NULL,                     -- JSON array: [{prompt, options[], correct_index, explanation}]
  published   INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id      INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- ---------------------------------------------------------------------
-- Blog posts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  excerpt     TEXT,
  content     TEXT NOT NULL,
  cover_key   TEXT,                              -- R2 object key for cover image
  published   INTEGER NOT NULL DEFAULT 1,
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Learning materials (files live in R2; this row is the catalog entry)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subject     TEXT,
  file_key    TEXT NOT NULL,                     -- R2 object key
  file_type   TEXT,                               -- pdf | image | other
  file_size   INTEGER,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Seed an initial admin so the panel is reachable after first deploy.
-- ⚠️ Change this password immediately after first login — see README.
-- Email: admin@smart21brain.com   Password: ChangeMe123!
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO users (name, email, password_hash, password_salt, role)
VALUES (
  'Admin',
  'admin@smart21brain.com',
  'b56a2e29ab00f457df5a6bfa39ceab37802761f92b4d17db54412e77ec697c5',
  '6950776b6072e0f12528aa7dd22ab261',
  'admin'
);
