# HRMS Platform — Backend

Multi-tenant HRMS backend (Phase 1 / MVP per the PRD) built with **Node.js + Express + MongoDB**, **JWT** (access + refresh rotation), **bcryptjs**, **multer + Cloudinary** (photos & documents), and **nodemailer** (emails).

## Quick start

```bash
npm install
cp .env.example .env        # fill in Mongo URI, JWT secrets, Cloudinary, SMTP
npm run seed                # creates Demo Corp tenant + 4 users
npm run dev                 # starts on http://localhost:5000
```

Demo logins (password for all: `Password@123`):

| Email | Role |
|---|---|
| hr@demo.com | HR / Admin |
| manager@demo.com | Reporting Manager |
| employee@demo.com | Employee |
| leader@demo.com | Leadership |

> Cloudinary and SMTP are optional for local dev — uploads fail gracefully and emails are skipped (logged to console) when not configured.

## Architecture

- **Multi-tenancy** — every model carries `tenantId`; the JWT embeds it; `protect` middleware scopes every request. Compound unique indexes are per-tenant.
- **RBAC** — roles: `employee`, `manager`, `hr`, `leadership`. Route-level via `authorize(...)`, record-level (self vs HR) in controllers.
- **Auth** — short-lived access token (15m) + httpOnly refresh cookie with rotation; account locks 15 min after 5 failed logins; audit logging of logins and sensitive actions (immutable `AuditLog` collection).
- **Files** — multer memoryStorage → Cloudinary stream upload (`hrms/<tenantId>/photos|documents`).
- **Email** — nodemailer; invites, approval notifications, password-change alerts. Fire-and-forget so SMTP failure never breaks an API flow.

## API surface (base: `/api/v1`)

### Auth
| Method | Route | Access |
|---|---|---|
| POST | `/auth/register-tenant` | public — new company + first HR user |
| POST | `/auth/login` | public (rate-limited, lockout after 5 fails) |
| POST | `/auth/refresh` | refresh cookie → new access token (rotated) |
| POST | `/auth/logout` | revokes refresh token |
| GET | `/auth/me` | any authenticated user |
| PATCH | `/auth/change-password` | any authenticated user |

### Organization (`/org`)
CRUD for `departments`, `designations`, `shifts`, `holidays` — list open to all roles, write = HR only.

### Employees (`/employees`)
| Method | Route | Access |
|---|---|---|
| POST | `/` | HR — creates record + login, emails invite, auto employee ID, leave balances |
| GET | `/` | all — searchable/paginated directory (`?search=&department=&status=&page=`) |
| GET | `/org-chart` | all — reporting tree (circular hierarchies blocked on write) |
| GET | `/my-team` | manager+ |
| GET/PATCH | `/:id` | self (limited fields) or HR; sensitive fields hidden from others & audit-logged |
| POST | `/:id/photo` | multipart `photo` → Cloudinary |
| POST | `/:id/documents` | multipart `document` → Cloudinary |
| POST | `/:id/exit` | HR — archives record, deactivates login |

### Attendance (`/attendance`)
| Method | Route | Notes |
|---|---|---|
| POST | `/punch` | `{ type:'in'|'out', mode?, location? }` — idempotent per day; shift rules compute present/late/half-day/overtime |
| GET | `/my?month=YYYY-MM` | own muster + summary |
| GET | `/team?date=` / `/all?date=` | manager / HR |
| POST | `/regularize` | window-checked correction request → manager |
| GET | `/regularizations?status=` | role-scoped |
| PATCH | `/regularizations/:id` | `{ action:'approve'|'reject' }` — approval recomputes attendance |

### Leave (`/leave`)
| Method | Route | Notes |
|---|---|---|
| GET/POST/PATCH | `/types` | HR configures policies (quota, accrual, carry-forward, max consecutive, LOP) |
| GET | `/balances/my` | real-time balances |
| PATCH | `/balances` | HR override (audit-logged) |
| POST | `/apply` | balance check (LOP bypasses), overlap block, working-day count (skips weekends/holidays) |
| GET | `/my` · `/requests?status=` | own / team / all |
| PATCH | `/requests/:id` | approve → deduct balance + mark attendance `on-leave` + LOP flagged for payroll |
| PATCH | `/requests/:id/cancel` | restores balance and attendance |

### Other
- `GET /approvals/pending` — MSS one-stop inbox (leaves + regularizations)
- `GET/PATCH /notifications` — in-app notifications, unread count, mark read
- `GET /reports/headcount|attendance-summary|leave-usage|lop|audit-logs` — HR/Leadership, `?format=csv` to export
- `GET /dashboard` — role-scoped widgets

## Response shape

Everything returns `{ success: boolean, message?, data? }`. Errors are centralized: validation → 400, duplicate key → 409, bad token → 401, RBAC → 403.

## Folder structure

```
server.js                 # app entry, security middleware, route mounting
src/
  config/   db.js, cloudinary.js
  middleware/ auth.js (protect + authorize), upload.js (multer), errorHandler.js
  models/   14 schemas, all tenant-scoped + indexed
  controllers/ auth, employee, org, attendance, leave, approval, notification, report, dashboard
  routes/   one router per module
  utils/    tokens, audit, notify, sendEmail, asyncHandler, ApiError
seed.js                   # demo data
```

## What's intentionally left for hardening (PRD later phases)

SSO (Google/Microsoft/SAML), MFA, biometric device sync, GPS geofence enforcement, Redis caching, job queues for async exports, payroll, custom roles with granular permissions, SLA auto-escalation, scheduled report emails.
