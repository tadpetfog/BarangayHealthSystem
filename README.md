# CareTech — Barangay Health Management and Scheduling System

CareTech is a barangay (community) health management and scheduling system. It keeps resident/patient health records, lets residents book appointments at the health center, lets health center staff record the services they provide, and produces simple aggregated health reports.

The repository contains two applications that run separately:

- **`client/`** — a React single-page application (the user interface).
- **`server/`** — an Express REST API backed by MongoDB.

---

## Table of Contents

- [Purpose](#purpose)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Important System Rules](#important-system-rules)
- [API Overview](#api-overview)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Utility Scripts](#utility-scripts)
- [Known Limitations and Notes](#known-limitations-and-notes)

---

## Purpose

Barangay health centers need a simple way to manage the residents they serve, schedule visits without double-booking, record the health services provided during a visit, and view basic statistics. CareTech provides:

- A public landing page and resident self-registration.
- A resident portal for personal health information, health-service browsing, appointment booking, and appointment management.
- A health-center workspace (Barangay Health Worker / Health Center Staff / Administrator) for managing patient records, appointments, health services, and consultations.
- Aggregated analytics and a printable/exportable health statistics report.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Axios, Recharts, lucide-react, Tailwind CSS 4 (`@tailwindcss/vite`) |
| Frontend build tooling | Vite 8, oxlint (linting) |
| Backend | Node.js, Express 5, Mongoose 9 |
| Database | MongoDB |
| Authentication | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing |
| Backend tooling | `dotenv`, `cors`, `nodemon` (development) |
| Tests | Node.js built-in test runner (`node --test`) — backend only |

Developed and run with modern Node.js (verified on Node.js v24 and npm 11).

---

## Project Structure

```text
BarangayHealthSystem/
├── client/                        # React + Vite front-end
│   ├── index.html                 # HTML entry point
│   ├── vite.config.js             # Vite configuration (React + Tailwind plugins)
│   ├── .oxlintrc.json             # oxlint rules
│   └── src/
│       ├── main.jsx               # App entry: router and route definitions
│       ├── App.jsx                # Redirects a signed-in user to their dashboard
│       ├── App.css, index.css     # Global styles
│       ├── components/            # Navbar, ProtectedRoute, icons, dashboard UI, landing sections
│       ├── pages/                 # One file per screen
│       │   ├── Landing.jsx, Login.jsx, Register.jsx
│       │   ├── ResidentDashboard.jsx, PatientProfile.jsx, BookAppointment.jsx,
│       │   │   MyAppointments.jsx, HealthServices.jsx
│       │   ├── admin/             # AdminDashboard, Users, Analytics
│       │   ├── bhw/               # BHWDashboard, Patients, Appointments, HealthServices, Consultations
│       │   └── staff/             # StaffDashboard
│       ├── services/api.js        # Axios instance (base URL + auth interceptor)
│       └── utils/                 # availability.js (booking rules), roles.js (role labels)
│
├── server/                        # Express + MongoDB REST API
│   ├── server.js                  # App bootstrap, middleware, route mounting, static admin
│   ├── .env                       # Local environment variables (not committed)
│   ├── config/                    # db, staticAdmin, access (roles/availability), appointmentSlots (capacity), dataIntegrity (cascades)
│   ├── controllers/               # auth, user, patient, appointment, healthService, consultation, analytics
│   ├── middleware/                # authMiddleware (protect, authorize)
│   ├── models/                    # User, Patient, HealthService, Appointment, Consultation
│   ├── routes/                    # One router per resource
│   ├── services/                  # appointmentStatus.js (consultation ↔ appointment status sync)
│   └── tests/                     # node:test suites (appointment slot capacity, status sync)
│
├── scripts/                       # Maintenance utilities (run from the project root with node)
│   ├── seed-static-users.cjs      # Upserts demo BHW/Staff/Admin accounts
│   └── repair-data-integrity.cjs  # Reports/repairs orphaned records and indexes
│
├── package.json                   # Root manifest (holds the Tailwind Vite plugin only)
└── README.md
```

---

## Features

### Authentication and accounts

- **Registration** — anyone can self-register from `/register`; the account is always created with the `resident` role.
- **Login** — email + password; a JWT (valid for **1 day**) is returned and stored in `localStorage`.
- **Session handling** — every API request sends `Authorization: Bearer <token>`. If the API replies `401`, the client clears the stored token/user and redirects to the login page.
- **Route protection** — the `ProtectedRoute` component blocks pages the signed-in role is not allowed to open, and the API re-checks every request (`protect` + `authorize`).
- **Static administrator** — on server start a fixed administrator account is created/updated from `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` (with built-in defaults if those variables are unset). This account cannot be deleted and its email cannot be reused.
- **Log out** — clears the session and returns to the login page (asks for confirmation first).

### Resident functionality

- Personal dashboard with a profile-completeness indicator and appointment count.
- **Patient Information** (`/patient-profile`): create/update the resident's own health record and view an appointment history (with the service, assigned staff, and consultation status).
- **Health Services** (`/health-services`): browse available services and view services already received.
- **Book Appointment** (`/book-appointment`): choose a service, date, and time; the screen shows the service's available days/hours and the remaining capacity for the chosen one-hour period.
- **My Appointments** (`/my-appointments`): view own appointments, **reschedule** (new date/time) or **cancel** an appointment.

### Health center functionality (BHW / Health Center Staff / Administrator)

These roles share the same management screens, reachable under `/bhw/*`, `/staff/*`, and `/admin/*`:

- **Dashboards** with live statistics and quick actions.
- **Patient Records**: create, view, edit, and delete patient records; view a patient's appointment history, including editing or deleting appointments from the history.
- **Appointments**: create, edit, reschedule, and delete appointments for any patient; change status (Pending / Confirmed / Cancelled).
- **Health Services**: add services and delete services.
- **Consultations**: record the service provided after an appointment (which drives appointment status), plus edit and delete consultation records.
- **Reports** (`/…/analytics`): aggregated statistics, charts, a printable "Health Statistics Report", and a CSV download.

### Administrator functionality

- Everything in the health center workspace **plus** **Manage Accounts** (`/admin/users`): create `bhw`, `staff`, and `admin` accounts and delete accounts. Deleting an account also removes the records that belong to it (see [Important System Rules](#important-system-rules)).

### Appointment system

- **Statuses**: `Pending`, `Confirmed`, `Completed`, `Cancelled`.
- **Availability checks when booking** (enforced in the API, mirrored in the UI):
  - The service must exist and be `Active`.
  - The appointment date must be valid, and its weekday must be one of the service's **Available Days**.
  - The appointment time must fall within the service's **Start Time – End Time** window.
- **Capacity — maximum 5 residents per 1-hour appointment period.** Bookings are grouped into one-hour periods by the hour their time falls into (for example `9:00 AM`–`9:59 AM` all belong to the `9:00 AM` period). Only the blocking statuses `Pending`, `Confirmed`, and `Completed` count toward a period; `Cancelled` appointments do not.
- **Remaining-slot display**: the slot endpoint returns `capacity` (5), `booked`, `remaining`, `full`, and the period label, which the UI shows as "X of 5 slots remaining" or a "fully booked" message.
- **Overbooking protection**: if a period fills between the availability check and the save, the API rolls back (deletes) the just-created appointment and returns `409`.
- **Reschedule / cancel**: residents can update their own appointments (new date/time/service or `Cancelled`); health center roles can update any appointment. Changing the date, time, or service re-runs the availability checks.
- **Completion is consultation-driven**: an appointment becomes `Completed` only when its linked consultation is `Completed` (setting it to `Completed` by hand is rejected). A `Cancelled` consultation cancels the appointment, unless a `Completed` consultation exists — completed takes precedence.

---

### Health Services

Each service stores: **name**, **description**, **available days**, **start time**, **end time**, **status** (`Active` / `Inactive`), and an optional **Specific Date**.

- **Available Days** is entered as a comma-separated list (for example `Monday, Tuesday, Friday`).
- **Specific Date** is an optional date picker for pinning a service to one calendar day.
  - When a **Specific Date is selected**, the **Available Days** field is **disabled** (greyed out and unselectable) and cleared, so a service cannot have both at once.
  - When the **Specific Date is cleared**, **Available Days** becomes editable again.
- The saved Specific Date is shown in the service lists (health center and resident views) whenever it is present; services without a date display exactly as before.
- Services with no Specific Date keep using Available Days unchanged.
- **Deleting a service** is refused with a `409` while any appointment still references it, so existing appointment history is never orphaned. Shared service definitions are never removed as a side effect of deleting an account or a patient.

### Health records and consultations

- **Patient record**: one per account, holding full name, birth date, sex, address, and contact number (a unique database index enforces one record per account).
- **Consultation record**: links an appointment, a patient, and the health worker, and stores the service provided, notes, a date, and a status (`Completed` / `Cancelled`). Recording a consultation updates the linked appointment's status.

### Confirmation prompts for important/destructive actions

The interface asks for confirmation **before** the action is executed; choosing Cancel leaves everything unchanged. Confirmation is shown for:

- **Log out**.
- **Deleting**: an account, a health service, an appointment, a consultation, a patient record, or an appointment from a patient's history.
- **Overwriting/updating**: a patient record, an appointment, a consultation, or an appointment in a patient's history.
- **Cancelling or rescheduling** an appointment.

Harmless actions (navigation, viewing details, searching, refreshing, printing/downloading reports, opening/closing menus) intentionally do **not** ask for confirmation.

---

## User Roles and Permissions

There are four roles. `bhw`, `staff`, and `admin` are collectively the **health center** roles.

| Capability | Resident | BHW | Staff | Admin |
| --- | :---: | :---: | :---: | :---: |
| Register / log in | ✅ | ✅ | ✅ | ✅ |
| Manage **own** patient record and profile | ✅ | – | – | – |
| View / create / edit / delete **any** patient record | – | ✅ | ✅ | ✅ |
| Book an appointment (own patient record) | ✅ | – | – | – |
| Create / edit / reschedule / delete appointments for any patient | – | ✅ | ✅ | ✅ |
| View the health service catalogue | ✅ | ✅ | ✅ | ✅ |
| Add / delete health services | – | ✅ | ✅ | ✅ |
| Record / edit / delete consultations | – | ✅ | ✅ | ✅ |
| View reports & analytics | – | ✅ | ✅ | ✅ |
| Create BHW / Staff / Admin accounts, delete accounts | – | – | – | ✅ |

Residents only ever see their own patient record, appointments, and consultations. Health center roles can manage records for the whole barangay. The API enforces these rules on every request, not just in the UI.

---

## Important System Rules

- **Appointment capacity** — a maximum of **5 residents per 1-hour period** (defined by `SLOT_CAPACITY = 5` and `SLOT_MINUTES = 60`).
- **Referential integrity** — MongoDB has no foreign keys, so every delete runs through cascade helpers that remove dependent records first (a patient's appointments and consultations; an appointment's consultations; an account's patient records, their appointments/consultations, and the consultations recorded by that account). Shared data such as health service definitions is never removed by a cascade. When the MongoDB deployment supports transactions (a replica set or sharded cluster) the cascade runs inside one session; on a standalone server it runs sequentially with one retry.
- **Service in use** — a health service cannot be deleted while any appointment references it (`409`).
- **Static administrator** — the fixed administrator account cannot be deleted, its email cannot be reused, and the account you are currently signed in with cannot be deleted.
- **One patient record per account** — enforced by a unique index and re-checked by the API.
- **Appointment completion** — an appointment can only be marked `Completed` through a completed consultation.
- **Passwords** — stored as bcrypt hashes; the API never returns password fields.

---

## API Overview

Base URL: `http://localhost:3000/api` (the client hard-codes this in `client/src/services/api.js`). All routes except `POST /auth/register` and `POST /auth/login` require a valid bearer token.

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/register` | Register a resident account |
| POST | `/auth/login` | Log in and receive a JWT + user |

### Users / Accounts

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/users/residents` | Health center | List resident accounts (for linking patient records) |
| GET | `/users` | Admin | List all accounts |
| POST | `/users` | Admin | Create a `bhw` / `staff` / `admin` account |
| DELETE | `/users/:id` | Admin | Delete an account and its records |

### Patients

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/patients` | Create a patient record |
| GET | `/patients` | List patient records (residents see only their own) |
| GET | `/patients/:id` | Get one patient record |
| PUT | `/patients/:id` | Update a patient record |
| DELETE | `/patients/:id` | Delete a patient record and its history |
| GET | `/patients/:id/history` | Appointment history with consultation/staff details |

### Appointments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/appointments/slot` | Slot availability for `serviceId`, `date`, `time` |
| POST | `/appointments` | Book an appointment |
| GET | `/appointments` | List appointments (optional `?patientId=`) |
| PUT | `/appointments/:id` | Reschedule / update status |
| DELETE | `/appointments/:id` | Delete an appointment and its consultations |

### Health Services

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/health-services` | Any authenticated | List services |
| GET | `/health-services/:id` | Any authenticated | Get one service |
| POST | `/health-services` | Health center | Create a service |
| PUT | `/health-services/:id` | Health center | Update a service |
| DELETE | `/health-services/:id` | Health center | Delete a service (if unused) |

### Consultations

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/consultations` | Any authenticated | List consultations |
| POST | `/consultations` | Health center | Record a consultation |
| PUT | `/consultations/:id` | Health center | Update a consultation |
| DELETE | `/consultations/:id` | Health center | Delete a consultation |
| POST | `/consultations/:id/complete` | Any authenticated | Complete a consultation |

### Analytics

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/analytics` | Health center | Aggregated statistics |

---

## Getting Started

### 1. Prerequisites

- **Node.js** (LTS release, with `npm`). The project was run with Node.js v24 / npm 11.
- **MongoDB** — either a local MongoDB server or a hosted connection string (for example MongoDB Atlas). No manual schema setup is required; collections and indexes are created automatically.

### 2. Clone the repository

```bash
git clone https://github.com/tadpetfog/BarangayHealthSystem.git
cd BarangayHealthSystem
```

### 3. Install dependencies

The frontend and backend each have their own `package.json`, so install them separately:

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

> The root `package.json` only declares the Tailwind Vite plugin and has no scripts; running `npm install` there is not required to start the app.

### 4. Configure the backend environment

Create a `.env` file inside the `server/` directory (it is git-ignored). See [Environment Variables](#environment-variables) for details.

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/barangay_health_db
JWT_SECRET=replace_with_a_long_random_secret
```

### 5. Start MongoDB

- **Local server** — make sure MongoDB is running (for example `mongod` as a service) and that `MONGO_URI` points at it. The default database name used by the scripts is `barangay_health_db`.
- **Hosted** — paste your connection string into `MONGO_URI`.

On startup the server connects to MongoDB and ensures the static administrator account exists.

### 6. Start the backend

```bash
cd server
npm run dev      # nodemon: restarts automatically on changes
```

or, without auto-reload:

```bash
cd server
npm start        # node server.js
```

The API listens on `http://localhost:3000` (or your `PORT`) and exposes `/api/*`.

### 7. Start the frontend

In a second terminal:

```bash
cd client
npm run dev
```

Vite serves the app at `http://localhost:5173` by default. Open it in a browser. The frontend talks to the API at `http://localhost:3000/api` (configured in `client/src/services/api.js`), so the backend must be running.

### 8. Run the tests

The backend ships with Node's built-in test runner suites:

```bash
cd server
npm test         # runs `node --test`
```

These cover the appointment slot capacity rules and consultation→appointment status synchronisation. There is no frontend test suite.

Optional frontend lint:

```bash
cd client
npm run lint     # oxlint
```

### 9. Create a production build

```bash
cd client
npm run build    # bundles the app into client/dist
npm run preview  # serves the production build locally to verify it
```

Serve the contents of `client/dist` with any static web server for production, and point it at a running backend.

---

## Environment Variables

All backend environment variables live in `server/.env` (git-ignored). Use placeholders like the example below — never commit real secrets.

```env
# Required
MONGO_URI=mongodb://localhost:27017/barangay_health_db
JWT_SECRET=your_secret_here

# Optional
PORT=3000
ADMIN_NAME=your_admin_display_name
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
```

| Variable | Required | Used for |
| --- | :---: | --- |
| `MONGO_URI` | ✅ | MongoDB connection string used by `server/config/db.js`. |
| `JWT_SECRET` | ✅ | Secret used to sign and verify authentication tokens (`jsonwebtoken`). |
| `PORT` | – | Port the API listens on. Defaults to `3000` in `server.js`. |
| `ADMIN_NAME` | – | Display name of the static administrator seeded on startup. Has a built-in default. |
| `ADMIN_EMAIL` | – | Email of the static administrator. This account cannot be deleted and its email cannot be reused. Has a built-in default. |
| `ADMIN_PASSWORD` | – | Password of the static administrator (hashed with bcrypt on startup). Has a built-in default. |

> **Security note:** set a strong, unique `JWT_SECRET` and non-default administrator credentials before any real deployment, and keep `.env` out of version control.

---

## Utility Scripts

Both scripts are run from the **project root** and load the server's dependencies from `server/node_modules`. They read `MONGO_URI` from `server/.env` (falling back to `mongodb://localhost:27017/barangay_health_db`).

**Seed demo accounts**

```bash
node scripts/seed-static-users.cjs
```

Upserts a Barangay Health Worker, a Health Center Staff, and the administrator account (bcrypt-hashed passwords), and prints the created/updated accounts and their credentials to the console. Useful for quickly getting logins to try each role.

**Repair data integrity**

```bash
node scripts/repair-data-integrity.cjs
```

Reports and cleans up records left behind by older versions of the API — orphaned patient records, duplicate patient records per account, and appointments/consultations missing a patient, appointment, or health worker — then prints the resulting collection indexes. Appointments that point at a health service that no longer exists are only **reported** by default, because they hold scheduling data. To resolve them explicitly:

```bash
node scripts/repair-data-integrity.cjs --reassign-service=<healthServiceId>
node scripts/repair-data-integrity.cjs --delete-orphans
```

---

## Known Limitations and Notes

- **API base URL is hard-coded** in `client/src/services/api.js` (`http://localhost:3000/api`). There is no frontend environment variable for it — edit that file to point the app at a different backend host.
- **Specific Date is catalog/display only.** Appointment availability is validated against **Available Days** (`server/config/access.js` and `client/src/utils/availability.js`); the Specific Date is stored and displayed but is not currently consulted by the booking availability check. A service created with only a Specific Date and no Available Days would therefore not pass the day-based availability check.
- **Health service status** is created as `Active` by default. The schema and API support `Active`/`Inactive`, but the current UI does not expose a control to toggle it.
- **No self-service password reset, email verification, or account lockout.**
- **Token storage** — the JWT is kept in `localStorage` and expires after 1 day; there is no refresh-token flow.
- **CORS and rate limiting** — the API uses open CORS (`app.use(cors())`) with no rate limiting, which is convenient for local/barangay use but should be reviewed before public exposure.
- **Transactions** — cascade deletes run atomically only when MongoDB supports transactions (a replica set / sharded cluster). On a standalone server they run sequentially with one retry.
- **Testing** — only the backend has automated tests (`node:test`); there is no frontend test suite.
