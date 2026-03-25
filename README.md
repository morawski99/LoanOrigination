# LoanOrigination

Enterprise Home Loan Origination System built for end-to-end mortgage processing — from application intake through closing — with full regulatory compliance.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5.5, Vite, TailwindCSS |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic |
| **Database** | PostgreSQL 16 (prod), SQLite (dev) |
| **Task Queue** | Celery + Redis |
| **Auth** | JWT (HS256) with bcrypt password hashing |
| **Storage** | AWS S3 (documents) |
| **Deployment** | Docker Compose (local), AWS ECS Fargate (prod) |

## Features

### Loan Pipeline
- Multi-status loan lifecycle: New → In Process → Conditional Approval → Approved → Funded
- Loan types: Conventional, FHA, VA, USDA
- Loan purposes: Purchase, Refinance, Cash-Out Refinance, Construction-to-Permanent
- Auto-generated loan numbers (`LN-YYYYMMDD-XXXXX`)

### URLA (Uniform Residential Loan Application)
- 9-section digital application aligned with Fannie Mae Form 1003
- Section-level validation and progress tracking
- Covers: personal info, employment, assets/liabilities, declarations, demographics, military service

### Loan Estimates (TRID-Compliant)
- TRID business-day calculator with programmatic federal holiday computation
- 3-day LE issuance deadline, 7-day waiting period, mailbox rule
- RESPA fee sections A–H with tolerance categories (Zero, 10%, Unlimited)
- APR calculation via Newton-Raphson iteration (Reg Z)
- LE versioning with Changed Circumstance tracking

### Document Management
- Upload, review, and status tracking (Requested → Received → Reviewed → Accepted/Rejected)
- S3-backed file storage

### Audit Trail
- Immutable, append-only audit log
- Before/after snapshots for every state change

### Compliance
- **TRID** — Truth in Lending / RESPA Integrated Disclosure
- **MISMO 3.4** — Mortgage Industry Standards Maintenance Organization data model
- **RESPA** — Fee tolerance enforcement
- **HMDA** — Demographics collection and reporting
- **ECOA** — Non-discrimination
- **ATR/QM** — Ability to Repay / Qualified Mortgage

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers (auth, loans, URLA, loan estimates, documents, users)
│   │   ├── core/            # Config, database, security
│   │   ├── models/          # SQLAlchemy ORM models (17 models)
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic (TRID calculator)
│   │   └── workers/         # Celery async tasks
│   ├── alembic/             # Database migrations
│   └── seed_dev.py          # Development data seeder
├── frontend/
│   ├── src/
│   │   ├── app/             # Router, providers, entry point
│   │   ├── design-system/   # Tokens, reusable UI components (13 components)
│   │   ├── features/        # Feature modules (auth, pipeline, loan, URLA, etc.)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client (Axios)
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   └── vite.config.ts
└── docker-compose.yml
```

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (optional, for full stack)

### Quick Start (Docker)

```bash
docker compose up
```

This starts:
- Frontend on `http://localhost:5173`
- Backend API on `http://localhost:8000`
- PostgreSQL on port `5432`
- Redis on port `6379`

### Manual Setup

**Backend:**

```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env     # Configure your environment
python seed_dev.py           # Create tables and seed demo users
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Demo Credentials

All demo users share the password: `Admin1234!`

| Role | Email |
|------|-------|
| Admin | admin@loanorigination.com |
| Loan Officer | lo@loanorigination.com |
| Processor | processor@loanorigination.com |
| Underwriter | uw@loanorigination.com |
| Closer | closer@loanorigination.com |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/token` | Login, returns JWT |
| GET | `/api/v1/auth/me` | Current user profile |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/loans` | List loans (paginated, filterable) |
| POST | `/api/v1/loans` | Create loan |
| GET | `/api/v1/loans/{id}` | Get loan details |
| PATCH | `/api/v1/loans/{id}` | Update loan |

### Loan Estimates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/loans/{id}/loan-estimates` | List LE versions |
| POST | `/api/v1/loans/{id}/loan-estimates` | Create draft LE |
| GET | `/api/v1/loans/{id}/loan-estimates/{le_id}` | Get LE with fees |
| PATCH | `/api/v1/loans/{id}/loan-estimates/{le_id}` | Update draft LE |
| PUT | `/api/v1/loans/{id}/loan-estimates/{le_id}/fees` | Replace fee schedule |
| POST | `/api/v1/loans/{id}/loan-estimates/{le_id}/issue` | Issue to borrower |
| POST | `/api/v1/loans/{id}/loan-estimates/{le_id}/revise` | Revise with COC |
| GET | `/api/v1/loans/{id}/loan-estimates/trid-status` | TRID compliance status |

### URLA
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/loans/{id}/urla/progress` | Section completion status |
| GET/PUT | `/api/v1/loans/{id}/urla/personal-info` | Borrower personal info |
| GET/POST | `/api/v1/loans/{id}/urla/residences` | Residence history |
| GET/POST | `/api/v1/loans/{id}/urla/employments` | Employment history |
| GET/POST | `/api/v1/loans/{id}/urla/assets` | Assets |
| GET/POST | `/api/v1/loans/{id}/urla/liabilities` | Liabilities |
| GET/PUT | `/api/v1/loans/{id}/urla/declarations` | Borrower declarations |
| GET/PUT | `/api/v1/loans/{id}/urla/military` | Military service |
| GET/PUT | `/api/v1/loans/{id}/urla/demographics` | Demographics (HMDA) |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/loans/{id}/documents` | List documents |
| POST | `/api/v1/loans/{id}/documents` | Create document record |

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing key |
| `REDIS_URL` | Celery broker URL |
| `AWS_S3_BUCKET` | Document storage bucket |
| `ENVIRONMENT` | `development` / `staging` / `production` |

## User Roles

| Role | Access |
|------|--------|
| Loan Officer | Create/manage loans, borrower interactions |
| Processor | Document collection, file preparation |
| Underwriter | Risk assessment, conditions, approval decisions |
| Closer | Closing disclosure, final documents, funding |
| Secondary Marketing | Loan pricing, lock management |
| Branch Manager | Pipeline oversight, team management |
| Compliance Officer | Audit, regulatory reporting |
| Admin | Full system access, user management |

## License

Proprietary. All rights reserved.
