# HRMS Platform — Full Stack (MERN)

Multi-tenant Human Resource Management System: **MongoDB + Express + React + Node.js**, with **JWT** (access + refresh rotation), **bcryptjs**, **multer + Cloudinary** (photos & documents), and **nodemailer** (emails). Implements Phase 1 (MVP) of the Project Requirements Document: Auth/RBAC/Multi-tenancy, Organization & Employee Management, Attendance, Leave, Self-Service, Approvals, Notifications, and Reporting.

```
hrms-platform/
├── backend/     Express API  → http://localhost:5000   (see backend/README.md)
└── frontend/    React (Vite) → http://localhost:5173   (see frontend/README.md)
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a free MongoDB Atlas URI
- Optional: Cloudinary account (file uploads) and SMTP credentials (emails) — the app runs fine without both; uploads fail gracefully and emails are logged to the console instead.

## Run the full stack (5 minutes)

**Terminal 1 — backend**
```bash
cd backend
npm install
cp .env.example .env        # set MONGO_URI + change the two JWT secrets
npm run seed                # creates the "Demo Corp" tenant + 4 users
npm run dev                 # API on http://localhost:5000
```

**Terminal 2 — frontend**
```bash
cd frontend
npm install
cp .env.example .env        # already points to http://localhost:5000/api/v1
npm run dev                 # app on http://localhost:5173
```

**Sign in** at http://localhost:5173 — password for all demo users: `Password@123`

| Email | Role | What they can do |
|---|---|---|
| employee@demo.com | Employee | punch, apply leave, edit own profile |
| manager@demo.com | Manager | + team attendance, approvals inbox |
| hr@demo.com | HR / Admin | + manage employees, org settings, reports, audit trail |
| leader@demo.com | Leadership | org-wide dashboards & reports (read-mostly) |

## Suggested first demo flow

1. Sign in as **employee@demo.com** → punch in from the dashboard clock → apply for Casual Leave.
2. Sign in as **manager@demo.com** → Approvals → approve the leave (add a comment).
3. Back as the employee → balance dropped, attendance shows `on-leave`, notification received.
4. As **hr@demo.com** → Directory → Add employee (invite email is sent / logged) → Reports → download Attendance CSV → check the Audit trail.

## How the pieces talk

- The frontend keeps the **access token** (15 min) and sends it as `Authorization: Bearer`; the **refresh token** lives in an httpOnly cookie scoped to `/api/v1/auth`. On 401 the frontend silently refreshes and retries — tokens rotate on every refresh.
- CORS is credentialed: backend `CLIENT_URL` must equal the frontend origin (`http://localhost:5173` by default), or login will fail in the browser.
- Every API response is `{ success, message?, data? }` and every record is scoped by `tenantId` — a user in one company can never see another company's data.
- All frontend API calls live in **`frontend/src/api/endpoints.js`**; all backend routes mount in **`backend/server.js`**. Change a route in one, fix it in the other — one file each.

## Production checklist (before you deploy)

- Set strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`, `NODE_ENV=production`, and a real `MONGO_URI` (Atlas with replica set).
- Set `CLIENT_URL` to your deployed frontend origin (HTTPS) — the refresh cookie switches to `secure; SameSite=None` automatically in production.
- Configure Cloudinary + SMTP env vars.
- Serve the frontend's `npm run build` output (the `dist/` folder) from any static host; point `VITE_API_URL` at the deployed API.
- Not yet implemented (per PRD later phases): SSO/SAML, MFA, biometric device sync, GPS geofence enforcement, Redis, job queues, payroll, SLA auto-escalation.

## Module map (PRD § → code)

| PRD module | Backend | Frontend |
|---|---|---|
| 6.1 Auth, RBAC, Multi-tenancy | `controllers/auth.controller.js`, `middleware/auth.js`, `models/User.js`, `models/AuditLog.js` | `pages/Login.jsx`, `pages/RegisterTenant.jsx`, `context/AuthContext.jsx`, `api/client.js` |
| 6.2 Organization & Employees | `controllers/employee.controller.js`, `controllers/org.controller.js` | `pages/Directory.jsx`, `EmployeeNew.jsx`, `EmployeeDetail.jsx`, `OrgChart.jsx`, `OrgSettings.jsx` |
| 6.3 Attendance | `controllers/attendance.controller.js`, `models/Shift.js` | `pages/Attendance.jsx`, punch clock in `Dashboard.jsx` |
| 6.4 Leave | `controllers/leave.controller.js` | `pages/Leave.jsx` |
| 6.5 Self-Service (ESS/MSS) | record-level permissions in controllers | self-edit + uploads in `EmployeeDetail.jsx`, role-scoped `Dashboard.jsx` |
| 6.6 Workflow & Approvals | `controllers/approval.controller.js` + per-module act endpoints | `pages/Approvals.jsx` |
| 6.7 Notifications | `utils/notify.js`, `utils/sendEmail.js`, `controllers/notification.controller.js` | `components/NotificationBell.jsx` |
| 6.8 Reporting & Dashboards | `controllers/report.controller.js`, `dashboard.controller.js` | `pages/Reports.jsx`, `Dashboard.jsx` |
