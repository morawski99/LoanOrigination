# Compliance Implementation Detail

> Reference document for LOS developers. See FEATURE_PLAN.md for the feature roadmap.

---

## 1. TRID — Critical Implementation Rules

### The "6-Piece Application" Trigger
TRID disclosures are triggered the moment the LOS captures ALL SIX of these fields:
1. Borrower name
2. Borrower income
3. SSN (sufficient to pull credit)
4. Property address
5. Estimated property value
6. Loan amount sought

**LOS requirement:** Lock the application date (`ApplicationReceivedDate`) the moment field #6 is captured. Cannot be retroactively adjusted.

### Business Day Calculator
The TRID timing engine must implement a **compliant business-day calculator** that:
- Uses CFPB definition: business day = any calendar day except Sunday and federal holidays
- Adds **3 days for mailed disclosures** ("mailbox rule") unless electronic receipt is confirmed
- Tracks federal holidays accurately (New Year's, MLK, Presidents' Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas)
- Separates "general business days" from "specific business days" per Reg Z definitions

### Fee Tolerance Tracking (Expanded)
| Bucket | Description | Tolerance |
|---|---|---|
| Zero | Origination charges (points, fees), transfer taxes, lender-required service w/ lender-selected provider | 0% — any increase = cure required |
| 10% | Recording fees, required services w/ borrower-selected provider from lender's list | 10% aggregate increase max |
| Unlimited | Prepaid interest, property insurance, escrow reserves, optional services | No limit |

**Cure:** If zero-tolerance fee increases, lender must cure (refund excess) within 3 calendar years of consummation.

### CD Re-disclosure Triggers (3-day restart)
| Trigger | Threshold |
|---|---|
| APR increase | > 0.125% for fixed-rate |
| APR increase | > 0.25% for adjustable-rate |
| Loan product change | Any change (e.g., Fixed → ARM) |
| Prepayment penalty added | Any addition |

### Revised LE — Valid Changed Circumstance (COC) Codes
```
1  Acts of God / disaster
2  Borrower-requested loan changes
3  Rate lock
4  New information / discovered after application
5  Credit denial or withdrawal
6  Delayed settlement on new construction
```

---

## 2. MISMO 3.x Implementation Notes

### Version Identification (Critical)
- Every XML payload submitted to Fannie Mae or Freddie Mac must contain `MISMOVersionIdentifier`
- Version mismatch = **hard delivery failure** at GSE
- Current required versions:
  - ULAD (application): MISMO 3.4
  - UCD (closing disclosure): MISMO 3.3
  - ULDD (loan delivery): MISMO 3.x per current GSE implementation guide (check quarterly)

### Dual AUS Casefile Management
- Both DU and LPA casefiles must be independently maintained
- Store `DU_CasefileIdentifier` and `LPA_KeyNumber` on the loan record
- Each AUS submission creates a versioned findings snapshot (not overwritten)
- LOS must associate each delivery transaction with the correct AUS casefile ID

### ULDD Hard Edits
- GSEs publish edit specifications quarterly (technology release cycles)
- LOS must maintain current edit tables to avoid delivery failures
- Hard edits block delivery; soft edits allow delivery with override/certification
- 250–400+ required data points depending on loan type

### Universal Loan Identifier (ULID)
- A uniform identifier assigned at origination, carried through delivery
- Can be MERS MIN or lender-assigned (must be unique and follow GSE format)
- Required in ULDD delivery dataset

---

## 3. Fannie Mae — Key DU Rules

### DU Decision Types
| Decision | Meaning |
|---|---|
| Approve/Eligible | Meets guidelines; eligible for delivery |
| Approve/Ineligible | Creditworthy but ineligible (e.g., exceeds loan limits) |
| Refer | Cannot approve; manual UW required |
| Refer with Caution | Significant derogatory; manual UW with restrictions |
| EA-I / EA-II / EA-III | Early Warning System — fraud/misrepresentation risk flag |
| Out of Scope | Loan type not eligible for DU |

### Key DU Thresholds
- Max DTI: 45% standard; up to 50% with DU approval + compensating factors
- Min credit score: 620 (most programs); 680 for some high-balance scenarios
- Max LTV: 97% (HomeReady first-time homebuyers); varies by transaction
- Reserves: DU specifies months of PITIA based on risk layering
- Credit docs: must be dated within 120 days of Note date (4 months)

### Day 1 Certainty (D1C) — Rep & Warranty Relief
Requires approved third-party data vendors embedded in DU casefile:
- Income/Employment: The Work Number (Equifax), Finicity, Plaid
- Assets: Plaid, Finicity, AccountChek (FormFree)
- Property: Value Acceptance (appraisal waiver)

---

## 4. Freddie Mac — Key LPA Rules

### LPA Decision Types
| Decision | Meaning |
|---|---|
| Accept | Meets Freddie Mac guidelines |
| Caution | Does not meet automated approval; manual UW |
| Ineligible | Not eligible for sale to Freddie Mac |

### LPA vs. DU Key Differences
- LPA uses independent proprietary credit risk model — will sometimes Accept where DU Refers
- LPA has historically allowed up to 50% back-end DTI in certain scenarios
- LPA reserve calculations may differ from DU
- LPA Home Possible program = analog to Fannie HomeReady (low income, low down payment)

### AIM (Asset and Income Modeler) — Freddie's D1C equivalent
- AIM for Income: integrates The Work Number, payroll data vendors
- AIM for Assets: integrates bank data aggregators (Plaid, Finicity)
- AIM for Self-Employed: analyzes tax transcripts
- AIM approval on LPA = rep-and-warranty relief equivalent to Fannie D1C

### ACE (Automated Collateral Evaluation) — Appraisal Waiver
- Freddie's equivalent to Fannie Value Acceptance
- Available for rate/term refinances and some purchases with strong risk profiles
- LOS must flag ACE eligibility and include ACE indicator on delivery

---

## 5. ECOA / Regulation B — Implementation Details

### Action Taken Timeline
| Action | Deadline |
|---|---|
| Approval | No statutory deadline |
| Adverse action (complete app) | 30 days from receipt of complete application |
| Adverse action (incomplete app) | 30 days from last notification of incompleteness |
| Counteroffer acceptance | 90 days from counteroffer |

### Adverse Action Notice Requirements
Must include:
1. Statement of action taken
2. Name and address of creditor
3. ECOA statement (right not to be discriminated against)
4. Name, address, phone of credit reporting agency (if credit report used)
5. Statement that CRA did not make the decision
6. Right to free credit report within 60 days
7. Right to dispute inaccurate info
8. **Specific reasons for denial** (using ECOA Appendix C reason codes — up to 4)

### Adverse Action Reason Codes (ECOA Reg B Appendix C)
```
01  Credit application incomplete
02  Insufficient number of credit references provided
03  Unable to verify credit references
04  Temporary or irregular employment
05  Unable to verify employment
06  Length of employment
07  Insufficient income
08  Excessive obligations in relation to income
09  Unable to verify income
10  Limited credit experience
11  Poor credit performance with us
12  Delinquent past or present credit obligations with others
13  Garnishment or attachment
14  Foreclosure or repossession
15  Bankruptcy
16  Number of recent inquiries on credit bureau report
17  Value or type of collateral not sufficient
18  We do not grant credit to any applicant on the terms and conditions you request
19  Insufficient number of references
20  Unable to verify address and/or phone
21  Credit application too incomplete to evaluate creditworthiness
```

### Appraisal Delivery (ECOA Valuations Rule)
- All appraisals/valuations must be delivered to applicant **promptly upon completion**
- No later than **3 business days before consummation**
- Must also deliver at application: "Right to copy of appraisal" notice
- LOS must track: `AppraisalCompletedDate`, `AppraisalDeliveredDate`, `AppraisalDeliveryMethod`

---

## 6. HMDA / Regulation C — Implementation Details

### Reportable Action Taken Codes
```
1  Loan originated
2  Application approved but not accepted
3  Application denied
4  Application withdrawn by applicant
5  File closed for incompleteness
6  Purchased loan
7  Preapproval request denied
8  Preapproval request approved but not accepted
```

### HMDA Geocoding Requirement
- Census tract (11-digit FIPS) must be determined for every property address
- Use 2020 Census tract boundaries (current as of 2022+)
- LOS must integrate FFIEC geocoding API or equivalent
- `CensusTractIdentifier` in MISMO 3.x maps to HMDA LAR field
- MSA/MD code also required from geocoding result

### HMDA LAR Submission
- Annual submission by **March 1** for prior calendar year
- Format: pipe-delimited `.txt` file or CFPB HMDA Platform direct entry
- Public LAR (redacted): published by CFPB
- Modified LAR: lender-accessible version with protected data

### Rate Spread Calculation
- `RateSpreadPercent` = APR minus APOR (Average Prime Offer Rate)
- APOR published weekly by FFIEC
- Must use APOR as of date of rate lock or, if not locked, as of consummation date
- Threshold: if rate spread ≥ 1.5% (first lien) or ≥ 3.5% (second lien) → HOEPA testing required

---

## 7. FCRA — Implementation Details

### Credit Score Disclosure
When credit score is used in a credit decision (including adverse action), disclose:
1. Score value
2. Range of possible scores for that model (e.g., 300–850)
3. Up to 4 key factors adversely affecting the score
4. Date score was created
5. Name of entity that provided the score (Equifax, Experian, TransUnion)

LOS must store: `CreditScoreValue`, `CreditScoreRangeMin`, `CreditScoreRangeMax`, `CreditScoreFactorCode[]`, `CreditScoreCreatedDate`, `CreditReportingAgencyName`

### FACTA — Risk-Based Pricing Notice
- If consumer receives materially less favorable terms than a significant portion of other consumers → Risk-Based Pricing (RBP) notice required
- **Alternative:** Issue Credit Score Disclosure to all applicants (safe harbor from RBP notice)
- LOS should issue credit score disclosure at application to all borrowers (standard practice)

### Credit Freeze Workflow
- If credit bureau returns frozen file → route to manual process
- Generate borrower notification to unfreeze
- Do not proceed with hard pull until freeze is lifted
- LOS status: `CreditFreezeDetected` → pending borrower action

### Permissible Purpose Log
- Log credit pull authorization timestamp, authorization text presented to borrower
- Required fields: `CreditPullAuthorizationDate`, `BorrowerConsentIndicator`, `PermissiblePurposeType`

---

## 8. Data Retention Requirements

| Record Type | Minimum Retention |
|---|---|
| ECOA — applications and adverse action | 25 months |
| HMDA — public LAR | Indefinite (published by CFPB) |
| RESPA/TRID — CD, HUD-1 | 5 years |
| RESPA/TRID — application records | 3 years |
| TRID — LE | 3 years from consummation |
| Loan files (secondary market warranty) | 7 years minimum (standard bank practice) |
| Credit reports | Duration of loan + 2 years (standard) |
| FCRA adverse action notices | 25 months |
| SAR (Bank Secrecy Act) | 5 years |
| State law | May exceed federal minimums — check by state |

**LOS requirement:** Implement document retention policy engine with per-document-type retention schedules and legal hold override.

---

## 9. GLBA Safeguards Rule (Privacy)

- Financial institutions must protect the security and confidentiality of customer NPI (Non-Public Personal Information)
- Designation of a qualified individual responsible for information security program
- Risk assessments and written information security plan
- Oversight of service providers (vendors with access to NPI)

**LOS PII / NPI handling:**
- SSN: tokenized, never stored in plaintext in application tables
- DOB, account numbers, income: encrypted at rest (AES-256)
- Access logs for all NPI field reads
- Data masking in non-production environments
- Vendor access agreements (BAAs) required for all third-party integrations handling NPI
