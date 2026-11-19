# Dynamic Portfolio & Admin Dashboard

A personal portfolio website whose content is served by a REST API, plus an admin dashboard for editing that content from the browser. No source-code changes are needed to add a project, change a skill or update the bio.

|                   | URL                                                                          |
| ----------------- | ---------------------------------------------------------------------------- |
| Public portfolio  | `https://varsha-shubhashri-m..onrender.com/` *(replace after deploying)* |
| Admin dashboard   | `https://varsha-shubhashri-m..onrender.com/admin`                          |
| API root          | `https://varsha-shubhashri-m..onrender.com/api/portfolio`                  |
| GitHub repository | `https://github.com/vvvvvvss/varsha-shubhashri-m.`                         |

> Locally these are `http://localhost:3000/`, `/admin` and `/api/portfolio`.

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Project structure](#project-structure)
4. [Data model](#data-model)
5. [API reference](#api-reference)
6. [Validation and error handling](#validation-and-error-handling)
7. [Authentication](#authentication)
8. [Setup (run locally)](#setup-run-locally)
9. [Using the dashboard](#using-the-dashboard)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Screenshots](#screenshots)
13. [Known limitations](#known-limitations)

---

## Features

**Public portfolio**

- Responsive single-page site (light theme, animated hero, scroll reveals, marquee, project grid).
- Everything is fetched from `GET /api/portfolio` and rendered in the browser, so edits made in the dashboard show up on the next page load (and when a visitor returns to an already-open tab).
- Hero stat tiles ("Certifications", "Projects") are derived from the data, so they stay correct automatically.
- All text is inserted with `textContent`, never `innerHTML`, so content typed into the dashboard cannot inject HTML or scripts.

**Admin dashboard** (`/admin`)

- Password login. Add, view, edit, delete and re-order **projects, skills, achievements, certifications and ML models**.
- Edit the **profile & contact** section (hero text, about text, status badge, links, footer).
- Search boxes, confirmation dialogs for deletes, toast messages, inline field-level validation errors.
- **Backup tab:** download all content as JSON, restore from a JSON file, or reset to the defaults.

**REST API**

- JSON in, JSON out. Correct HTTP verbs and status codes (200, 201, 204, 400, 401, 404, 409, 413, 415, 429).
- Input validation on every write and a consistent error format.

---

## Architecture

```
                         ┌──────────────────────────────────────────┐
                         │          Node.js + Express server        │
                         │                                          │
 Public portfolio        │   /api  ──►  routes/api.js               │
 (public/index.html) ────┼──────────►   • validate.js (rules from   │
   GET /api/portfolio    │              schemas.js)                 │
                         │              • auth.js (Bearer tokens)   │
 Admin dashboard         │                    │                     │
 (public/admin/*) ───────┼──────────►         ▼                     │
   GET/POST/PUT/PATCH/   │              store.js  ◄── seed.js       │
   DELETE /api/...       │         (in-memory JavaScript objects)   │
                         │                                          │
                         │   /, /admin  ──►  express.static(public) │
                         └──────────────────────────────────────────┘
```

- **One server, one data store.** The public site and the dashboard are both plain static files served by Express, and both talk to the same `/api` routes, which read and write the single in-memory `Store`. That is why a change made in the dashboard is immediately visible on the public site.
- **Schemas drive everything.** `src/schemas.js` describes each field once. The API validates against it, and `GET /api/meta` sends it to the dashboard, which generates its forms and tables from it. Adding a field means editing that one file.
- **Same origin.** The pages and the API share a domain, so no CORS setup is needed.

---

## Project structure

```
.
├── server.js                 # entry point (reads PORT, starts the app)
├── package.json
├── render.yaml               # optional one-click config for Render
├── postman_collection.json   # import into Postman to try every endpoint
├── .env.example
├── src/
│   ├── app.js                # builds the Express app (middleware, static files, error handler)
│   ├── routes/api.js         # all REST endpoints
│   ├── schemas.js            # field definitions + validation rules for every content type
│   ├── validate.js           # tiny validation helper (no external library)
│   ├── store.js              # in-memory data store (CRUD, reorder, export/import)
│   ├── auth.js               # password login + session tokens + login throttling
│   └── data/seed.js          # initial content (mirrors the original static page)
├── public/
│   ├── index.html            # the public portfolio (original design, now data-driven)
│   ├── js/portfolio.js       # fetches /api/portfolio and renders the page
│   └── admin/                # dashboard: index.html, admin.css, admin.js
├── test/api.test.js          # 15 automated API tests
└── docs/screenshots/         # screenshots of the dashboard and dynamic updates
```

---

## Data model

Every item has a numeric `id`, plus `createdAt` and `updatedAt` timestamps added by the server. The list order is the display order on the site.

| Collection                      | Fields (required in **bold**)                                                                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`                    | **title** (≤80), **description** (≤400), `tech` (list, ≤8 tags), `link` (http/https URL)                                                                   |
| `skills`                      | **name** (≤40), **category** (≤40), `inStack` (bool, default true), `inMarquee` (bool), `aboutTag` (`""`, `accent`, `blue`, `plain`)              |
| `achievements`                | **title** (≤80), **description** (≤300)                                                                                                                         |
| `certifications`              | **name** (≤100), **org** (≤60), `level` (≤60), `link` (URL)                                                                                                |
| `models`                      | **name** (≤60), **category** (≤40)                                                                                                                              |
| `profile` *(single object)* | **heroTag**, **heroDescription**, **aboutBody**, `badgeHighlight`, `badgeText`, **email**, `linkedin`, `github`, `substack`, `footerText` |

A **skill** can appear in up to three places: the *Tech Stack* section (grouped by `category`), the scrolling *marquee*, and the tag row in the *About* section.

---

## API reference

Base path: `/api`. Request and response bodies are JSON (`Content-Type: application/json`). 🔒 = needs `Authorization: Bearer <token>`.

### Content endpoints

`{collection}` is one of `projects`, `skills`, `achievements`, `certifications`, `models`.

| Method     | Endpoint                        | Auth | Description                                                             | Success |
| ---------- | ------------------------------- | ---- | ----------------------------------------------------------------------- | ------- |
| `GET`    | `/api/portfolio`              |      | Whole portfolio in one response (used by the public page)               | `200` |
| `GET`    | `/api/{collection}`           |      | List items. Optional `?q=text` search. Returns `{ count, items }`   | `200` |
| `GET`    | `/api/{collection}/{id}`      |      | One item                                                                | `200` |
| `POST`   | `/api/{collection}`           | 🔒   | Create an item. Returns it with a `Location` header                   | `201` |
| `PUT`    | `/api/{collection}/{id}`      | 🔒   | Replace all editable fields                                             | `200` |
| `PATCH`  | `/api/{collection}/{id}`      | 🔒   | Update only the fields you send                                         | `200` |
| `DELETE` | `/api/{collection}/{id}`      | 🔒   | Delete the item                                                         | `204` |
| `POST`   | `/api/{collection}/{id}/move` | 🔒   | Re-order: body `{ "direction": "up" \| "down" }`. Returns the new list | `200` |
| `GET`    | `/api/profile`                |      | Profile / contact details                                               | `200` |
| `PUT`    | `/api/profile`                | 🔒   | Replace the profile (all required fields needed)                        | `200` |
| `PATCH`  | `/api/profile`                | 🔒   | Update some profile fields                                              | `200` |

### Auth and utility endpoints

| Method   | Endpoint              | Auth | Description                                                      |
| -------- | --------------------- | ---- | ---------------------------------------------------------------- |
| `POST` | `/api/auth/login`   |      | Body `{ "password": "..." }` → `{ token, expiresIn }`       |
| `POST` | `/api/auth/logout`  | 🔒   | Invalidates the token (`204`)                                  |
| `GET`  | `/api/auth/me`      | 🔒   | `200` if the token is valid                                    |
| `GET`  | `/api/health`       |      | `{ "status": "ok" }`, used by hosting health checks            |
| `GET`  | `/api/meta`         |      | Field definitions that the dashboard builds forms from           |
| `GET`  | `/api/admin/export` | 🔒   | Download all content as JSON                                     |
| `POST` | `/api/admin/import` | 🔒   | Restore from an export. Validated first, so it is all-or-nothing |
| `POST` | `/api/admin/reset`  | 🔒   | Restore the default seed content                                 |

### Examples

```bash
# 1. log in and keep the token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' | node -pe "JSON.parse(require('fs').readFileSync(0,'utf8')).token")

# 2. create a project
curl -i -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Smart Campus Bot","description":"Answers campus questions.","tech":["Python","FastAPI"],"link":"https://github.com/me/bot"}'
# -> 201 Created, Location: /api/projects/7

# 3. change one field
curl -X PATCH http://localhost:3000/api/projects/7 \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Smart Campus Bot v2"}'

# 4. delete it
curl -i -X DELETE http://localhost:3000/api/projects/7 -H "Authorization: Bearer $TOKEN"
# -> 204 No Content
```

Prefer a GUI? Import `postman_collection.json` into Postman. Run **Auth → Login** first; it stores the token for the other requests.

---

## Validation and error handling

Every write is validated on the server (the dashboard shows the messages next to the fields):

- required fields must be present and non-empty; text is trimmed and length-limited
- `link`-type fields must be valid `http://` or `https://` URLs; `email` must look like an email
- `tech` accepts an array or comma-separated text; items are trimmed and de-duplicated
- booleans must be real `true`/`false`; `aboutTag` must be one of the allowed values
- unknown fields are ignored; bodies must be JSON objects; ids must be positive integers

All errors share one shape:

```json
{
  "error": {
    "status": 400,
    "message": "Validation failed",
    "details": {
      "title": "Title is required",
      "link": "GitHub / live link must be a valid http(s) URL"
    }
  }
}
```

| Status  | When                                                           |
| ------- | -------------------------------------------------------------- |
| `400` | Validation failed, malformed JSON, bad `id`, empty `PATCH` |
| `401` | Missing, invalid or expired token; wrong password              |
| `404` | Unknown route, collection or id                                |
| `409` | A collection already has 200 items                             |
| `413` | Request body larger than 200 kB                                |
| `415` | Body is not `application/json`                               |
| `429` | Too many failed logins from one IP (10 per 15 minutes)         |
| `500` | Unexpected server error (details are logged, not leaked)       |

---

## Authentication

Reading content is public. Changing it requires the admin password:

1. Set the `ADMIN_PASSWORD` environment variable. If it is missing, the server falls back to `admin123` and prints a warning. **Always set your own before deploying.**
2. `POST /api/auth/login` returns a random 256-bit token valid for 8 hours. The dashboard keeps it in `sessionStorage` and sends it as `Authorization: Bearer <token>`.
3. Passwords are compared in constant time and repeated failures are throttled.

This is deliberately simple. It is enough to keep strangers from editing a public portfolio, but see [Known limitations](#known-limitations).

---

## Setup (run locally)

Requires **Node.js 18 or newer**.

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
npm install

# choose your admin password (Windows PowerShell: $env:ADMIN_PASSWORD="your-password")
export ADMIN_PASSWORD="your-password"

npm start
```

Then open:

- Portfolio: [http://localhost:3000/](http://localhost:3000/)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Raw data: [http://localhost:3000/api/portfolio](http://localhost:3000/api/portfolio)

`npm run dev` restarts the server automatically when you edit files. Use `PORT=4000 npm start` to change the port.

---

## Using the dashboard

1. Go to `/admin` and sign in.
2. Pick a section in the sidebar (Projects, Skills, ...). Use **+ Add**, **Edit**, **Delete**, or the ↑ ↓ arrows to re-order.
3. Open the public site (the **View site** button). Your change is already there. Reload the page if it was open already.

**Skill flags:** tick *Show in Tech Stack* for the Tech Stack section, *Show in scrolling marquee* for the ticker, and pick a style under *Tag in "About" section* to show it in the About tag row.

---

## Testing

```bash
npm test
```

Runs 15 automated tests with Node's built-in test runner. They cover public reads, login, protected writes, full CRUD, validation errors, bad JSON and content types, 404s, re-ordering, search, profile updates, export/import/reset and serving of the static pages. The tests start the app on a random port with their own password and do not touch your real data.

---

## Deployment

The app is **one Node web service**, so any host that runs Node works. The steps below use [Render](https://render.com) (free tier).

### 1. Put the code on GitHub

```bash
git init
git add .
git commit -m "Dynamic portfolio with admin dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

### 2. Deploy on Render

1. Render dashboard → **New → Web Service** → connect the GitHub repository.
2. Settings: **Runtime** Node, **Build command** `npm install`, **Start command** `npm start`.
3. Under **Environment**, add `ADMIN_PASSWORD` with a strong password of your own.
4. Set the **health check path** to `/api/health` and deploy.

The repository includes a `render.yaml`, so **New → Blueprint** can set most of this up for you. Railway, Koyeb and Fly.io work the same way: `npm install`, `npm start`, and the `PORT` and `ADMIN_PASSWORD` variables.

> Netlify and Vercel are built for static sites and serverless functions. Because this app keeps its data in memory inside one running process, use a host that runs a normal long-lived Node server.

### 3. Check it

Open `https://YOUR-APP.onrender.com/`, then `/admin`, sign in, add a project, and refresh the public page.

---

## Screenshots

Captured from a local run. Retake them from your deployed site for your submission if you prefer.

|                                                                                                                       |                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| ![Public hero](docs/screenshots/01-public-hero.png) **Public portfolio**                                        | ![Public projects](docs/screenshots/02-public-projects.png) **Projects rendered from the API**                    |
| ![Overview](docs/screenshots/03-admin-overview.png) **Dashboard overview**                                      | ![Projects list](docs/screenshots/04-admin-projects-list.png) **Projects list (view / edit / delete / re-order)** |
| ![Validation](docs/screenshots/05-admin-validation-errors.png) **API validation errors shown in the form**      | ![After add](docs/screenshots/06-admin-after-add.png) **New project added (count 6 → 7)**                        |
| ![Public updated](docs/screenshots/07-public-reflects-change.png) **Same project instantly on the public site** | ![Confirm delete](docs/screenshots/08-admin-confirm-delete.png) **Delete confirmation**                           |
| ![Skills](docs/screenshots/09-admin-skills.png) **Skills management**                                           | ![Profile](docs/screenshots/10-admin-profile.png) **Profile & contact editor**                                    |
| ![Backup](docs/screenshots/11-admin-backup.png) **Backup / restore / reset**                                    | ![Mobile](docs/screenshots/12-public-mobile.png) **Responsive mobile view**                                       |

---

## Known limitations

- **Data is stored in memory.** Everything resets to the seed data when the server restarts or redeploys (free hosts also restart idle services). Use **Backup → Download JSON** to keep a copy and **Restore** to load it again. The brief explicitly allows in-memory storage; swapping `src/store.js` for a database later would not change the API.
- **Single admin, single password.** There are no user accounts or roles. Sessions are kept in memory, so a restart logs everyone out. Over plain HTTP the password and token are sent unencrypted, so use HTTPS (hosts such as Render provide it by default).
- **Single server only.** Because the data and sessions live inside one process, running several instances would give each its own separate copy.
- **No image or file uploads.** Content is text and links only.
- **The public page is rendered in the browser.** It needs JavaScript, so there is no server-side rendering and search engines that do not run scripts will see an empty page.
- **Limits.** At most 200 items per collection and 200 kB per request.
- **Re-ordering** is by one-step up/down buttons, not drag-and-drop.
- The hero headline, section titles and "About" headline are part of the page design and are edited in `public/index.html`, not in the dashboard.
