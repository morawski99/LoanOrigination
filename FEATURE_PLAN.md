# LoanOrigination Platform — Feature Plan

> Enterprise Home Loan Origination System for Major Bank
> Stack: React 18 + TypeScript (frontend) · Python / FastAPI (backend)
> Compliance: MISMO 3.4 · Fannie Mae DU · Freddie Mac LPA · TRID · RESPA · ECOA · HMDA · ATR/QM

---

## 1. Competitive Landscape Summary

### ICE Mortgage Technology — Encompass
| Domain | Key Capabilities |
|---|---|
| Point of Sale | Consumer Connect (borrower POS), TPO Connect (broker portal) |
| Origination | 1003 intake, doc collection automation, data verification, quality checks |
| Underwriting | AUS submission, condition management, stacking order |
| Settlement & Closing | eClose, eSign, MERS registration, recording, investor delivery |
| Secondary Marketing | Product & pricing engine, rate lock desk, trade execution, GSE delivery |
| Correspondent | Pipeline acquisition, automated workflows, seller marketplace |
| Analytics | Real-time data (Data Connect), BI, benchmarking, trend analysis |
| Performance | 3-day cycle time reduction, 23% volume increase, $1,056 gross profit/loan gain |

### Vesta (cloud-native challenger)
| Domain | Key Capabilities |
|---|---|
| Architecture | API-first, cloud-native, fully configurable |
| Workflow | Rules-based workflow engine, no-code configuration |
| Borrower Experience | Digital POS, real-time status updates |
| Integrations | Open API, credit bureaus, AUS, title, appraisal, e-sign |
| Differentiator | Speed-to-market, fintech-friendly, modern dev experience |

### Our Competitive Advantages
- Purpose-built for enterprise bank (not mortgage banker)
- MISMO 3.4 native data model from day one
- Persona-optimized UX (not one-size-fits-all)
- Modern React design system (Chase-inspired, ADA WCAG 2.1 AA)
- AI-assisted underwriting and document extraction
- Native dual AUS (DU + LPA simultaneously)

---

## 2. Design System

### Visual Language (Chase-Inspired, Modernized)
Full token file: `design-system/tokens.css`

```
Chase Primary Blue:   #117ACA  — CTAs, links, active states
Chase Dark Navy:      #003087  — headers, hero, table headers
Chase Mid Blue:       #005EB8  — secondary buttons, hover
Chase Light Blue:     #EBF5FC  — bg tints, info banners
Success Green:        #006B3C
Warning Orange:       #E65100
Error Red:            #C0392B
Focus Ring (ADA):     #FDB813  — gold, max contrast on all surfaces
Background:           #F7F7F7
Surface White:        #FFFFFF
Text Primary:         #1A1A1A
Text Secondary:       #767676  — 4.54:1 on white (AA minimum)
Border:               #E0E0E0
```

**Status Badge Color Map (pipeline — text label always accompanies color):**
```
New/Submitted:        #117ACA  blue
In Process:           #6B4FBB  purple
Conditional Approval: #E65100  orange
Approved:             #006B3C  green
Suspended:            #FDB813  amber
Declined:             #C0392B  red
Withdrawn:            #767676  gray
Closed/Funded:        #004D25  dark green
```

### Typography
- Font: Inter (primary), fallback Helvetica Neue / Arial
- Headings: 600–700 weight, 1.25rem–3rem, tight tracking
- Body: 400 weight, 1rem / 1.5 line-height
- Inputs: 1rem minimum (prevents iOS auto-zoom)
- Monospace (loan numbers, rates, account numbers): JetBrains Mono

### ADA / WCAG 2.1 AA Requirements
- Body text contrast: 4.5:1 minimum (`#333333` on white = 12.6:1 ✓)
- Large text contrast: 3:1 minimum
- UI components: 3:1 against adjacent colors
- Focus indicators: gold `#FDB813` ring, 3px solid, 2px offset — visible on all surfaces
- All interactive elements: 48px × 48px minimum touch target
- Input labels always above field (never placeholder-only)
- Error messages in text + icon, never color alone
- ARIA labels on all form fields, icon buttons, status indicators
- Keyboard navigation for all workflows (no mouse-only interactions)
- Screen reader tested (NVDA, VoiceOver, JAWS)
- Skip-to-content link as first focusable element
- Session timeout warning dialog (WCAG 2.2.1), option to extend
- `prefers-reduced-motion` respected across all animations
- `role="alert"` / `aria-live="polite"` for dynamic status messages
- Color never sole indicator of meaning (always text + color)

### Layout Patterns
- Max content width: 1280px with responsive padding
- **Left sidebar navigation** (preferred for enterprise density): 240px / 64px icon-only
- Dual-pane layouts: loan file nav left (420px), content right
- Data-dense tables: sticky headers, sortable columns, alternating rows
- Collapsible section panels for complex forms (1003, CD, LE)
- Skeleton screens (not spinners) for initial loads
- Auto-save with visible timestamp indicator throughout multi-step forms
- Toast notifications: top-right, 320px, 5s auto-dismiss (errors persist)

---

## 3. User Personas & Optimized Experiences

### 3.1 Loan Officer (LO)
**Goal:** Originate loans fast, grow pipeline, stay compliant without friction.

**Dashboard:**
- My Pipeline (filterable: new, in-progress, suspended, pending close)
- Today's tasks and follow-ups
- Rate/lock expiration alerts
- Borrower communication hub (SMS, email, in-app)
- Quick loan creation from pre-qual or application

**Key Workflows:**
- 1-click 1003 pre-fill from borrower POS submission
- Run DU + LPA simultaneously with one click
- Issue Loan Estimate in <3 minutes with auto-fee population
- Borrower document checklist with automated reminders
- Product & pricing comparison tool
- Referral partner portal (Realtor, builder integration)
- Mobile-optimized for field use

### 3.2 Loan Processor
**Goal:** Clear conditions efficiently, keep the file moving, coordinate with all parties.

**Dashboard:**
- Condition tracking board (Kanban: ordered / received / reviewed / cleared)
- Outstanding items by borrower, vendor, third-party
- Days in status warnings (SLA breach alerts)
- Vendor order queue (appraisal, title, flood, tax transcripts)

**Key Workflows:**
- Automated condition letters to borrowers
- Split-screen: loan file + document viewer
- Stacking order management
- VOI/VOA (income/asset verification) integration
- 4506-C tax transcript ordering (IRS Direct)
- Flood certification ordering
- Appraisal ordering (AMC integration)
- Title & settlement coordination
- Change of circumstance (COC) tracking → re-disclosure trigger

### 3.3 Underwriter
**Goal:** Make accurate, defensible credit decisions efficiently.

**Dashboard:**
- Underwriting queue with risk-stratified prioritization
- AUS findings panel (DU + LPA side-by-side)
- Exception tracking and approval hierarchy
- Daily production metrics

**Key Workflows:**
- Dual AUS comparison (DU vs LPA findings, recommendations)
- 1003 / credit analysis workbench (all data in one view)
- Income calculation worksheet (FNMA guidelines, Schedule analysis)
- Asset adequacy verification
- Property review (appraisal, title commitment, HOI)
- Condition issuance with MISMO-coded condition types
- Suspense / denial workflow with ECOA adverse action notice
- QM / ATR eligibility determination
- Investor overlay check (agency + bank overlays)
- Exception request and approval routing

### 3.4 Closer / Closing Coordinator
**Goal:** Produce accurate closing packages, meet regulatory timing, fund the loan.

**Dashboard:**
- Closing calendar (scheduled closings by day/week)
- CD preparation queue
- Wire/funding tracker
- MERS registration status

**Key Workflows:**
- Closing Disclosure generation (TRID-compliant, 3-day rule enforcement)
- Final fee reconciliation vs Loan Estimate (tolerance tracking)
- Closing package assembly and delivery (attorney, title, borrower)
- eSign / wet sign coordination
- CD change tracking and re-disclosure
- Funding authorization workflow (dual control)
- MERS MIN assignment and registration
- Disbursement instructions and wire release
- Post-closing checklist (trailing docs, endorsements)
- Warehouse lending management (ship/fund/purchase)

### 3.5 Secondary Marketing / Lock Desk
**Goal:** Price loans accurately, manage pipeline risk, deliver to investors.

**Dashboard:**
- Lock pipeline with expiration alerts
- Hedge position summary
- Investor commitment tracking
- Pull-through analytics

**Key Workflows:**
- Product & pricing engine (PPE) with real-time rate sheet
- Rate lock request / extension / re-lock workflow
- Best-execution analysis (DU eligible vs LPA eligible)
- Mandatory vs best-efforts commitment management
- Investor loan delivery (ULDD / MISMO 3.4)
- GSE seller/servicer delivery (Fannie Mae EarlyCheck, Freddie Mac Loan Selling Advisor)
- Bulk / AOT (Assignment of Trade) support
- Pair-off management

### 3.6 Branch Manager / Supervisor
**Goal:** Visibility into team performance and pipeline health.

**Dashboard:**
- Team pipeline by LO with status breakdown
- Cycle time analytics (app to close, by stage)
- Production volume (units + dollar)
- Compliance exception tracking
- HMDA data quality monitoring

### 3.7 Compliance Officer
**Goal:** Ensure regulatory compliance, audit readiness, accurate reporting.

**Key Workflows:**
- HMDA LAR (Loan Application Register) generation and validation
- TRID tolerance tracking across all loans
- ECOA adverse action notice audit
- Fair lending analysis (HMDA disparate impact)
- Audit trail and complete change history
- CRA tract mapping and reporting
- BSA/AML flags and SAR workflow
- Regulatory change management (rule updates)

### 3.8 Borrower (Self-Service Portal)
**Goal:** Easy, transparent, mobile-first loan application experience.

**Key Workflows:**
- Digital 1003 (URLA) with guided, conversational UX
- Document upload (camera capture, PDF, bank connect)
- Real-time loan status tracker (milestone-based)
- eSign for disclosures (LE, CD, authorizations)
- Secure messaging with loan team
- Co-borrower collaboration
- To-do list with deadline visibility
- Rate comparison and product selection

---

## 4. MISMO 3.4 Data Model

### Core Structure (Deal-centric)
```
Deal
├── Loan[]
│   ├── LoanCharacteristics (amount, term, rate, type, purpose)
│   ├── MaturityDate, NoteDate
│   ├── ARMFeatures (if applicable)
│   ├── FHAVADetail (if applicable)
│   └── QualifiedMortgageDetail
├── Parties[]
│   ├── Borrower[]
│   │   ├── PersonName, DOB, SSN (encrypted)
│   │   ├── Residences[] (current, former)
│   │   ├── Employments[]
│   │   │   ├── Employer, Position, StartDate
│   │   │   └── BaseIncome, OvertimeIncome, BonusIncome
│   │   ├── Assets[]
│   │   │   ├── Checking, Savings, Retirement, Stocks
│   │   │   └── GiftFunds (with letter)
│   │   ├── Liabilities[]
│   │   │   ├── Revolving, Installment, Mortgage
│   │   │   └── ExclusionReason (if excluded)
│   │   ├── Declarations (citizenship, ownership, bankruptcy)
│   │   └── Demographics (HMDA: race, ethnicity, sex, age)
│   ├── Seller[]
│   ├── LenderOrganization
│   └── ServiceProvider[] (title, appraiser, attorney)
├── Property
│   ├── AddressDetail (street, city, state, zip, county)
│   ├── PropertyDetail (type, units, use, year built)
│   ├── SalesContractDetail
│   └── AppraisalDetail
│       ├── AppraisedValue, AppraisalDate
│       ├── AppraiserLicense
│       └── UAD (Uniform Appraisal Dataset) fields
├── Transaction
│   ├── SalesPrice, PurchasePrice
│   ├── ClosingCostDetail
│   │   ├── LoanFee[] (RESPA Section A-H)
│   │   ├── PrepaidsDetail
│   │   └── EscrowDetail
│   ├── LoanEstimateDetail (TRID)
│   └── ClosingDisclosureDetail (TRID)
├── AUSRequest/Result
│   ├── DU_FindingReport
│   │   ├── Recommendation (Approve/Eligible, Refer, etc.)
│   │   ├── EligibilityFindings[]
│   │   ├── MessageDetail[]
│   │   └── ConditionDetail[]
│   └── LPA_FeedbackCertificate
│       ├── RiskClass (Accept, Caution, Ineligible)
│       ├── DocumentationLevel
│       ├── RepAndWarrantyRelief
│       └── MessageDetail[]
├── Document[]
│   ├── DocumentType (MISMO enum)
│   ├── DocumentStatus
│   ├── FileReference (S3 key)
│   └── ReceivedDate, ReviewedDate
└── RateLock
    ├── LockDate, ExpirationDate
    ├── RateLockPeriod
    ├── NoteRate, APR
    └── InvestorCommitmentDetail
```

### Key MISMO Enumerations
- `LoanPurposeType`: Purchase, Refinance, CashOutRefinance, ConstructionToPermanent
- `PropertyUsageType`: PrimaryResidence, SecondHome, Investor
- `LoanType`: Conventional, FHA, VA, USDA
- `MortgageType`: Fixed, ARM, Balloon
- `AUSResultType`: ApproveEligible, ReferWithCaution, OutOfScope, Ineligible

---

## 5. Compliance Framework
> Full implementation detail (timing rules, reason codes, data retention, FACTA, HMDA geocoding, ULDD edits): see `COMPLIANCE_DETAIL.md`

### 5.1 TRID (TILA-RESPA Integrated Disclosure)
| Rule | Implementation |
|---|---|
| Loan Estimate (LE) | Auto-generated within 3 business days of complete application |
| LE Timing Lock | System blocks re-disclosure until 3-day waiting period |
| 7-day waiting period | Closing blocked <7 days from LE issuance |
| Closing Disclosure (CD) | Auto-generated, 3-day delivery rule enforced |
| Fee Tolerances | Zero tolerance (A fees), 10% tolerance (C fees), unlimited (B/E fees) |
| COC Tracking | Change of circumstance logs trigger re-disclosure workflow |
| Revised LE | Version control with reason codes |

### 5.2 RESPA
- Section 8: No kickback/referral fee tracking (affiliated business disclosure)
- Section 9: Seller cannot require specific title company
- Affiliated Business Arrangement (AfBA) disclosures at application
- HUD-1 / ALTA Settlement Statement generation

### 5.3 ECOA / Regulation B
- Adverse action notice automation (30-day rule from complete application)
- ECOA notice at application ("right to copy of appraisal")
- Credit decision reason codes (MISMO-coded)
- Incomplete application notice (30-day rule)
- Joint applicant notification rules

### 5.4 HMDA / Regulation C
- Real-time LAR (Loan Application Register) population
- HMDA fields: purpose, action taken, denial reasons, rate spread, HOEPA
- Demographic data collection (race, ethnicity, sex — borrower-provided)
- Annual filing format compliance (CFPB HMDA Platform)
- Data quality validation pre-submission

### 5.5 FCRA
- Credit authorization captured before any credit inquiry
- Hard pull vs soft pull distinction
- Tri-merge credit report integration (Experian, Equifax, TransUnion)
- ITIN applicant handling

### 5.6 ATR / Qualified Mortgage Rule
- 8 ATR factors tracked: income, assets, employment, DTI, payment history, simultaneous loans, monthly payments, other obligations
- QM safe harbor calculation (APR vs APOR spread check)
- General QM, GSE Patch QM, Small Creditor QM type determination
- DTI ≤ 43% enforcement (or compensating factors logged)

### 5.7 Fannie Mae / Freddie Mac
| Agency | Tool | Integration |
|---|---|---|
| Fannie Mae | Desktop Underwriter (DU) | API submission, findings import, EarlyCheck |
| Fannie Mae | Uniform Collateral Data Portal (UCDP) | Appraisal delivery |
| Fannie Mae | ULDD Phase 3 | Loan delivery dataset |
| Freddie Mac | Loan Product Advisor (LPA) | API submission, feedback cert import |
| Freddie Mac | Loan Selling Advisor | Delivery and purchase |
| Freddie Mac | UCDP (shared with FNMA) | Appraisal delivery |

---

## 6. Feature Roadmap — Phased Plan

### Phase 1: Core Foundation (Months 1–4)
**Goal:** Working LOS with end-to-end application-to-AUS flow

- [ ] User authentication, RBAC (roles: LO, LOA, Processor, Underwriter, Closer, Secondary, Manager, Compliance, Admin)
- [ ] Loan pipeline dashboard (persona-filtered views, customizable columns, color-coded alerts)
- [ ] Milestone-based workflow engine (configurable stages, required fields, role-based routing)
- [ ] Business Rules Engine (BRE) — field triggers, milestone actions, automated task generation
- [ ] Digital 1003 / URLA (Uniform Residential Loan Application) — all sections
- [ ] MISMO 3.4 data model in PostgreSQL
- [ ] Borrower POS portal (digital application, document upload, status tracker)
- [ ] Co-borrower workflow (invitation, separate SSO, collaborative 1003)
- [ ] Tri-merge credit pull integration (credit vendor API, soft pull / hard pull distinction)
- [ ] Dual AUS submission: Fannie Mae DU + Freddie Mac LPA (+ FHA TOTAL Scorecard)
- [ ] AUS findings display and side-by-side comparison view (DU vs LPA)
- [ ] Loan Estimate generation (TRID-compliant, fee tolerance tracking, 3-day rule enforcement)
- [ ] Document management eFolder (upload, categorize, version, stacking order, OCR metadata)
- [ ] Basic condition creation and tracking (prior-to-approval, prior-to-docs, prior-to-funding)
- [ ] Pre-qualification / pre-approval letter generation
- [ ] OFAC SDN check at application
- [ ] ECOA adverse action notice generation
- [ ] Audit trail (all changes logged with user, timestamp, before/after — immutable)
- [ ] Role-based dashboard layouts per persona

### Phase 2: Full Workflow (Months 5–8)
**Goal:** Complete origination-to-close operational capability

- [ ] Automated condition management (stacking order, letter generation, needs list per stage)
- [ ] Vendor ordering hub: appraisal (AMC + UCDP), flood cert, tax transcripts (4506-C), title
- [ ] Mortgage Insurance (MI) ordering and rate comparison (Arch MI, MGIC, Radian, Essent, National MI)
- [ ] Income analysis workbench (W-2, paystub, self-employed, Schedule C/E/S analysis)
- [ ] Asset verification workflow (bank statement review, VOA integration, gift fund tracking)
- [ ] Employment verification (VOE / The Work Number / Equifax Workforce Solutions)
- [ ] Change of circumstance (COC) tracking and re-disclosure workflow with valid reason codes
- [ ] Underwriting workbench (dual-pane: AUS findings + loan file, income/asset calculators)
- [ ] Investor overlay engine (agency guidelines + bank-specific overlays, eligibility matrix)
- [ ] QM/ATR eligibility calculator (APR vs APOR spread, DTI, safe harbor classification)
- [ ] High-cost loan (HOEPA) testing with Wolters Kluwer state compliance forms
- [ ] Closing Disclosure generation (3-day rule enforcement, version history)
- [ ] Final fee reconciliation (LE vs CD tolerance comparison, zero/10%/unlimited buckets)
- [ ] eSign / hybrid eClose integration (DocuSign / Snapdocs)
- [ ] eRecording integration (Simplifile — county recording)
- [ ] eNote creation and MERS eRegistry registration
- [ ] Closing package assembly and delivery to settlement agent
- [ ] MERS MIN registration and transfer workflows
- [ ] Funding authorization workflow (dual approval, wire instruction fraud prevention)
- [ ] Warehouse lending management (ship, track, purchase)
- [ ] HMDA LAR auto-population and validation
- [ ] CRM bi-directional integration (Total Expert / Salesforce)
- [ ] Borrower portal: real-time milestone tracker, to-do list, secure messaging, eSign

### Phase 3: Advanced Features (Months 9–14)
**Goal:** Full enterprise capability, secondary marketing, analytics

- [ ] Product & Pricing Engine (PPE) with real-time rate sheet import
- [ ] Rate lock desk (request, approve, extend, re-lock, expire)
- [ ] Best-execution analysis (DU vs LPA, agency vs non-agency)
- [ ] Mandatory commitment management (Fannie Mae / Freddie Mac)
- [ ] ULDD loan delivery (MISMO 3.4 XML generation and submission)
- [ ] GSE seller portal integration (Fannie Mae Connect, Freddie Mac Loan Selling Advisor)
- [ ] TPO / Broker portal (third-party originator submissions)
- [ ] Correspondent lending pipeline
- [ ] Warehouse lending management (shipping, tracking, purchase)
- [ ] Branch manager analytics (cycle time, pull-through, LO scorecards)
- [ ] HMDA filing preparation and CFPB submission
- [ ] Fair lending analysis (HMDA disparate impact dashboard)
- [ ] CRA tract mapping and reporting
- [ ] BSA/AML integration (identity verification, watchlist screening)
- [ ] AI document extraction (OCR + ML: W-2, paystub, bank statement auto-parse)
- [ ] AI-assisted underwriting recommendations
- [ ] API gateway for third-party integrations
- [ ] Mobile app (React Native) for LO field use

---

## 7. Technical Architecture

### Frontend (React 18 + TypeScript)
```
src/
├── app/                    # App shell, routing, providers
├── design-system/          # Shared component library (ADA-first)
│   ├── tokens/             # Color, spacing, typography CSS variables
│   ├── components/         # Button, Input, Table, Modal, Badge, etc.
│   └── layouts/            # Page, SplitPane, Sidebar, Dashboard
├── features/
│   ├── auth/               # Login, MFA, role switching
│   ├── pipeline/           # Loan pipeline views by persona
│   ├── loan/               # 1003 form, loan summary, loan file
│   ├── borrower-portal/    # Self-service borrower UX
│   ├── underwriting/       # UW workbench, AUS, conditions
│   ├── closing/            # CD, closing package, funding
│   ├── secondary/          # Pricing, lock desk
│   ├── documents/          # Upload, viewer, categorization
│   ├── compliance/         # HMDA, TRID tracking, adverse action
│   └── admin/              # Users, roles, configuration
├── hooks/                  # Shared React hooks
├── services/               # API client (Axios + React Query)
└── utils/                  # MISMO data transforms, date helpers
```

### Backend (Python / FastAPI)
```
app/
├── api/
│   ├── v1/
│   │   ├── loans/          # Loan CRUD, pipeline
│   │   ├── borrowers/      # Borrower data management
│   │   ├── documents/      # Document storage, OCR
│   │   ├── aus/            # DU / LPA submission and results
│   │   ├── disclosures/    # LE, CD generation
│   │   ├── conditions/     # Condition management
│   │   ├── vendors/        # Appraisal, title, flood ordering
│   │   ├── compliance/     # HMDA, TRID, ECOA
│   │   └── users/          # Auth, RBAC
├── core/
│   ├── mismo/              # MISMO 3.4 schema, serialization
│   ├── trid/               # LE/CD rules engine, tolerance calc
│   ├── aus/                # DU + LPA API clients
│   ├── pricing/            # PPE rate logic
│   └── compliance/         # ATR/QM, HMDA, ECOA rules
├── models/                 # SQLAlchemy ORM (MISMO-aligned)
├── schemas/                # Pydantic v2 schemas
├── workers/                # Celery async tasks (AUS, doc OCR, vendor orders)
└── tests/
```

### Infrastructure
| Component | Technology |
|---|---|
| Database | PostgreSQL 16 (primary), Redis (cache/queue) |
| File Storage | AWS S3 (documents, images) |
| Auth | Auth0 / Keycloak (OIDC, MFA, RBAC) |
| Async Tasks | Celery + Redis |
| Search | PostgreSQL full-text + pg_trgm |
| API Gateway | AWS API Gateway or Kong |
| Observability | OpenTelemetry, Datadog |
| CI/CD | GitHub Actions |
| Hosting | AWS (ECS Fargate / EKS) |
| Secrets | AWS Secrets Manager |

### Key Third-Party Integrations
| Category | Vendors |
|---|---|
| Credit | CoreLogic Credco, MeridianLink, Xactus, FactualData |
| AUS | Fannie Mae DU API, Freddie Mac LPA API, FHA TOTAL Scorecard |
| Income/Asset Verification | The Work Number (Equifax), Plaid, Finicity, FormFree |
| Appraisal | ServiceLink, CoreLogic, Class Valuation, Solidifi (AMC); UCDP submission |
| Flood | ServiceLink, CoreLogic, National Flood Service (life-of-loan monitoring) |
| Title | First American, Fidelity, Old Republic, WFG; SoftPro/Qualia integration |
| Tax Transcripts | IRS 4506-C (Xactus, ServiceMac, Tax Guard) |
| eSign / eClose | DocuSign, Snapdocs, Adobe Acrobat Sign |
| eRecording | Simplifile (county recording of closing documents) |
| MERS | MERSCORP Holdings API (MIN registration, eNote, transfers) |
| Mortgage Insurance | Arch MI, Essent, MGIC, Radian, National MI (auto-ordering + rate compare) |
| Pricing | Optimal Blue, Polly, LoanPass, Lender Price |
| CRM | Salesforce, Total Expert, Surefire (bi-directional sync) |
| Fraud / OFAC | First American FraudGuard, LexisNexis, OFAC SDN check |
| AML/Identity | Socure, GIACT |
| Compliance Forms | Wolters Kluwer (state-specific disclosures, HOEPA testing) |
| Warehouse | Warehouse line management (major warehouse banks) |

---

## 8. Security & Data Governance

- PII encryption at rest (AES-256) and in transit (TLS 1.3)
- SSN / DOB tokenization (never stored in plaintext)
- SOC 2 Type II architecture
- GLBA Safeguards Rule compliance
- Role-based data access (LOs cannot see other LOs' loans unless manager)
- Complete audit log (immutable, with before/after values)
- Penetration testing and SAST/DAST in CI pipeline
- MFA required for all users
- Session timeout with WCAG warning (ADA 2.2.1)
- Field-level encryption for sensitive MISMO elements

---

## 9. Success Metrics

| Metric | Target |
|---|---|
| Application-to-close cycle time | < 21 days (vs. industry avg 45 days) |
| TRID tolerance exceptions | < 0.1% of loans |
| AUS approval rate (1st submission) | > 85% |
| Borrower portal adoption | > 75% of borrowers |
| Condition clear time | < 5 business days avg |
| HMDA filing error rate | < 0.5% |
| System uptime | 99.9% |
| ADA compliance | WCAG 2.1 AA on all pages |
