# DineFlow

**Enterprise-Grade, High-Scale Multi-Tenant Point of Sale (POS) & Restaurant / Retail Management Platform**

[![Python Version](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC.svg)](https://tailwindcss.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%7C%20TiDB%20Cloud-orange.svg)](https://www.mysql.com/)

---

## Overview

**DineFlow** is a modern, high-performance, multi-tenant Point of Sale (POS) and store management platform designed for restaurants, cafes, quick-service restaurants (QSR), cloud kitchens, grocery stores, kirana shops, supermarkets, bakeries, and retail chains.

The architecture is built from the ground up to support **massive multi-tenant volume**:
- **100,000+ independent organizations** with strict data isolation
- High daily order and invoice throughput per tenant with zero cross-tenant data leakage
- Indexed multi-tenant tables, SQLAlchemy 2.0 connection pooling, and blazing-fast ORJSON response serialization
- Dual execution modes: local Vite dev server with proxy, or standalone FastAPI serving the compiled React single-page application (SPA)
- Advanced restaurant operations (Floors, Dining Tables, Waiters, Kitchen Order Tickets / KOT)
- 30-report analytical engine with on-screen preview and instant XLSX / PDF exports
- Built-in multi-currency engine with live exchange rates (base currency AED default)
- Dynamic promotions, coupon codes, and seasonal item-level discount rules
- Full Content Management System (CMS) for the public landing page with inbound contact lead capture
- Dark / Light theme support and Internationalization (i18n) for English and German

---

## Quick Start (Local Development)

Launch the entire stack with a single command:

```bash
chmod +x start.sh
./start.sh
```

### What `start.sh` does automatically:
1. Creates and activates Python virtualenv (`backend/.venv`) and installs backend dependencies
2. Connects to MySQL/TiDB, verifies connectivity, executes schema migrations, and seeds the super admin, core modules, base currencies, and landing CMS
3. Starts the **FastAPI** backend server on `http://127.0.0.1:8000` with auto-reload
4. Installs frontend dependencies (if not present) and starts the **Vite + React** UI on `http://127.0.0.1:3000`
5. Monitors health endpoints and streams live color-coded logs

### Service URLs

| Service | Local Address | Description |
| :--- | :--- | :--- |
| **Frontend UI (Dev)** | `http://localhost:3000` | React 19 + Vite dashboard & POS interface |
| **FastAPI Backend** | `http://localhost:8000` | REST API service |
| **Interactive API Docs** | `http://localhost:8000/docs` | Swagger UI OpenAPI documentation |
| **ReDoc API Explorer** | `http://localhost:8000/redoc` | ReDoc alternative API specifications |
| **Health Endpoint** | `http://localhost:8000/health` | Service status and runtime environment |

---

## Authentication & Credentials

### Default Super Admin Account

| Field | Default / Fallback Value |
| :--- | :--- |
| **Username** | `superadmin` |
| **Email** | `superadmin@yopmail.com` *(or `superadmin@pos.local`)* |
| **Password** | `DineFlow@1290` *(or value set in `backend/.env`)* |

> [!NOTE]
> Login supports either **username** or **email**. The super admin credentials can be customized at any time in `backend/.env` using `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD`.

---

## Demo Data & Simulation Scripts

DineFlow ships with automated database reset and production-grade restaurant seed scripts containing 30 days of realistic transaction data, peak hour distributions, authentic menus, HD culinary photography, floor layouts, and staff accounts.

### 1. Complete Database Wipe & Reseed

Drops the database, creates fresh tables, bootstraps core modules, and loads complete demo data:

```bash
cd backend
source .venv/bin/activate
python scripts/reset_and_reseed_all.py
```

### 2. Standalone Restaurant Demo Seed

Populates 3 realistic dining establishments with 30 days of sales history:

```bash
cd backend
source .venv/bin/activate
python scripts/demo_chennai_seed.py
```

#### Seeded Demo Organizations & Accounts

| Organization | Type | Admin Email | Password | PIN Code |
| :--- | :--- | :--- | :--- | :--- |
| **The Copper Chimney Bistro & Grill** | Casual / Fine Dining | `admin@copperchimney.in` | `admin@copperchimney.in` | `1234` |
| **Saravana Traditional Heritage Bhavan** | Vegetarian QSR & Tiffin | `admin@saravanabhavan.in` | `admin@saravanabhavan.in` | `1234` |
| **Cafe Milano Artisan Roastery & Pizzeria** | Bistro, Cafe & Bakery | `admin@cafemilano.in` | `admin@cafemilano.in` | `1234` |

> [!TIP]
> For all seeded demo accounts (Managers, Cashiers, Waiters), the password is equal to the account's email address and the fast POS PIN code is `1234`.

---

## Feature Matrix

### 1. High-Speed POS Terminal
- **Responsive Product Grid**: Food photography, veg / non-veg indicators, real-time search by title, SKU, or barcode.
- **Fast Category Filtering**: Color-coded category chips with product counts.
- **Order Management**: Support for Dine-In, Takeaway, Delivery, Drive-Thru, and Quick-Service order types.
- **Table & Waiter Dispatch**: Assign dining tables and servers directly from the POS cart.
- **Dynamic Cart Calculations**: Automated tax computations, line-item discounts, and order-level coupon codes.
- **Cash Tender & Change Assistant**: Instant change computation and denomination guidance.
- **Split & Multi-tender Payments**: Cash, Card, UPI, and customer credit billing.
- **KOT & Receipt Printing**: Thermal receipt formatting, browser printing, and Kitchen Order Ticket (KOT) generation with reprint protection.
- **Mobile Responsive Drawer View**: Dedicated mobile tabs switching smoothly between the product catalog and the cart.

### 2. Restaurant Operations Management
- **Dining Floor / Area Plans**: AC Hall, Non-AC, Garden, Rooftop, Terrace, and Family Dining zones.
- **Table Occupancy Live Status**: Table capacity tracking, occupied / vacant state toggles.
- **Server / Waiter Management**: Staff directory with mobile numbers and unique waiter codes.
- **Kitchen Order Tickets (KOT)**: Sequential KOT numbering, item-level special cooking instructions, and kitchen dispatch tracking.
- **Tax Configurations**: Multi-tier tax engine supporting GST (CGST/SGST), VAT, compound taxes, and tax-inclusive / tax-exclusive pricing.

### 3. Catalog & Inventory Control
- **Dynamic Categories**: Hierarchical categories with custom color tagging and sort orders.
- **Product Master**: SKUs, barcodes, cost price, selling price, tax associations, and image uploads.
- **Real-Time Inventory Tracking**: Quantity on hand, reserved quantities, and reorder threshold alerts.
- **Stock Movement Ledger**: Complete audit trail recording Purchases, Adjustments, Sales, Returns, and Wastage/Damages.

### 4. Report Hub (30 Enterprise Reports)
Built-in reporting suite with live date filtering, KPI summaries, and export capabilities to **XLSX** and **PDF**:

#### Tenant / Organization Reports (25):
- Cashier Summary & Daily Sales Register
- Sales Detailed (Line Items) & Item-Wise Sales
- Category-Wise Sales & Hourly Sales Heatmap
- Payment Method Mix & Bill Type Summary (Cash / Card / UPI / Credit)
- Order Type Summary (Dine-In, Takeaway, Delivery)
- Tax Collected Report & Discount Given Analysis
- Cancelled / Void Orders & Open / Held Orders
- Customer-Wise Sales & Cashier Performance
- Terminal / POS Machine Sales
- Stock On Hand & Low Stock Warning Alerts
- Product Catalog Export, Top Revenue Movers & Slow Movers
- Margin Proxy Analysis (Price vs. Cost) & Sales by Calendar Day
- Refund Register

#### Platform / Super Admin Reports (5):
- All Organizations Directory & Platform Revenue by Tenant
- Platform Order Volume Rollups
- Platform Users Directory & Product Counts Across Organizations

### 5. Dynamic Discounts & Promotion Engine
- Rule-based coupon codes with expiry dates and minimum order spend requirements.
- Flat amount or percentage-based seasonal discounts.
- SKU-targeted promotions and category-wide promotional campaigns.
- Complete redemption ledger tracking discount usage per order.

### 6. Multi-Currency Management
- Base currency configuration (default `AED`, adaptable to `INR`, `USD`, `EUR`, `GBP`, `SAR`, etc.).
- Daily exchange rate table with automated conversion calculations.
- Configurable decimal precision (e.g. 3 decimals for KWD, BHD, OMR; 2 decimals for USD, AED, INR).

### 7. Enterprise RBAC & Security
- **Hierarchical Roles**: `super_admin`, `platform_operator`, `org_admin`, `manager`, `cashier`, `staff`, `kitchen`.
- Granular module permissions for POS, Catalog, Inventory, Sales, Reports, Table Ops, and System Settings.
- Quick PIN-based cashier login option for shared POS terminals.
- JWT Bearer Authentication with configurable access and refresh token lifespans.

### 8. Landing Page CMS & Contact Leads
- Public-facing modern landing page (`/`) showcasing platform features, screenshots, and pricing.
- Backend CMS admin interface (`/app/cms`) to update landing banners, feature highlights, and careers.
- Inbound contact and enterprise demo request form storing leads directly into the Super Admin inbox.

### 9. Internationalization & Themes
- Built-in multi-language translation engine (`/src/i18n`) with full support for **English (`en`)** and **German (`de`)**.
- System-wide Dark / Light theme toggle with high-contrast color palettes.

---

## Multi-Tenant Architecture & Data Isolation

DineFlow enforces tenant isolation across all business queries:

```
                      ┌────────────────────────────────────────┐
                      │             FastAPI Backend            │
                      └───────────────────┬────────────────────┘
                                          │
                  Header: X-Organization-Id: <id> (or JWT claim)
                                          │
                  ┌───────────────────────┴────────────────────────┐
                  │                                                │
         ┌────────▼─────────┐                            ┌─────────▼────────┐
         │   Tenant A (1)   │                            │   Tenant B (2)   │
         ├──────────────────┤                            ├──────────────────┤
         │ • Copper Chimney │                            │ • Saravana Bv    │
         │ • Menu / Catalog │                            │ • Menu / Catalog │
         │ • Tables & Staff │                            │ • Tables & Staff │
         │ • Orders/Invoices│                            │ • Orders/Invoices│
         │ • Stock & Ledger │                            │ • Stock & Ledger │
         └──────────────────┘                            └──────────────────┘
```

- Operational tables include `organization_id` foreign keys indexed with composite keys (e.g. `(organization_id, order_number)`, `(organization_id, sku)`).
- Super Admins can dynamically switch between tenant contexts using the UI organization picker or by providing the `X-Organization-Id` HTTP header.
- Organization admins and staff are strictly restricted to their own tenant records via backend dependency injection (`resolve_organization_id`).

---

## Directory Structure

```
ResPOS/
├── start.sh                 # One-command local startup script
├── deploy.sh                # Production zero-downtime deployment script
├── runtime.txt              # Python runtime specification (3.12.11)
├── .python-version          # pyenv / tooling python version (3.12)
├── README.md                # Platform documentation
│
├── backend/                 # FastAPI Python Backend
│   ├── .env                 # Active environment configuration
│   ├── .env.example         # Environment template
│   ├── requirements.txt     # Python backend dependencies
│   ├── alembic.ini          # Alembic database migration config
│   ├── alembic/             # Database migration versions
│   ├── scripts/
│   │   ├── migrate_and_seed.py   # Schema creation & initial bootstrap
│   │   ├── demo_chennai_seed.py  # Realistic 30-day restaurant simulation seed
│   │   ├── reset_and_reseed_all.py # Drop DB, re-migrate, and full re-seed
│   │   └── cms_landing_seed.json # Initial landing page CMS content
│   └── app/
│       ├── main.py          # FastAPI application & static SPA mount
│       ├── database.py      # SQLAlchemy connection engine & pooling
│       ├── core/            # Config, security, JWT, and auth dependencies
│       ├── models/          # Multi-tenant SQLAlchemy models
│       ├── schemas/         # Pydantic validation schemas
│       ├── services/        # Order math, inventory ledger, report generation
│       ├── utils/           # Pagination, slug generation, number formats
│       └── api/v1/          # RESTful API route controllers
│
└── frontend/                # React 19 + TypeScript Frontend
    ├── package.json         # Node.js dependencies and scripts
    ├── vite.config.ts       # Vite build setup & API proxying
    ├── index.html           # SPA entry point
    └── src/
        ├── main.tsx         # React root mounting
        ├── App.tsx          # Application router & error boundary
        ├── index.css        # Tailwind CSS v4 & theme variables
        ├── i18n/            # Translations (en, de) & i18n store
        ├── lib/api.ts       # Axios client with tenant headers & auth interceptors
        ├── store/           # Zustand state management (authStore, posStore)
        ├── components/      # UI components, layout, navbar, modals, badges
        └── pages/           # 24 production pages (POS, Dashboard, Reports, etc.)
```

---

## REST API Overview (`/api/v1`)

| Prefix | Tags | Description |
| :--- | :--- | :--- |
| `/auth` | Auth | Login, token refresh, current user profile, password change |
| `/organizations` | Organizations | Tenant management, creation, settings, and active tenant selection |
| `/users` | Users | User management, role assignment, and PIN codes |
| `/catalog` | Catalog & Inventory | Product and category CRUD, stock adjustments, movement history |
| `/orders` | Orders & POS | POS order checkout, hold orders, cancellation, order items |
| `/invoices` | Invoices | Invoice listing, immutable receipt snapshots, reprint counter |
| `/terminals` | Terminals | POS hardware terminal registration and cash float tracking |
| `/restaurant` | Restaurant Module | Floor plans, dining tables, waiters, tax rates, and KOT tracking |
| `/report-hub` | Report Hub | 30 comprehensive reports with on-screen data and XLSX / PDF export |
| `/reports` | Reports Classic | High-level sales summaries and chart rollups |
| `/currency` | Multi Currency | Currency directory, active currency toggles, exchange rates |
| `/dynamic-discount-...`| Discount Engine | Rule definitions, coupons, seasonal offers, and redemption records |
| `/super-admin-platform-...`| Platform RBAC | Super admin operators and system-level module permissions |
| `/organization-owner-...` | Staff RBAC | Store staff creation and custom permission matrix |
| `/cms` | CMS | Landing page sections, career postings, social links, lead inbox |
| `/media` | Media Upload | Image uploads for products, categories, and logos |
| `/dashboard` | Dashboard | Platform summary and tenant-level KPIs |

---

## Database Configuration & Cloud SSL

Configured via `backend/.env`:

```ini
# Database Connection
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pos_platform

# Connection Pooling & Tuning
DB_POOL_SIZE=50
DB_MAX_OVERFLOW=100
DB_POOL_RECYCLE=1800

# Managed Database SSL (TiDB Cloud, AWS RDS, GCP Cloud SQL)
DB_SSL=false
DB_SSL_CA=/etc/ssl/certs/ca-certificates.crt

# Security & Tokens
SECRET_KEY=generate-a-secure-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# Super Admin Bootstrap Credentials
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_EMAIL=superadmin@yopmail.com
SUPER_ADMIN_PASSWORD=DineFlow@1290
SUPER_ADMIN_NAME=Super Admin
BASE_CURRENCY=AED
```

---

## Production Deployment

DineFlow supports automated, zero-downtime production deployment using `deploy.sh`.

### 1. Zero-Downtime Server Update

```bash
chmod +x deploy.sh
./deploy.sh
```

### What `deploy.sh` does on the server:
- Preserves existing production `.env` and database configuration
- Installs backend dependencies and applies non-destructive schema migrations
- Builds the React frontend bundle (`npm run build` into `frontend/dist`)
- Restarts the systemd API service (`dineflow-api`)
- Reloads Nginx reverse proxy
- Executes health check verification on `http://127.0.0.1:8000/health`

### 2. Standalone Single-Port Hosting

FastAPI in `backend/app/main.py` is configured to mount and serve the built React application from `frontend/dist`. 

When `frontend/dist` exists, running only the backend will serve both the REST API and the frontend UI from port `8000`:
- `/api/v1/*` → Backend API endpoints
- `/assets/*` → Static JS / CSS bundles
- `/*` → Catch-all routing to `index.html` for client-side navigation

---

## System Requirements

- **Operating System**: Linux (Ubuntu / Debian / CentOS / Fedora), macOS, or Windows (WSL2)
- **Python**: 3.10 to 3.12 (Python 3.12 recommended)
- **Node.js**: 18+ or 20+ LTS
- **Database**: MySQL 8.0+, MariaDB 10.5+, or TiDB Cloud (MySQL-compatible)
- **Memory**: Minimum 2 GB RAM (4 GB+ recommended for large report exports)

---

## License

Private and proprietary software. All rights reserved.
