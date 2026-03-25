"""
TRID Compliance Calculator
==========================
Implements CFPB-compliant business-day math, mortgage payment calculations,
APR determination, and cash-to-close estimation for Loan Estimate generation.

References:
  - Regulation Z (12 CFR Part 1026), Subpart E
  - CFPB TRID implementation guidance
  - RESPA Section 4 fee tolerance rules
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP


# ---------------------------------------------------------------------------
# Federal holiday computation
# ---------------------------------------------------------------------------

def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date:
    """Return the nth occurrence (1-based) of `weekday` in the given month/year.
    weekday: 0=Monday … 6=Sunday
    """
    d = date(year, month, 1)
    days_ahead = (weekday - d.weekday()) % 7
    first = d + timedelta(days=days_ahead)
    return first + timedelta(weeks=n - 1)


def _last_monday(year: int, month: int) -> date:
    """Return the last Monday of the given month/year (used for Memorial Day)."""
    # Walk back from the last day of the month
    if month == 12:
        last_day = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = date(year, month + 1, 1) - timedelta(days=1)
    days_back = (last_day.weekday()) % 7  # 0=Mon → 0 back; 6=Sun → 6 back
    return last_day - timedelta(days=days_back)


def _observed(d: date) -> date:
    """Return the observed date for a holiday falling on Sat/Sun."""
    if d.weekday() == 5:   # Saturday → Friday before
        return d - timedelta(days=1)
    if d.weekday() == 6:   # Sunday → Monday after
        return d + timedelta(days=1)
    return d


def federal_holidays(year: int) -> frozenset[date]:
    """
    Compute the set of US federal public holidays for `year`.
    Used by the TRID business-day calculator.
    """
    return frozenset({
        _observed(date(year, 1, 1)),            # New Year's Day
        _nth_weekday(year, 1, 0, 3),            # MLK Day (3rd Mon in Jan)
        _nth_weekday(year, 2, 0, 3),            # Presidents' Day (3rd Mon in Feb)
        _last_monday(year, 5),                  # Memorial Day (last Mon in May)
        _observed(date(year, 6, 19)),           # Juneteenth
        _observed(date(year, 7, 4)),            # Independence Day
        _nth_weekday(year, 9, 0, 1),            # Labor Day (1st Mon in Sep)
        _nth_weekday(year, 10, 0, 2),           # Columbus Day (2nd Mon in Oct)
        _observed(date(year, 11, 11)),          # Veterans Day
        _nth_weekday(year, 11, 3, 4),           # Thanksgiving (4th Thu in Nov)
        _observed(date(year, 12, 25)),          # Christmas
    })


# Cache a rolling window of holiday sets
_holiday_cache: dict[int, frozenset[date]] = {}


def _holidays_for(year: int) -> frozenset[date]:
    if year not in _holiday_cache:
        _holiday_cache[year] = federal_holidays(year)
    return _holiday_cache[year]


# ---------------------------------------------------------------------------
# TRID Business-Day Logic
# ---------------------------------------------------------------------------

def is_trid_business_day(d: date) -> bool:
    """
    CFPB definition: a business day is any calendar day except Sunday
    and federal public holidays (Reg Z § 1026.2(a)(6)).
    Saturday IS a business day under the general definition.
    """
    if d.weekday() == 6:  # Sunday
        return False
    return d not in _holidays_for(d.year)


def add_trid_business_days(start: date, days: int) -> date:
    """Advance `start` by `days` TRID business days (not counting start date)."""
    current = start
    remaining = days
    while remaining > 0:
        current += timedelta(days=1)
        if is_trid_business_day(current):
            remaining -= 1
    return current


def le_issuance_deadline(application_date: date) -> date:
    """
    Loan Estimate must be delivered within 3 business days of a complete
    application (Reg Z § 1026.19(e)(1)(iii)).
    """
    return add_trid_business_days(application_date, 3)


def earliest_consummation_date(le_issued_date: date) -> date:
    """
    Consummation may not occur until the 7th business day after LE delivery
    (Reg Z § 1026.19(e)(1)(iv) — 7-day waiting period).
    """
    return add_trid_business_days(le_issued_date, 7)


def cd_delivery_deadline(closing_date: date) -> date:
    """
    Closing Disclosure must be received by borrower at least 3 business days
    before consummation (Reg Z § 1026.19(f)(1)(ii)).
    Returns the latest date CD must be delivered to meet the 3-day rule.
    """
    # Work backwards: closing_date must be 3 business days AFTER delivery
    # So latest delivery = closing_date - 3 business days
    d = closing_date
    remaining = 3
    while remaining > 0:
        d -= timedelta(days=1)
        if is_trid_business_day(d):
            remaining -= 1
    return d


# ---------------------------------------------------------------------------
# Mortgage Payment Math
# ---------------------------------------------------------------------------

def calculate_monthly_pi(
    principal: Decimal,
    annual_rate_percent: Decimal,
    term_months: int,
) -> Decimal:
    """
    Standard amortizing fixed-rate monthly principal & interest payment.
    PMT = P * r / (1 - (1+r)^-n)
    """
    if annual_rate_percent == 0 or term_months == 0:
        if term_months == 0:
            return Decimal("0.00")
        return (principal / term_months).quantize(Decimal("0.01"), ROUND_HALF_UP)

    r = float(annual_rate_percent) / 100.0 / 12.0
    n = term_months
    p = float(principal)
    pmt = p * r / (1.0 - (1.0 + r) ** (-n))
    return Decimal(str(pmt)).quantize(Decimal("0.01"), ROUND_HALF_UP)


def calculate_apr(
    loan_amount: Decimal,
    monthly_payment: Decimal,
    term_months: int,
    finance_charges: Decimal,
) -> Decimal:
    """
    Calculate annual percentage rate (APR) per Reg Z.

    APR is the monthly rate `r` satisfying:
        net_proceeds = PMT * (1 - (1+r)^-n) / r
    where net_proceeds = loan_amount - finance_charges,
    then APR = r * 12 * 100 (expressed as a percent).

    Uses Newton–Raphson iteration.
    """
    net = float(loan_amount) - float(finance_charges)
    pmt = float(monthly_payment)
    n = term_months

    if net <= 0 or pmt <= 0 or n == 0:
        return Decimal("0.0000")

    # Initial guess: note rate approximated as APR/12
    r = pmt / net / n  # rough starting point

    for _ in range(200):
        if abs(r) < 1e-12:
            break
        pv = pmt * (1.0 - (1.0 + r) ** (-n)) / r
        # d(PV)/dr
        dpv = pmt * (
            (n * (1.0 + r) ** (-n - 1.0) / r)
            - (1.0 - (1.0 + r) ** (-n)) / r ** 2
        )
        if dpv == 0:
            break
        delta = (pv - net) / dpv
        r -= delta
        if abs(delta) < 1e-10:
            break

    apr = r * 12.0 * 100.0
    return Decimal(str(round(apr, 4))).quantize(Decimal("0.0001"), ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Cash-to-Close Calculation
# ---------------------------------------------------------------------------

def calculate_cash_to_close(
    loan_amount: Decimal,
    total_closing_costs: Decimal,
    lender_credits: Decimal,
    seller_credits: Decimal,
    deposit: Decimal,
    purchase_price: Decimal | None = None,
    is_purchase: bool = True,
) -> Decimal:
    """
    Estimate cash to close per the TRID cash-to-close table.

    Purchase: cash_to_close = down_payment + closing_costs - lender_credits
              - seller_credits - deposit
    Refinance: cash_to_close = closing_costs - lender_credits - seller_credits
    """
    if is_purchase and purchase_price is not None:
        down_payment = purchase_price - loan_amount
    else:
        down_payment = Decimal("0.00")

    result = (
        down_payment
        + total_closing_costs
        - lender_credits
        - seller_credits
        - deposit
    )
    return result.quantize(Decimal("0.01"), ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Fee Tolerance Checking
# ---------------------------------------------------------------------------

def check_tolerance(
    original_fees: dict[str, Decimal],  # fee_name → amount from original LE
    revised_fees: dict[str, Decimal],   # fee_name → amount from revised LE
    tolerance_map: dict[str, str],      # fee_name → "Zero" | "TenPercent" | "Unlimited"
) -> dict:
    """
    Compare two LE fee schedules and identify any tolerance violations.
    Returns a dict with:
      - zero_violations: list of fees that increased (zero tolerance)
      - ten_pct_bucket_original: total of 10%-tolerance fees at origination
      - ten_pct_bucket_revised: total of 10%-tolerance fees at revision
      - ten_pct_exceeded: bool — did the 10% bucket exceed the 10% threshold?
      - cure_amount: amount lender must refund to cure zero-tolerance violations
    """
    zero_violations = []
    cure_amount = Decimal("0.00")
    ten_orig = Decimal("0.00")
    ten_revised = Decimal("0.00")

    for fee_name, orig_amount in original_fees.items():
        rev_amount = revised_fees.get(fee_name, Decimal("0.00"))
        tol = tolerance_map.get(fee_name, "Unlimited")

        if tol == "Zero":
            increase = rev_amount - orig_amount
            if increase > 0:
                zero_violations.append({
                    "fee_name": fee_name,
                    "original": float(orig_amount),
                    "revised": float(rev_amount),
                    "increase": float(increase),
                })
                cure_amount += increase
        elif tol == "TenPercent":
            ten_orig += orig_amount
            ten_revised += rev_amount

    ten_pct_threshold = ten_orig * Decimal("0.10")
    ten_pct_exceeded = (ten_revised - ten_orig) > ten_pct_threshold

    return {
        "zero_violations": zero_violations,
        "ten_pct_bucket_original": float(ten_orig),
        "ten_pct_bucket_revised": float(ten_revised),
        "ten_pct_exceeded": ten_pct_exceeded,
        "cure_amount": float(cure_amount),
    }
