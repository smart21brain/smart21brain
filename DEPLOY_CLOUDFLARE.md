# Deploying Smart21Brain to a Cloudflare Worker (with D1 + R2)

This site runs as a single **Cloudflare Worker** (`src/index.js`) that
serves the static site *and* handles the `/api/*` routes, backed by a
**D1** database (accounts, games, quizzes, blog, progress) and an **R2**
bucket (uploaded learning materials — PDFs/images).

I can't run these commands for you from here (no access to your
Cloudflare account or its API from this environment), but every command
below is copy-pasteable — run them from your terminal, inside this
`smart21brain/` folder.

## 0. Prerequisites

```bash
npm install -g wrangler
wrangler login          # opens a browser to authorize your Cloudflare account
```

## 1. Create the D1 database

```bash
wrangler d1 create smart21brain-db
```

This prints a `database_id` — copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Then apply the schema (creates tables + a seed admin account):

```bash
wrangler d1 execute smart21brain-db --file=./schema.sql --remote
```

## 2. Create the R2 bucket

```bash
wrangler r2 bucket create smart21brain-materials
```

The binding name (`MATERIALS`) is already set in `wrangler.toml` — no
further config needed unless you rename the bucket.

## 3. Deploy the Worker

From inside `smart21brain/`:

```bash
wrangler deploy
```

Wrangler reads `wrangler.toml`, bundles `src/index.js`, uploads every
static file in this folder (except what's listed in `.assetsignore`) as
Worker assets, and wires up the `DB` and `MATERIALS` bindings.

Your site will be live at `https://smart21brain.<your-subdomain>.workers.dev`
(or a custom domain, if you attach one in the Cloudflare dashboard under
Workers & Pages → smart21brain → Triggers → Custom Domains).

## 4. Log in as admin

- Go to `/login.html`
- Email: `admin@smart21brain.com`
- Password: `ChangeMe123!`
- **Change this password immediately** — there's no "change password" API
  yet, so for now the fastest way is:
  ```bash
  wrangler d1 execute smart21brain-db --remote --command \
    "DELETE FROM users WHERE email = 'admin@smart21brain.com';"
  ```
  then register a brand-new account normally through `/register.html`,
  and promote it to admin:
  ```bash
  wrangler d1 execute smart21brain-db --remote --command \
    "UPDATE users SET role = 'admin' WHERE email = 'you@yourdomain.com';"
  ```

## 5. Local development

```bash
wrangler dev
```

This runs the whole site + API locally with local D1/R2 emulation (data
won't touch production until you deploy or run commands with `--remote`).

## 6. What's wired up

| Area | Status |
|---|---|
| Register / Login / Logout | ✅ real, backed by D1 (`/api/auth/*`) |
| Admin: add/manage games, quizzes, blog posts | ✅ `admin.html` → list, create, delete all working |
| Admin: upload learning materials | ✅ `admin.html` → `/api/materials` (stored in R2) |
| Public pages reading live data | ✅ `games.html`, `quiz.html`, `blog.html`, `blog-post.html`, `dashboard.html` all pull from the API, with graceful fallback to demo content if the API isn't reachable |
| Dashboard stats | ✅ real name, real avg quiz score, real recent activity |

## Project layout

```
smart21brain/
├── wrangler.toml         ← Worker config (D1 + R2 bindings, assets dir)
├── schema.sql             ← D1 schema + seed admin
├── .assetsignore          ← excludes src/, config, docs from static upload
├── src/
│   ├── index.js            ← Worker entry: routes /api/*, else serves assets
│   ├── router.js           ← tiny path/method router
│   ├── lib/auth.js         ← password hashing, sessions, cookies, helpers
│   └── handlers/           ← one file per resource (auth, games, quizzes, blog, materials, dashboard)
├── index.html, *.html      ← the static site (served as Worker assets)
├── css/, js/, images/      ← static assets
```

## API reference (all under `/api`)

- `POST /api/auth/register` `{name, email, password}`
- `POST /api/auth/login` `{email, password}`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/games` · `POST /api/games` (admin) · `GET/PUT/DELETE /api/games/:id`
- `POST /api/games/:id/score` `{score}` (signed-in user)
- `GET  /api/quizzes` · `POST /api/quizzes` (admin) · `GET/PUT/DELETE /api/quizzes/:id`
- `POST /api/quizzes/:id/attempt` `{answers: [index, index, ...]}`
- `GET  /api/blog` · `POST /api/blog` (admin) · `GET/PUT/DELETE /api/blog/:slug`
- `GET  /api/materials` · `POST /api/materials` (admin, multipart file upload)
- `GET  /api/materials/:id` (streams the file) · `DELETE /api/materials/:id` (admin)
- `GET  /api/dashboard` (signed-in user's stats)
