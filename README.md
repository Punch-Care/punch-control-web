# punch-control-web

Frontend for **Punch Control** — a SaaS system for managing punch tooling in pharmaceutical manufacturing.

Built with **Vite + React + TypeScript + Tailwind CSS**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Build tool | Vite 5 |
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS + Radix UI |
| State | Zustand (auth), TanStack React Query (server) |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Charts | Recharts |
| Routing | React Router 6 |
| Notifications | Sonner |

---

## Project Structure

```
src/
  components/
    layout/
      AppLayout.tsx         # Main shell: sidebar + top bar + outlet
      AuthLayout.tsx        # Wrapper for login page
      DeveloperCredit.tsx   # Footer attribution
    ui/                     # Radix UI + Tailwind component library
      badge, button, card, dialog, input, label, select, table

  hooks/
    useAuth.ts              # Auth state helpers (login, logout, user)

  lib/
    api.ts                  # Axios instance — auto-injects JWT, handles 401
    utils.ts                # cn() helper (clsx + tailwind-merge)

  pages/
    auth/         LoginPage.tsx
    dashboard/    DashboardPage.tsx   # KPI cards + pie chart + open occurrences
    sets/         SetsPage.tsx        # Punch set CRUD + useful life bar
    dimensioning/ DimensioningPage.tsx# Dimensional records per set
    occurrences/  OccurrencesPage.tsx # Occurrence registration + workflow
    lifecycle/    LifecyclePage.tsx   # Status transition history
    reports/      ReportsPage.tsx     # Tables + CSV export (3 report types)
    companies/    CompaniesPage.tsx   # Company CRUD (admin/manager only)
    users/        UsersPage.tsx       # User CRUD (admin/manager/company)
    landing/      LandingPage.tsx     # Public marketing page

  routes/
    index.tsx           # Router definition (public + private routes)
    PrivateRoute.tsx    # Auth guard — redirects to /login if unauthenticated
    PublicOnlyRoute.tsx # Redirects authenticated users to /dashboard

  store/
    auth.store.ts       # Zustand store — token + user, persisted to localStorage

  types/
    index.ts            # TypeScript interfaces for all API entities
```

---

## Pages & Routes

| Route | Page | Access |
|---|---|---|
| `/` | Landing page | Public |
| `/login` | Login | Public (redirects if authenticated) |
| `/dashboard` | Dashboard | All authenticated |
| `/sets` | Punch Sets | All authenticated |
| `/dimensioning` | Dimensional Control | All authenticated |
| `/occurrences` | Occurrences | All authenticated |
| `/lifecycle` | Lifecycle | All authenticated |
| `/reports` | Reports & Export | All authenticated |
| `/companies` | Companies | ADMIN / MANAGER |
| `/users` | Users | ADMIN / MANAGER / COMPANY |

---

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

The Axios base URL defaults to this value. For production it should point to the deployed API.

### 3. Start development server

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## Test Users (requires seed on the API)

> Run `npm run db:seed` in `punch-control-service` first.

| Role | Email | Password | Scope |
|---|---|---|---|
| **ADMIN** | `admin@punchcontrol.com` | `admin123` | All companies, all features |
| **MANAGER** | `manager@punchcontrol.com` | `manager123` | All companies, all features |
| **COMPANY** | `gestor@pharmaco.com` | `company123` | PharmaCo only |
| **CLIENT** | `tecnico@pharmaco.com` | `client123` | PharmaCo — read + record |
| **COMPANY** | `gestor@medipress.com` | `company123` | MediPress only |
| **CLIENT** | `tecnico@medipress.com` | `client123` | MediPress — read + record |

### What each role sees

- **ADMIN / MANAGER** — sidebar shows Companies and Users sections; data from all companies visible; company selector available on set/occurrence creation forms.
- **COMPANY** — sidebar hides Companies; all data scoped to own company; can create CLIENT users only.
- **CLIENT** — same scoping as COMPANY; cannot create users.

---

## Available Scripts

```bash
npm run dev          # Start dev server (Vite HMR)
npm run build        # Type-check + production build → dist/
npm run preview      # Preview production build locally
npm run type-check   # TypeScript check without emitting
```

---

## Deployment

Deployed on **Vercel**. Configuration in `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

The `rewrites` rule ensures React Router handles all client-side navigation correctly.

Set `VITE_API_URL` as an environment variable in the Vercel project dashboard pointing to the production API URL.
