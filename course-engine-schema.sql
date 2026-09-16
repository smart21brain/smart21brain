-- =======================================================================
-- COURSE ENGINE — Smart21Brain main-site LMS core
-- courses -> lessons, with enrollment + per-lesson progress.
-- Apply together with schema.sql (same D1 database) — this file is
-- appended into schema.sql by the build; kept separate here for review.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Course categories (admin-manageable)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT DEFAULT 'fa-solid fa-book',           -- Font Awesome class, matches existing badge-pill icons
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  thumbnail_url       TEXT,
  category_id         INTEGER REFERENCES course_categories(id) ON DELETE SET NULL,
  instructor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  level               TEXT NOT NULL DEFAULT 'beginner',   -- beginner|intermediate|advanced|all-levels
  age_range           TEXT,                                -- e.g. '7-10'
  language            TEXT DEFAULT 'English',
  objectives          TEXT,                                -- JSON array of strings ("what you'll learn")
  requirements        TEXT,                                -- JSON array of strings
  price               REAL NOT NULL DEFAULT 0,
  is_free             INTEGER NOT NULL DEFAULT 1,           -- 0/1 — kept alongside price for fast filtering
  certificate_enabled INTEGER NOT NULL DEFAULT 0,           -- 0/1 — certificate issued on completion (see certificates phase)
  passing_score       INTEGER NOT NULL DEFAULT 70,          -- % of lessons that must be completed to mark the course done
  published           INTEGER NOT NULL DEFAULT 1,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);

-- ---------------------------------------------------------------------
-- Lessons — belong to a course, ordered by sort_order. A lesson can
-- point at existing content (a video, a material/PDF, or a quiz) or
-- just carry its own text body — reusing the site's existing content
-- tables instead of duplicating video/PDF storage.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_lessons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  content_type      TEXT NOT NULL DEFAULT 'text',   -- text|video|pdf|quiz
  video_id          INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  material_id       INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  quiz_id           INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  body              TEXT,                             -- lesson text / instructions
  duration_seconds  INTEGER,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_preview        INTEGER NOT NULL DEFAULT 0,        -- 0/1 — viewable without enrolling
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, title)
);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id);

-- ---------------------------------------------------------------------
-- Enrollments — one row per (user, course). payment_status distinguishes
-- free enrollments from paid ones; 'pending' is used for a paid course
-- until a payment integration (a later phase) confirms it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_enrollments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_status  TEXT NOT NULL DEFAULT 'free',      -- free|paid|pending
  status          TEXT NOT NULL DEFAULT 'active',    -- active|completed
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);

-- ---------------------------------------------------------------------
-- Per-lesson completion, for progress bars + course completion checks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed     INTEGER NOT NULL DEFAULT 0,
  completed_at  TEXT,
  UNIQUE(user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);

-- ---------------------------------------------------------------------
-- Seed categories matching what the site already advertises on
-- courses.html/subjects.html, so the catalog filters have real options.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES
('Mathematics', 'mathematics', 'fa-solid fa-calculator'),
('Science', 'science', 'fa-solid fa-flask'),
('Computer Studies', 'computer-studies', 'fa-solid fa-laptop-code'),
('Languages', 'languages', 'fa-solid fa-language'),
('Social Studies', 'social-studies', 'fa-solid fa-earth-africa'),
('Creative', 'creative', 'fa-solid fa-palette');

-- ---------------------------------------------------------------------
-- Seed one real, complete course (mirrors the demo content that used to
-- be hard-coded on course.html) so the catalog isn't empty on first
-- deploy and the whole flow — catalog, enroll, lessons, progress — is
-- testable immediately.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Fractions Made Fun', 'fractions-made-fun',
  'Fractions Made Fun breaks one of the trickiest primary-maths topics into small, visual steps. Each lesson pairs a short explanation with a hands-on example.',
  (SELECT id FROM course_categories WHERE slug = 'mathematics'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Compare and order fractions confidently","Add and subtract simple fractions","Convert fractions to decimals","Spot fractions in everyday life"]',
  '["No prior fraction knowledge needed","A notebook and pencil"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'What is a Fraction?' AS title,
    'A fraction shows a part of a whole. The top number (numerator) tells us how many parts we have, and the bottom number (denominator) tells us how many equal parts the whole is split into.' AS body,
    1 AS sort_order, 1 AS is_preview
  UNION ALL SELECT 'Halves and Quarters',
    'A half means splitting something into 2 equal parts. A quarter means splitting it into 4 equal parts. Try cutting a piece of paper in half, then in half again — that''s a quarter!',
    2, 0
  UNION ALL SELECT 'Comparing Fractions',
    'When two fractions share the same denominator, the one with the bigger numerator is bigger. Picture two pizzas cut into the same number of slices — whoever has more slices has more pizza.',
    3, 0
  UNION ALL SELECT 'Equivalent Fractions',
    'Different fractions can represent the same amount — for example 1/2 is the same amount as 2/4. We call these equivalent fractions.',
    4, 0
  UNION ALL SELECT 'Adding Simple Fractions',
    'To add fractions that share a denominator, add the numerators and keep the denominator the same. For example, 1/4 + 2/4 = 3/4.',
    5, 0
  UNION ALL SELECT 'Fractions in Real Life',
    'Fractions are everywhere — in cooking recipes, sharing snacks, and telling time. Look around you right now: can you spot something split into equal parts?',
    6, 0
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');
