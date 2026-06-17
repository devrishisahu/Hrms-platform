# HRMS Platform — Frontend

React (Vite) frontend for the HRMS backend. Role-based UI for **Employee / Manager / HR / Leadership**, wired exactly to the backend's `/api/v1` endpoints.

## Quick start

```bash
npm install
cp .env.example .env     # points to http://localhost:5000/api/v1 by default
npm run dev              # → http://localhost:5173
```

Start the backend first (`npm run dev` there), then sign in with a seeded user, e.g. `hr@demo.com` / `Password@123`.

## What's inside

| Page | Who sees it | What it does |
|---|---|---|
| Login / Register | public | JWT login; register a new company (tenant + first HR) |
| Dashboard | all | live punch clock (punch in/out), role-scoped stats |
| Directory | all | search + department filter, paginated, click → profile |
| Add employee | HR | full create form; backend emails the invite |
| Employee profile | all (sensitive fields hidden) | contact/employment, self-edit, photo + document upload (Cloudinary), HR offboard |
| Attendance | all | monthly muster with status badges, regularization requests; Team tab (manager), Everyone tab (HR) |
| Leave | all | balance cards, apply (half-day supported), history, cancel |
| Approvals | manager, HR | one inbox for pending leaves + regularizations, approve/reject with comment |
| Org chart | all | reporting tree from `reportingManager` links |
| Reports | HR, leadership | headcount, attendance summary, leave usage, LOP, audit trail; CSV download |
| Organization | HR | tabbed CRUD: departments, designations, shifts, holidays, leave types |

## Architecture notes

- **`src/api/endpoints.js`** — every backend call lives in this one file. If you rename a route on the backend, this is the only place to touch.
- **`src/api/client.js`** — axios instance that attaches the access token and, on 401, silently calls `/auth/refresh` (httpOnly cookie) and retries once. Session expiry redirects to login.
- **`src/context/AuthContext.jsx`** — current user from `/auth/me`; sidebar and routes filter by `user.role`.
- **Design system** — tokens in `src/styles/tokens.css`: register-green + marigold palette, Bricolage Grotesque display, Public Sans body, IBM Plex Mono for everything ledger-like (IDs, dates, punch times).

## CORS reminder

The backend's `CLIENT_URL` env must match this app's origin (default `http://localhost:5173`) since auth uses a credentialed cookie for refresh.
