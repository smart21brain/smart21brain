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
-- Site settings (admin console toggles) — simple key/value store so new
-- switches can be added without another migration.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,                          -- stored as 'true' / 'false'
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO site_settings (key, value) VALUES
('require_content_review', 'true'),
('allow_public_comments', 'false'),
('maintenance_mode', 'false');

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
-- Videos (admin-posted). Either an uploaded file (stored in the same
-- MATERIALS R2 bucket, under a videos/ prefix) or a link to an
-- externally-hosted video (YouTube, Vimeo, a CDN, etc).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  subject           TEXT,
  description       TEXT,
  source_type       TEXT NOT NULL DEFAULT 'file',  -- 'file' (R2) | 'url' (external link/embed)
  file_key          TEXT,                           -- R2 object key, when source_type = 'file'
  external_url      TEXT,                           -- link, when source_type = 'url'
  thumbnail_url      TEXT,
  duration_seconds  INTEGER,
  -- Where this video is shown on the site, e.g. ",videohub,kids,".
  -- Stored comma-padded so "LIKE '%,kids,%'" matches whole tags only.
  -- One of: videohub | cartoons | courses | kids (any combination).
  placements        TEXT NOT NULL DEFAULT ',videohub,',
  published         INTEGER NOT NULL DEFAULT 1,      -- 0/1 — only published videos are public
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published);

-- Per-user "where did I stop watching" position, so the player can resume
-- and Videos/Dashboard can show a real "Continue Watching" row.
CREATE TABLE IF NOT EXISTS video_progress (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id          INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position_seconds  INTEGER NOT NULL DEFAULT 0,
  completed         INTEGER NOT NULL DEFAULT 0,           -- 0/1 — watched to (near) the end
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);

-- ---------------------------------------------------------------------
-- Digital library — admin-managed books (paginated reader content) +
-- per-user reading position, mirroring the quizzes/quiz_attempts shape.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  subject     TEXT,
  description TEXT,
  cover_url   TEXT,
  pages       TEXT NOT NULL,                     -- JSON array: [{heading, text}]
  published   INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS book_progress (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_book_progress_user ON book_progress(user_id);

-- Seed one real book with the site's original storybook content, so the
-- Library page has a genuine reader on day one instead of an empty list.
INSERT OR IGNORE INTO books (title, slug, subject, description, pages, published) VALUES (
  'The Solar System Storybook',
  'solar-system-storybook',
  'science',
  'A short illustrated story about curiosity, discovery, and the solar system.',
  '[
    {"heading":"Chapter 1 — A New Discovery","text":"The sun had barely risen over the savanna when Amara found the strange, glowing stone near the acacia tree. It was smooth, cool to the touch, and pulsed faintly like a heartbeat. She had never seen anything like it in all her nine years exploring these fields with her grandfather."},
    {"heading":"Chapter 1 — A New Discovery","text":"\"Babu, look what I found!\" she called, running toward the old man sitting beneath the tree''s wide shade. He took the stone carefully, turning it over in his weathered hands, and his eyes widened with something between wonder and worry."},
    {"heading":"Chapter 2 — The Old Map","text":"That evening, Babu pulled a rolled parchment from beneath his bed — a map older than the village itself, marked with symbols Amara had never seen. \"This stone,\" he said slowly, \"belongs to a story I have been waiting to tell you.\""},
    {"heading":"Chapter 2 — The Old Map","text":"He traced a path across the map with his finger, from the baobab forest to the river bend, ending at a symbol shaped like a rising sun. \"Every twenty-one years, the brain-light appears to remind us that curiosity is the beginning of everything worth knowing.\""},
    {"heading":"Chapter 3 — Into the Forest","text":"The next morning, with her satchel packed and the stone wrapped safely in cloth, Amara set off along the path from the map. The forest was louder than she expected — birds calling, leaves rustling, and somewhere far off, the low rumble of the river."},
    {"heading":"Chapter 3 — Into the Forest","text":"She was not walking alone for long. A small, quick-footed dik-dik crossed her path and seemed to wait for her, glancing back every few steps as though it, too, knew exactly where they were going."}
  ]',
  1
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

-- =======================================================================
-- STATIONERY OS — smart21brain Stationery Operating System
-- Multi-tenant: Business -> Branches -> Staff (role-scoped) -> everything
-- else. Apply together with schema.sql (same D1 database) — this file is
-- appended into schema.sql by the build; kept separate here for review.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Businesses & branches (tenants)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_businesses (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency      TEXT NOT NULL DEFAULT 'TZS',
  phone         TEXT,
  address       TEXT,
  logo_key      TEXT,                              -- R2 object key
  receipt_note  TEXT DEFAULT 'Asante kwa kutuchagua! / Thank you for your business!',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_businesses_owner ON stn_businesses(owner_user_id);

CREATE TABLE IF NOT EXISTS stn_branches (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  is_main     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_branches_business ON stn_branches(business_id);

-- Role-scoped staff membership. A user's *global* users.role (student/
-- admin/etc, from the main site) is unrelated to their role inside a
-- given stationery business.
CREATE TABLE IF NOT EXISTS stn_staff (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id   INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'operator',    -- owner|manager|operator|designer|accountant
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_stn_staff_business ON stn_staff(business_id);
CREATE INDEX IF NOT EXISTS idx_stn_staff_user ON stn_staff(user_id);

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_customers_business ON stn_customers(business_id);
CREATE INDEX IF NOT EXISTS idx_stn_customers_phone ON stn_customers(phone);

-- ---------------------------------------------------------------------
-- Pricing system: services / products sold at the counter
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_services (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id      INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'Printing',
  unit             TEXT NOT NULL DEFAULT 'page',
  unit_price       REAL NOT NULL DEFAULT 0,
  cost_price       REAL NOT NULL DEFAULT 0,          -- for profit calc
  inventory_item_id INTEGER REFERENCES stn_inventory_items(id) ON DELETE SET NULL,
  deduct_qty       REAL NOT NULL DEFAULT 0,           -- stock units deducted per 1 unit sold
  active           INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_services_business ON stn_services(business_id);

-- ---------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_inventory_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id    INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id      INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'Paper',
  unit           TEXT NOT NULL DEFAULT 'pcs',
  quantity       REAL NOT NULL DEFAULT 0,
  reorder_level  REAL NOT NULL DEFAULT 5,
  cost_price     REAL NOT NULL DEFAULT 0,
  barcode        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_inventory_business ON stn_inventory_items(business_id);
CREATE INDEX IF NOT EXISTS idx_stn_inventory_barcode ON stn_inventory_items(barcode);

CREATE TABLE IF NOT EXISTS stn_stock_movements (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id  INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  item_id      INTEGER NOT NULL REFERENCES stn_inventory_items(id) ON DELETE CASCADE,
  change_qty   REAL NOT NULL,                        -- negative = deduction
  reason       TEXT NOT NULL DEFAULT 'adjustment',    -- sale|purchase|adjustment|waste
  ref_order_id INTEGER,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_stock_moves_item ON stn_stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stn_stock_moves_business ON stn_stock_movements(business_id);

-- ---------------------------------------------------------------------
-- Universal Order Engine
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id    INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id      INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  order_no       TEXT NOT NULL,
  customer_id    INTEGER REFERENCES stn_customers(id) ON DELETE SET NULL,
  operator_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'Received',   -- Received|Processing|Ready|Completed|Cancelled
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',     -- Unpaid|Partial|Paid
  payment_method TEXT,                                -- mpesa|tigopesa|cash|bank|credit
  subtotal       REAL NOT NULL DEFAULT 0,
  discount       REAL NOT NULL DEFAULT 0,
  total_amount   REAL NOT NULL DEFAULT 0,
  paid_amount    REAL NOT NULL DEFAULT 0,
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(business_id, order_no)
);
CREATE INDEX IF NOT EXISTS idx_stn_orders_business ON stn_orders(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stn_orders_status ON stn_orders(business_id, status);
CREATE INDEX IF NOT EXISTS idx_stn_orders_customer ON stn_orders(customer_id);

CREATE TABLE IF NOT EXISTS stn_order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES stn_orders(id) ON DELETE CASCADE,
  service_id  INTEGER REFERENCES stn_services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty         REAL NOT NULL DEFAULT 1,
  unit_price  REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  file_key    TEXT                                    -- optional R2 object key (uploaded job file)
);
CREATE INDEX IF NOT EXISTS idx_stn_order_items_order ON stn_order_items(order_id);

CREATE TABLE IF NOT EXISTS stn_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  order_id    INTEGER NOT NULL REFERENCES stn_orders(id) ON DELETE CASCADE,
  amount      REAL NOT NULL,
  method      TEXT NOT NULL DEFAULT 'cash',           -- mpesa|tigopesa|cash|bank|credit
  reference   TEXT,
  received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_payments_business ON stn_payments(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stn_payments_order ON stn_payments(order_id);

-- ---------------------------------------------------------------------
-- Finance: expenses & cashbook derive from payments + expenses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  branch_id   INTEGER REFERENCES stn_branches(id) ON DELETE SET NULL,
  category    TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  amount      REAL NOT NULL,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_expenses_business ON stn_expenses(business_id, created_at);

-- ---------------------------------------------------------------------
-- Photo Studio: country-specific print presets
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_photo_presets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id   INTEGER REFERENCES stn_businesses(id) ON DELETE CASCADE, -- NULL = global default preset
  country       TEXT NOT NULL,
  name          TEXT NOT NULL,
  width_mm      REAL NOT NULL,
  height_mm     REAL NOT NULL,
  dpi           INTEGER NOT NULL DEFAULT 300,
  face_min_pct  REAL NOT NULL DEFAULT 50,             -- min face-height as % of photo height
  face_max_pct  REAL NOT NULL DEFAULT 69,
  bg_color      TEXT NOT NULL DEFAULT '#FFFFFF',
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_photo_presets_business ON stn_photo_presets(business_id);

-- ---------------------------------------------------------------------
-- Online Services: guided checklist tracker (no direct gov integration)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_online_services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id  INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  customer_id  INTEGER REFERENCES stn_customers(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,                         -- TRA|BRELA|NIDA|Passport|Visa|TIN
  checklist    TEXT NOT NULL DEFAULT '[]',             -- JSON [{label, done}]
  status       TEXT NOT NULL DEFAULT 'In Progress',    -- In Progress|Awaiting Customer|Submitted|Done
  fee          REAL NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_online_services_business ON stn_online_services(business_id);

-- ---------------------------------------------------------------------
-- Machine Center: reference content (Owner/Manager editable)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_machines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES stn_businesses(id) ON DELETE CASCADE, -- NULL = global library
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,                           -- Printer|Photocopier|Camera|Laminator|Binding|Cutter
  content     TEXT NOT NULL DEFAULT '{}',               -- JSON {parts,setup,operation,maintenance,troubleshooting,error_codes,safety}
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Academy LMS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,                           -- Word|Excel|Photoshop|Canva|Printing
  description TEXT,
  modules     TEXT NOT NULL DEFAULT '[]',               -- JSON [{title,video_url,notes,quiz:[{q,options,correct}]}]
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stn_course_progress (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id          INTEGER NOT NULL REFERENCES stn_courses(id) ON DELETE CASCADE,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_modules  TEXT NOT NULL DEFAULT '[]',        -- JSON array of module indices
  quiz_scores        TEXT NOT NULL DEFAULT '{}',        -- JSON {moduleIndex: score}
  certificate_issued INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, user_id)
);

-- ---------------------------------------------------------------------
-- Notifications, audit log
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info',             -- info|warning|danger
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_notifications_business ON stn_notifications(business_id, is_read);

CREATE TABLE IF NOT EXISTS stn_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stn_audit_business ON stn_audit_log(business_id, created_at);

-- ---------------------------------------------------------------------
-- Seed: global photo presets (TZ, US, UK/Schengen) — business_id NULL
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO stn_photo_presets (id, business_id, country, name, width_mm, height_mm, dpi, face_min_pct, face_max_pct, bg_color, notes) VALUES
  (1, NULL, 'TZ', 'Tanzania Passport/ID 4x5', 40, 50, 300, 70, 80, '#FFFFFF', 'Standard 4x5 cm Tanzanian passport & NIDA photo'),
  (2, NULL, 'US', 'US Visa/Passport 2x2in', 50.8, 50.8, 300, 50, 69, '#FFFFFF', '2x2 inch (51x51mm), head 1in–1 3/8in from chin to crown'),
  (3, NULL, 'UK/SCHENGEN', 'UK/Schengen Visa 35x45', 35, 45, 300, 70, 80, '#FFFFFF', 'Head height 32-36mm from chin to crown'),
  (4, NULL, 'KE', 'Kenya Passport 51x51', 51, 51, 300, 70, 80, '#FFFFFF', 'Kenyan passport photo standard'),
  (5, NULL, 'UG', 'Uganda Passport 51x51', 51, 51, 300, 70, 80, '#FFFFFF', 'Ugandan passport photo standard');

-- ---------------------------------------------------------------------
-- Seed: global machine library
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO stn_machines (id, business_id, name, category, content) VALUES
(1, NULL, 'Laser Printer / Photocopier', 'Printer', '{"parts":["Paper tray","Toner cartridge","Drum unit","Fuser unit","Control panel","Scanner glass/ADF"],"setup":["Unbox and remove shipping locks","Install toner & drum unit","Load paper tray (A4/A3)","Connect power and USB/network cable","Install drivers and run test page"],"operation":["Load originals on glass or ADF for copying","Select paper size/tray and copy count","Use control panel to print, copy, scan or fax","Collect output from the output tray"],"maintenance":["Clean scanner glass weekly with a soft cloth","Replace toner when print is faded","Clean paper rollers monthly to avoid jams","Run built-in cleaning cycle for print heads (inkjet)"],"troubleshooting":["Paper jam: open all covers, remove paper in the direction of the paper path","Faded print: shake/replace toner cartridge","Lines on copies: clean scanner glass and mirrors","Not printing: check USB/network cable and driver install"],"error_codes":{"E1":"Paper jam","E2":"Toner low/empty","E3":"Drum unit fault","E5":"Fuser unit overheating"},"safety":["Turn off and unplug before opening the fuser area (hot)","Do not touch the drum surface with bare hands","Keep toner away from children and open flames","Use only manufacturer-approved consumables"]}'),
(2, NULL, 'Digital Camera / Studio Lighting', 'Camera', '{"parts":["Camera body","Lens","Tripod","Softbox lighting","Backdrop (blue/white/grey)"],"setup":["Mount camera on tripod at subject eye level","Position backdrop 1-1.5m behind subject","Set up two softboxes at 45° on each side","Set white balance using a grey card"],"operation":["Frame subject with head and shoulders visible","Ensure even lighting with no harsh shadows","Take photo in RAW/JPEG at highest resolution","Transfer to computer via card reader/USB"],"maintenance":["Clean lens with a microfiber cloth and blower","Store camera in a dry bag with silica gel","Check and charge batteries after each use"],"troubleshooting":["Blurry photos: check focus mode and hand shake","Shadows on backdrop: move subject further from backdrop","Colour cast: re-set white balance"],"error_codes":{},"safety":["Do not point flash directly into eyes at close range","Handle lighting stands carefully to avoid tipping"]}'),
(3, NULL, 'Laminator', 'Laminator', '{"parts":["Heating rollers","Feed tray","Thickness/temperature dial","Power switch","Pouch"],"setup":["Place on a flat, stable surface","Set temperature dial to match pouch thickness","Allow 3-5 minutes to warm up (ready light on)"],"operation":["Insert document centred inside laminating pouch","Feed sealed-edge first, straight into the machine","Guide gently as rollers pull the pouch through","Let cool flat before trimming edges"],"maintenance":["Run a cleaning sheet through monthly","Wipe rollers with a lint-free cloth when machine is off and cool","Keep away from dust and moisture"],"troubleshooting":["Cloudy lamination: temperature too low, increase and retry","Pouch jams: temperature too high or fed crooked","Bubbles: document was not centred or pouch was damp"],"error_codes":{},"safety":["Rollers are hot — never insert fingers","Unplug when not in use for extended periods"]}'),
(4, NULL, 'Comb/Spiral Binding Machine', 'Binding', '{"parts":["Punching lever","Die pins","Binding cradle","Comb/coil size guide"],"setup":["Confirm paper size and align punch guide","Set punch depth for the paper stack thickness"],"operation":["Punch pages in stacks of 15-20 sheets","Open plastic comb or feed coil onto the cradle pins","Slide punched pages onto open comb/coil","Close comb or spin coil closed, then trim ends"],"maintenance":["Empty paper-chad tray regularly","Lubricate the punch mechanism per manufacturer guide"],"troubleshooting":["Uneven holes: check paper is square against the guide","Punch jams: reduce sheet count per punch"],"error_codes":{},"safety":["Keep fingers clear of the punch head","Do not exceed the rated sheet count per punch"]}'),
(5, NULL, 'Guillotine / Paper Cutter', 'Cutter', '{"parts":["Cutting blade","Paper clamp","Measuring guide","Safety guard"],"setup":["Check blade is sharp and guard is functional","Align the measuring guide to the desired size"],"operation":["Square the paper stack against the back guide","Lower the clamp to hold paper firmly","Pull the blade down in one smooth motion","Raise blade and clamp fully before removing paper"],"maintenance":["Sharpen or replace blade when cuts become ragged","Keep the cutting surface clean and dry"],"troubleshooting":["Uneven cuts: paper not squared or blade dull","Blade sticks: check for paper debris in the track"],"error_codes":{},"safety":["Never place hands under the blade","Always engage the safety guard/lock after use","Keep away from children"]}');

-- ---------------------------------------------------------------------
-- Seed: Academy courses
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO stn_courses (id, title, category, description, modules) VALUES
(1, 'Microsoft Word Essentials', 'Word', 'Type, format and print professional documents for customers.',
 '[{"title":"Getting Started with Word","video_url":"","notes":"Interface tour, creating & saving documents, page setup (size, margins, orientation).","quiz":[{"q":"Which tab do you use to change page margins?","options":["Home","Layout","Insert","View"],"correct":1}]},
   {"title":"Formatting Text & Pages","video_url":"","notes":"Fonts, headings, bullet/numbered lists, page borders, headers & footers.","quiz":[{"q":"What is used to number pages automatically?","options":["Header/Footer tool","Spell check","Track changes","Mail merge"],"correct":0}]},
   {"title":"Tables, Images & Printing","video_url":"","notes":"Inserting tables and images, print preview, printing multiple copies for customers.","quiz":[{"q":"Where do you check a document before printing?","options":["Print Preview","Spell Check","Find & Replace","Word Count"],"correct":0}]}]'),
(2, 'Microsoft Excel Essentials', 'Excel', 'Build simple sales sheets, totals and printable reports.', '[{"title":"Cells, Rows & Formulas","video_url":"","notes":"Entering data, basic formulas (SUM, AVERAGE), cell references.","quiz":[{"q":"Which formula adds a range of cells?","options":["=TOTAL()","=SUM()","=ADD()","=PLUS()"],"correct":1}]},{"title":"Formatting & Charts","video_url":"","notes":"Number formats, borders, simple bar/line charts for sales data.","quiz":[{"q":"Which chart type is best to show a sales trend over months?","options":["Pie chart","Line chart","No chart needed","Table only"],"correct":1}]}]'),
(3, 'Photoshop for Print', 'Photoshop', 'Passport photo touch-ups, resizing and print layout basics.', '[{"title":"Canvas, Layers & Resolution","video_url":"","notes":"Setting canvas size in cm/inches at 300 DPI for print.","quiz":[{"q":"What DPI is standard for print-quality passport photos?","options":["72","150","300","600"],"correct":2}]},{"title":"Retouching & Background","video_url":"","notes":"Basic skin retouch, brightness/contrast, background cleanup.","quiz":[{"q":"Which adjustment brightens a dark photo?","options":["Hue/Saturation","Brightness/Contrast","Crop","Blur"],"correct":1}]}]'),
(4, 'Canva for Business', 'Canva', 'Design flyers, posters and social media graphics for customers.', '[{"title":"Templates & Brand Kits","video_url":"","notes":"Choosing templates, using brand colours and fonts consistently.","quiz":[{"q":"What lets you reuse the same colours/fonts across designs?","options":["Brand Kit","Layers panel","Grid view","Comments"],"correct":0}]}]'),
(5, 'Printing Operations', 'Printing', 'Paper types, print settings and finishing (lamination/binding) for customer jobs.', '[{"title":"Paper & Print Settings","video_url":"","notes":"Choosing A4/A3, colour vs black & white, duplex printing.","quiz":[{"q":"What setting prints on both sides of the paper?","options":["Duplex","Draft","Grayscale","Collate"],"correct":0}]}]');

-- ---------------------------------------------------------------------
-- Seed: Online-service requirement checklist templates (as JSON note in
-- a lightweight key/value table so the frontend can bootstrap defaults)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_service_templates (
  service_type TEXT PRIMARY KEY,
  checklist    TEXT NOT NULL                          -- JSON array of requirement strings
);
INSERT OR IGNORE INTO stn_service_templates (service_type, checklist) VALUES
('TRA', '["Valid National ID / Passport copy","TIN certificate (if existing)","Passport-size photo","Business registration certificate (if applicable)","Completed TRA application form"]'),
('BRELA', '["Proposed company/business names (2-3 options)","Copies of ID for all directors/owners","Passport-size photos of directors","Memorandum & Articles of Association (companies)","Registered office address"]'),
('NIDA', '["Birth certificate or age assessment","Parent/guardian ID (for minors)","Passport-size photo","Proof of residence (letter from local leader)"]'),
('Passport', '["National ID (NIDA)","Birth certificate","Passport-size photo (as per passport specs)","Old passport (renewals)","Completed application form"]'),
('Visa', '["Valid passport (6+ months validity)","Visa application form","Passport-size photo (destination country spec)","Invitation letter / travel itinerary","Proof of funds"]'),
('TIN', '["National ID / Passport copy","Business registration certificate (if applicable)","Physical/postal address","Completed TIN application form"]');
