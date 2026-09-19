# DineFlow

**High-scale, multi-tenant Point of Sale** for restaurants, cafes, fast food, grocery stores, kirana shops, supermarkets, bakeries, and any retail organization.

Nothing is hard-coded to a brand or vertical. Super admins onboard any number of organizations; each tenant has its own catalog, inventory, terminals, staff, orders, payments, and invoices.

Designed for massive volume:

- 100,000+ organizations (tenants)
- Very high daily order/invoice throughput per tenant
- Indexed multi-tenant tables, connection pooling, ORJSON responses
- Paginated APIs and lean POS UI

---

## Quick start

```bash
chmod +x start.sh
./start.sh
```

That single command will:

1. Create/activate the Python virtualenv and install backend deps  
2. Connect to MySQL, create schema/tables, seed super admin  
3. Start **FastAPI** backend on port **8000**  
4. Install frontend deps (if needed) and start **Vite + React** UI on port **3000**

| Service | URL |
|--------|-----|
| UI | http://localhost:3000 |
| API | http://localhost:8000 |
| OpenAPI docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

### Default super admin

| Field | Value |
|-------|--------|
| Username | `superadmin` |
| Password | `superadmin` |
| Email | `superadmin@pos.local` (also accepted at login) |

Login accepts **username or email**. Credentials are re-applied on every seed/migrate.

### MySQL configuration

```
Host:     localhost / 127.0.0.1
Port:     3306
User:     root
Password: Baton@1230
Database: pos_platform
```

Configured in `backend/.env` (never hard-code tenants or shop names).

---

## Architecture

```
POS/
├── start.sh                 # One-command local launcher
├── README.md
├── backend/                 # Python FastAPI API
│   ├── .env
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/             # Alembic migration env
│   ├── scripts/
│   │   └── migrate_and_seed.py   # Creates DB + tables + super admin
│   └── app/
│       ├── main.py          # FastAPI app entry
│       ├── database.py      # Engine, pooling, Base
│       ├── core/            # Config, security, deps
│       ├── models/          # SQLAlchemy models (multi-tenant)
│       ├── schemas/         # Pydantic request/response
│       ├── services/        # Order, inventory business logic
│       ├── api/v1/          # REST routers
│       └── utils/           # Slug, pagination helpers
└── frontend/                # TypeScript React UI
    ├── package.json
    ├── vite.config.ts       # Port 3000 + API proxy
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css        # Themes (light/dark)
        ├── lib/api.ts       # Axios client + types
        ├── store/           # Auth + POS cart (Zustand)
        ├── components/      # Layout, UI kit
        └── pages/           # Dashboard, POS, catalog, etc.
```

---

## Multi-tenant model

| Role | Capabilities |
|------|----------------|
| **Super admin** | Create/manage organizations, create org admins, platform dashboard, switch tenant via `X-Organization-Id` |
| **Org admin** | Manage own catalog, users, terminals, inventory, settings |
| **Manager** | Operational admin of store |
| **Cashier / Staff** | POS, orders, invoices |

Every business entity is scoped by `organization_id`. Super admin sets active tenant in the UI (Organizations → **Use as active tenant**).

Supported business types (dynamic enum, not hard-coded names):

`restaurant`, `cafe`, `fast_food`, `grocery`, `kirana`, `supermarket`, `retail`, `bakery`, `other`

---

## Features

- **Organizations** — create any shop/restaurant; optional first admin user  
- **Users & roles** — super admin → org admin → manager / cashier / staff  
- **Categories & products** — dynamic catalog per tenant (menu or SKUs)  
- **Inventory & stock** — on-hand qty, adjustments, low-stock awareness, sale deductions  
- **POS terminal UI** — fast product grid, cart, order types, discounts  
- **Payments** — cash (with tendered/change), card, UPI  
- **POS machines** — terminals with cash float & printer name  
- **Orders** — open / held / completed / cancelled  
- **Invoices & bills** — snapshot receipt, reprint counter, browser print  
- **Dashboard** — today revenue/orders, low stock, 7-day sparkline  
- **Themes** — light / dark professional UI  

---

## API overview (`/api/v1`)

| Area | Endpoints |
|------|-----------|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password` |
| Organizations | `GET/POST /organizations`, `GET/PATCH /organizations/{id}` |
| Users | `GET/POST /users`, `PATCH /users/{id}` |
| Catalog | `GET/POST /catalog/categories`, `GET/POST/PATCH /catalog/products` |
| Inventory | `POST /catalog/inventory/adjust` |
| Orders | `GET/POST /orders`, `POST /orders/{id}/checkout\|hold\|cancel` |
| Invoices | `GET /invoices`, `POST /invoices/{id}/print` |
| Terminals | `GET/POST /terminals`, customers under same module |
| Dashboard | `GET /dashboard/summary` |

Header for super admin tenant context:

```
X-Organization-Id: <tenant id>
Authorization: Bearer <access_token>
```

---

## Database & migrations

On every `./start.sh` (or manually):

```bash
cd backend
source .venv/bin/activate
python scripts/migrate_and_seed.py
```

This:

1. Creates database `pos_platform` if missing  
2. Creates all tables from SQLAlchemy models (idempotent)  
3. Seeds super admin if not present  

Alembic is configured under `backend/alembic/` for future revisioned migrations:

```bash
cd backend && source .venv/bin/activate
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### Core tables

`organizations`, `users`, `categories`, `products`, `inventory_items`, `stock_movements`, `customers`, `terminals`, `orders`, `order_items`, `payments`, `invoices`, `tax_rates`, `audit_logs`

Indexes are composite on `(organization_id, …)` for tenant-isolated queries at scale. Connection pool defaults: `pool_size=50`, `max_overflow=100`.

---

## Frontend stack

- React 19 + TypeScript  
- Vite (dev server **port 3000**)  
- Tailwind CSS v4 (themes)  
- TanStack Query, Zustand, Axios, React Router, Lucide icons  

Proxy: `/api` → `http://127.0.0.1:8000`

---

## Backend stack

- Python 3.10+  
- FastAPI + Uvicorn  
- SQLAlchemy 2.x + PyMySQL  
- Alembic  
- JWT (python-jose) + bcrypt  
- ORJSON for fast JSON  

---

## Typical first-run flow

1. `./start.sh`  
2. Open http://localhost:3000 → login as super admin  
3. **Organizations** → create e.g. “City Cafe” or “Patel Kirana”  
4. Click **Use as active tenant**  
5. Add **Categories**, **Products**, a **POS Machine**  
6. Open **POS Terminal** → sell → pay cash/card/UPI → print bill  
7. Review **Orders**, **Invoices**, **Inventory**, **Dashboard**  
8. **Users** → create org admin / cashier for that tenant  

---

## Logs & stop

- Logs: `.logs/backend.log`, `.logs/frontend.log`  
- Stop: `Ctrl+C` in the terminal running `start.sh`  

---

## Scale notes

- Tenant isolation via `organization_id` on all operational tables  
- Composite unique keys (e.g. org + order_number, org + SKU)  
- Invoice `snapshot` JSON avoids heavy joins for reprints  
- Pagination on all list endpoints (max page size capped)  
- Stateless JWT API — horizontally scalable behind a load balancer  
- Tune MySQL buffer pool / add read replicas for 1L+ orgs × high daily bills  

---

## License

Private / internal use unless otherwise specified.
