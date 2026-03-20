# Technology Stack Decision Record

## Frontend
- **React 18** + **TypeScript** — component model, type safety
- **Vite** — build tooling
- **TailwindCSS** — utility-first styling with design token configuration
- **shadcn/ui** + **Radix UI** — accessible headless components (WCAG 2.1 AA base)
- **TanStack Query** — server state, caching, background refetch
- **Zustand** — client-side UI state
- **React Hook Form** + **Zod** — form management and validation
- **TanStack Table** — complex data tables (pipeline, conditions, HMDA)
- **React Router v6** — routing with role-based guards
- **i18next** — internationalization (future)
- **date-fns** — date handling (TRID business day calculations)
- **pdf-lib** — client-side PDF generation (LE, CD previews)

## Backend
- **Python 3.12** + **FastAPI** — async REST API
- **Pydantic v2** — data validation and MISMO schema enforcement
- **SQLAlchemy 2.0** — ORM with async support
- **Alembic** — database migrations
- **Celery** — async task queue (AUS submissions, vendor ordering, OCR)
- **Redis** — cache + Celery broker
- **httpx** — async HTTP client for third-party API calls
- **boto3** — AWS S3 document storage
- **python-jose** — JWT token validation
- **reportlab** / **weasyprint** — PDF generation (LE, CD, closing packages)
- **pytesseract** / **AWS Textract** — OCR for document extraction
- **pytest** + **pytest-asyncio** — testing

## Database Schema Design Principles
- MISMO 3.4 entity alignment (Deal → Loan → Party → Property)
- UUID primary keys throughout
- JSONB columns for AUS findings (variable structure)
- Soft deletes with `deleted_at` timestamps
- Immutable audit log table (append-only, no updates)
- Row-level security (PostgreSQL RLS) for loan-level access control
- Encrypted columns for SSN, DOB, account numbers (pgcrypto)

## DevOps & Infrastructure
- **Docker** / **Docker Compose** — local development
- **GitHub Actions** — CI/CD pipelines
- **AWS ECS Fargate** — container hosting
- **AWS RDS (PostgreSQL)** — managed database
- **AWS ElastiCache (Redis)** — managed cache
- **AWS S3** — document storage
- **AWS Secrets Manager** — secrets
- **AWS CloudFront** — CDN for frontend assets
- **Terraform** — infrastructure as code
- **Datadog** — APM, logs, alerting
- **OpenTelemetry** — distributed tracing
