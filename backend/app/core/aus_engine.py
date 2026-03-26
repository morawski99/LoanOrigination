"""
Mock AUS Engine — simulates Fannie Mae Desktop Underwriter® (DU)
and Freddie Mac Loan Product Advisor® (LPA) using real agency guidelines.

In production this module would be replaced by API calls to:
  - Fannie Mae DU API (api.fanniemae.com/du)
  - Freddie Mac LPA API (api.freddiemac.com/lpa)
"""
import random
import string
from datetime import datetime, timezone
from typing import Optional

from app.models.aus_result import DURecommendation, LPARecommendation

# 2024 Conforming / super-conforming loan limits
CONFORMING_LIMIT = 766_550
SUPER_CONFORMING_LIMIT = 1_149_825

# Credit score thresholds
DU_APPROVE_MIN = 620
DU_STRONG_MIN = 640
DU_PRIME_MIN = 680
DU_SUPER_PRIME_MIN = 720

LPA_ACCEPT_MIN = 660
LPA_CAUTION_MIN = 620


# ── ID generators ─────────────────────────────────────────────────────────────

def _gen_du_case_id() -> str:
    """Generate a realistic-looking DU case reference number."""
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = "".join(random.choices(string.digits + string.ascii_uppercase, k=6))
    return f"DU{date_part}{suffix}"


def _gen_lpa_key() -> str:
    """Generate a realistic-looking LPA feedback key."""
    segments = [
        "".join(random.choices(string.digits + "ABCDEF", k=4)) for _ in range(4)
    ]
    return "-".join(segments)


# ── Finding builder ───────────────────────────────────────────────────────────

def _f(code: str, category: str, message: str) -> dict:
    return {"code": code, "category": category, "message": message}


# ── Main engine entry point ───────────────────────────────────────────────────

def run_mock_aus(loan) -> dict:
    """
    Run mock DU + LPA against the loan. Returns a dict of all AUSResult fields
    (excluding loan_id / submitted_by_id which the caller provides).

    Inputs consumed from the Loan ORM object:
      - loan.loan_amount
      - loan.loan_type
      - loan.loan_purpose_type
      - loan.borrowers[].credit_score  (primary borrower)
    """
    from app.models.loan import LoanType  # local import to avoid circular deps

    primary = next(
        (b for b in loan.borrowers if b.borrower_classification == "Primary"),
        loan.borrowers[0] if loan.borrowers else None,
    )

    credit_score: Optional[int] = primary.credit_score if primary else None
    loan_amount = float(loan.loan_amount)
    loan_type = loan.loan_type
    loan_purpose = loan.loan_purpose_type

    du_rec, du_findings, du_rw, du_waiver = _run_du(
        credit_score, loan_amount, loan_type, loan_purpose
    )
    lpa_rec, lpa_findings, lpa_rw, lpa_doc_class = _run_lpa(
        credit_score, loan_amount, loan_type, loan_purpose
    )

    return {
        "du_recommendation": du_rec,
        "du_case_id": _gen_du_case_id(),
        "du_rep_warranty_relief": du_rw,
        "du_doc_waiver": du_waiver,
        "du_findings": du_findings,
        "lpa_recommendation": lpa_rec,
        "lpa_key": _gen_lpa_key(),
        "lpa_rep_warranty_relief": lpa_rw,
        "lpa_doc_class": lpa_doc_class,
        "lpa_findings": lpa_findings,
        "submission_data": {
            "loan_amount": loan_amount,
            "loan_type": loan_type.value,
            "loan_purpose": loan_purpose.value,
            "credit_score": credit_score,
            "borrower_count": len(loan.borrowers),
        },
    }


# ── Desktop Underwriter® engine ───────────────────────────────────────────────

def _run_du(
    credit_score: Optional[int],
    loan_amount: float,
    loan_type,
    loan_purpose,
) -> tuple:
    """Returns (DURecommendation, findings, rep_warranty_relief, doc_waiver)."""
    from app.models.loan import LoanType

    findings = []

    # Jumbo / out-of-scope check (conventional only)
    if loan_type == LoanType.CONVENTIONAL and loan_amount > CONFORMING_LIMIT:
        return (
            DURecommendation.OUT_OF_SCOPE,
            [_f("DU-001", "ineligible",
                f"Loan amount ${loan_amount:,.0f} exceeds the 2024 conforming loan limit "
                f"of ${CONFORMING_LIMIT:,.0f}. This loan is not eligible for DU evaluation. "
                "Consider a portfolio jumbo or non-QM program.")],
            False, False,
        )

    # Loan-type informational findings
    _du_loan_type_findings(findings, loan_type)

    # Refinance advisory
    if loan_purpose.value in ("Refinance", "CashOutRefinance"):
        findings.append(_f("DU-REF-001", "informational",
            "Refinance Transaction: DU will apply the applicable refinance guidelines. "
            "Verify seasoning, payoff statements, and title chain of ownership."))

    # Credit score branch
    if credit_score is None:
        findings.append(_f("DU-INF-001", "advisory",
            "Credit score unavailable. A tri-merge credit report is required before "
            "DU can provide an automated credit recommendation. Manual underwriting "
            "applies until a valid score is obtained."))
        return DURecommendation.REFER, findings, False, False

    if credit_score >= DU_SUPER_PRIME_MIN:  # 720+
        findings.insert(0, _f("DU-APP-001", "approval",
            f"Approve/Eligible — The application meets DU's guidelines. "
            f"Credit score of {credit_score} reflects excellent credit history. "
            "The loan is eligible for sale to Fannie Mae."))
        findings.append(_f("DU-D1C-001", "informational",
            "Day 1 Certainty® Eligible — Income and employment may qualify for "
            "verification through Fannie Mae's validated report service, potentially "
            "waiving traditional documentation (paystubs, W-2s, tax returns)."))
        findings.append(_f("DU-RW-001", "informational",
            "Representation & Warranty Relief — This loan is eligible for Fannie Mae's "
            "representation and warranty framework upon delivery, provided DU findings "
            "are met and no material misrepresentation exists."))
        findings.append(_f("DU-DOC-001", "informational",
            "Reduced Documentation May Apply — One month's most recent paystub and most "
            "recent W-2 typically sufficient. Tax returns may be waived for W-2 employees "
            "with consistent income history."))
        return DURecommendation.APPROVE_ELIGIBLE, findings, True, True

    elif credit_score >= DU_PRIME_MIN:  # 680–719
        findings.insert(0, _f("DU-APP-001", "approval",
            f"Approve/Eligible — The application meets DU's guidelines. "
            f"Credit score of {credit_score} is within the acceptable prime range."))
        findings.append(_f("DU-RW-001", "informational",
            "Representation & Warranty Relief — Eligible upon delivery to Fannie Mae."))
        findings.append(_f("DU-DOC-001", "informational",
            "Standard Documentation Required — Most recent 30 days paystubs, 2 years "
            "W-2s, and 2 years federal tax returns. 60 days bank statements for asset "
            "verification."))
        return DURecommendation.APPROVE_ELIGIBLE, findings, True, False

    elif credit_score >= DU_STRONG_MIN:  # 640–679
        findings.insert(0, _f("DU-APP-001", "approval",
            f"Approve/Eligible — The application meets DU guidelines with conditions. "
            f"Credit score of {credit_score} requires full documentation review."))
        findings.append(_f("DU-RF-001", "risk_factor",
            f"Credit score of {credit_score} limits maximum DTI to 45%. "
            "Minimum 2 months PITI reserves required post-closing."))
        findings.append(_f("DU-DOC-001", "informational",
            "Full Documentation Required — 30 days paystubs, 2 years W-2s, 2 years "
            "tax returns, 60 days complete bank statements. All deposits over 50% of "
            "qualifying income must be sourced and explained."))
        findings.append(_f("DU-RF-002", "advisory",
            "Compensating factors should be documented: stable employment (2+ years), "
            "low payment shock, significant reserves, or low LTV."))
        return DURecommendation.APPROVE_ELIGIBLE, findings, False, False

    elif credit_score >= DU_APPROVE_MIN:  # 620–639
        findings.insert(0, _f("DU-REF-001", "advisory",
            f"Refer — Credit score of {credit_score} does not meet DU's threshold for "
            "an automated approval. Manual underwriting by an approved underwriter is required."))
        findings.append(_f("DU-REF-002", "advisory",
            "Manual Underwriting Requirements — Maximum DTI of 36% (or 45% with strong "
            "compensating factors per Fannie Mae Selling Guide B3-5.4). Minimum 12 months "
            "clean pay history on all accounts."))
        findings.append(_f("DU-RF-001", "risk_factor",
            f"Credit score of {credit_score} reflects derogatory credit history. "
            "All derogatory items must be explained in writing with supporting documentation."))
        return DURecommendation.REFER, findings, False, False

    else:  # < 620
        findings.insert(0, _f("DU-RWC-001", "risk_factor",
            f"Refer with Caution — Credit score of {credit_score} reflects significant "
            "adverse credit history. This loan is not eligible for purchase by Fannie Mae "
            "under these DU findings."))
        findings.append(_f("DU-RWC-002", "advisory",
            "Recommend HUD-approved housing counseling to assist the borrower with "
            "credit rehabilitation strategies. Resubmit after credit improvement."))
        return DURecommendation.REFER_WITH_CAUTION, findings, False, False


def _du_loan_type_findings(findings: list, loan_type) -> None:
    from app.models.loan import LoanType

    if loan_type == LoanType.FHA:
        findings.append(_f("DU-FHA-001", "informational",
            "FHA Loan — Upfront Mortgage Insurance Premium (UFMIP) of 1.75% of the base "
            "loan amount is required. Annual MIP applies based on term, LTV, and loan amount. "
            "FHA case number must be assigned prior to credit pull."))
    elif loan_type == LoanType.VA:
        findings.append(_f("DU-VA-001", "informational",
            "VA Loan — VA Funding Fee applies (0.5%–3.3% depending on down payment, "
            "service type, and first vs. subsequent use). Funding fee may be financed. "
            "Certificate of Eligibility (COE) required. No monthly PMI."))
    elif loan_type == LoanType.USDA:
        findings.append(_f("DU-USDA-001", "informational",
            "USDA Rural Development Loan — Property must be in a USDA-eligible rural area. "
            "Household income limits apply based on area median income (AMI). "
            "Upfront guarantee fee of 1.0% and annual fee of 0.35% required."))


# ── Loan Product Advisor® engine ──────────────────────────────────────────────

def _run_lpa(
    credit_score: Optional[int],
    loan_amount: float,
    loan_type,
    loan_purpose,
) -> tuple:
    """Returns (LPARecommendation, findings, rep_warranty_relief, doc_class)."""
    from app.models.loan import LoanType

    findings = []

    # Jumbo / ineligible check
    if loan_type == LoanType.CONVENTIONAL and loan_amount > CONFORMING_LIMIT:
        return (
            LPARecommendation.INELIGIBLE,
            [_f("LPA-001", "ineligible",
                f"Loan amount ${loan_amount:,.0f} exceeds the 2024 conforming limit. "
                "This loan is not eligible for Freddie Mac Loan Product Advisor®.")],
            False, "Standard",
        )

    # Loan-type informational findings
    _lpa_loan_type_findings(findings, loan_type)

    if loan_purpose.value in ("Refinance", "CashOutRefinance"):
        findings.append(_f("LPA-REF-001", "informational",
            "Refinance Transaction — LPA will apply Freddie Mac's applicable refinance "
            "guidelines. Verify occupancy, seasoning, and current mortgage history."))

    # Credit score branch
    if credit_score is None:
        findings.append(_f("LPA-INF-001", "advisory",
            "Credit score unavailable. A tri-merge credit report is required for LPA "
            "evaluation. Resubmit once a valid representative credit score is obtained."))
        return LPARecommendation.CAUTION, findings, False, "Standard"

    if credit_score >= DU_SUPER_PRIME_MIN:  # 720+
        findings.insert(0, _f("LPA-ACC-001", "approval",
            f"Accept — The loan has received an Accept risk classification from Freddie Mac "
            f"LPA. Credit score of {credit_score} reflects excellent creditworthiness. "
            "The loan is eligible for purchase by Freddie Mac."))
        findings.append(_f("LPA-RW-001", "informational",
            "Representation & Warranty Relief — This loan qualifies for Freddie Mac's "
            "representation and warranty framework on sold loans, provided all LPA "
            "conditions are satisfied at delivery."))
        findings.append(_f("LPA-AIM-001", "informational",
            "Asset & Income Modeler (AIM) Eligible — Borrower may qualify for asset and "
            "income validation through Freddie Mac's automated AIM service, potentially "
            "reducing documentation requirements."))
        findings.append(_f("LPA-DOC-001", "informational",
            "Streamlined Documentation — LPA documentation requirements apply. VOI/VOE "
            "waiver may be available through AIM. Verify per the Freddie Mac Seller/Servicer Guide."))
        return LPARecommendation.ACCEPT, findings, True, "Streamlined"

    elif credit_score >= LPA_ACCEPT_MIN:  # 660–719
        findings.insert(0, _f("LPA-ACC-001", "approval",
            f"Accept — The loan meets Freddie Mac LPA guidelines. "
            f"Credit score of {credit_score} is within the acceptable range."))
        findings.append(_f("LPA-RW-001", "informational",
            "Representation & Warranty Relief — Eligible upon delivery to Freddie Mac."))
        findings.append(_f("LPA-DOC-001", "informational",
            "Standard Documentation — Most recent 30 days paystubs, 2 years W-2s, "
            "and 2 months complete bank statements required per Freddie Mac guidelines."))
        return LPARecommendation.ACCEPT, findings, True, "Standard"

    elif credit_score >= LPA_CAUTION_MIN:  # 620–659
        findings.insert(0, _f("LPA-CAU-001", "advisory",
            f"Caution — Credit score of {credit_score} requires manual underwriting review. "
            "The loan does not meet LPA's automated acceptance criteria. Manual underwriting "
            "per Freddie Mac Seller/Servicer Guide Chapter 5100 applies."))
        findings.append(_f("LPA-RF-001", "risk_factor",
            "Elevated Credit Risk — All derogatory accounts must be documented with written "
            "explanations. 12 months satisfactory pay history required on all open accounts. "
            "Maximum DTI 45% unless documented compensating factors exist."))
        findings.append(_f("LPA-DOC-001", "informational",
            "Full Documentation Required — 2 years paystubs, 2 years W-2s, 2 years federal "
            "tax returns, and 60 days complete bank statements. Rent verification letter or "
            "12 months cancelled checks if renting."))
        return LPARecommendation.CAUTION, findings, False, "Standard"

    else:  # < 620
        findings.insert(0, _f("LPA-ING-001", "ineligible",
            f"Ineligible — Credit score of {credit_score} does not meet Freddie Mac's "
            "minimum eligibility requirements. This loan is not eligible for LPA evaluation "
            "or purchase by Freddie Mac."))
        findings.append(_f("LPA-ING-002", "advisory",
            "The borrower does not meet minimum credit standards for conventional financing. "
            "Explore FHA programs (minimum 500 credit score with 10% down) or assist the "
            "borrower with credit rehabilitation to reach the 620 threshold."))
        return LPARecommendation.INELIGIBLE, findings, False, "Standard"


def _lpa_loan_type_findings(findings: list, loan_type) -> None:
    from app.models.loan import LoanType

    if loan_type == LoanType.FHA:
        findings.append(_f("LPA-FHA-001", "informational",
            "FHA Loan — LPA evaluates FHA loans using Freddie Mac's FHA guidelines. "
            "Additionally submit to FHA TOTAL Scorecard for the official FHA risk assessment. "
            "UFMIP and annual MIP apply per current FHA schedule."))
    elif loan_type == LoanType.VA:
        findings.append(_f("LPA-VA-001", "informational",
            "VA Loan — LPA evaluates VA loans. VA Funding Fee applies based on entitlement "
            "usage and down payment. COE required. No monthly MI."))
    elif loan_type == LoanType.USDA:
        findings.append(_f("LPA-USDA-001", "informational",
            "USDA Loan — Also submit through USDA GUS (Guaranteed Underwriting System) "
            "for the official USDA Rural Development eligibility determination."))
