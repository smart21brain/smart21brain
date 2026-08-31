# Deploying Smart21Brain to Cloudflare Pages (with D1 + R2)

This site now has a real backend: **Cloudflare Pages Functions** in
`functions/`, a **D1** database for accounts/games/quizzes/blog/progress,
and an **R2** bucket for uploaded learning materials (PDFs/images).

I can't run these commands for you from here (no Cloudflare account access
from this environment), but every command below is copy-pasteable — run
them from your terminal, inside this `smart21brain/` folder.

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

## 3. Deploy to Pages

From inside `smart21brain/`:

```bash
wrangler pages deploy . --project-name=smart21brain
```

First run will ask to create the Pages project — say yes. Wrangler reads
`wrangler.toml` and automatically wires the `DB` and `MATERIALS` bindings
into your Pages Functions.

Your site will be live at `https://smart21brain.pages.dev` (or your
custom domain, if you attach one in the Cloudflare dashboard).

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

## 5. What's wired up so far

| Area | Status |
|---|---|
| Register / Login / Logout | ✅ real, backed by D1 (`/api/auth/*`) |
| Admin: add games | ✅ `admin.html` → `/api/games` |
| Admin: add quizzes | ✅ `admin.html` → `/api/quizzes` |
| Admin: add blog posts | ✅ `admin.html` → `/api/blog` |
| Admin: upload learning materials | ✅ `admin.html` → `/api/materials` (stored in R2) |
| Public pages reading live data | ⏳ `games.html`, `quiz.html`, `blog.html` etc. still show their original static demo content — next step is pointing them at these same `/api` endpoints instead of hardcoded HTML |
| Dashboard stats | ✅ API ready (`/api/dashboard`) — not yet wired into `dashboard.html`'s UI |

## 6. Local development

```bash
wrangler pages dev . --d1=DB=smart21brain-db --r2=MATERIALS=smart21brain-materials
```

This runs the whole site + API locally with local D1/R2 emulation (data
won't touch production until you run commands with `--remote`).

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
