"""
Development seed script — creates all tables, demo users, and sample loans.
Run from the backend/ directory:
    python3 seed_dev.py
"""
import asyncio
import sys
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.loan import Loan, LoanStatus, LoanPurposeType, LoanType
from app.models.borrower import Borrower, BorrowerClassification
from app.models.document import Document
from app.models.audit_log import AuditLog
from app.models.residence import BorrowerResidence
from app.models.employment import BorrowerEmployment
from app.models.other_income import BorrowerOtherIncome
from app.models.asset import BorrowerAsset
from app.models.liability import BorrowerLiability
from app.models.reo import RealEstateOwned
from app.models.declaration import BorrowerDeclaration
from app.models.military_service import BorrowerMilitaryService
from app.models.demographics import BorrowerDemographics
from app.models.aus_result import AUSResult
from app.models.condition import Condition
from app.models.loan_estimate import LoanEstimate
from app.models.closing import ClosingDisclosure, ClosingChecklist, WireInstruction, FundingStatus
from app.models.underwriting_decision import UnderwritingDecision
from app.models.hmda_record import HMDARecord
from app.models.adverse_action import AdverseActionNotice
from app.core.security import hash_password

DATABASE_URL = "sqlite+aiosqlite:///./dev.db"

DEMO_USERS = [
    {"email": "admin@loanorigination.com",    "password": "Admin1234!",  "full_name": "Demo Admin",           "role": UserRole.ADMIN},
    {"email": "lo@loanorigination.com",        "password": "Admin1234!",  "full_name": "Jane Smith",           "role": UserRole.LOAN_OFFICER},
    {"email": "processor@loanorigination.com", "password": "Admin1234!",  "full_name": "Bob Processor",        "role": UserRole.PROCESSOR},
    {"email": "uw@loanorigination.com",        "password": "Admin1234!",  "full_name": "Carol Underwriter",    "role": UserRole.UNDERWRITER},
    {"email": "closer@loanorigination.com",    "password": "Admin1234!",  "full_name": "Dave Closer",          "role": UserRole.CLOSER},
]

DEMO_LOANS = [
    {
        "loan_number": "LN-2026-001",
        "status": LoanStatus.IN_PROCESS,
        "loan_purpose_type": LoanPurposeType.PURCHASE,
        "loan_type": LoanType.CONVENTIONAL,
        "loan_amount": Decimal("425000.00"),
        "note_rate_percent": Decimal("6.7500"),
        "property_address_line": "1234 Oak Avenue",
        "property_city": "Austin",
        "property_state": "TX",
        "property_zip": "78701",
        "property_county": "Travis",
        "application_received_date": date(2026, 3, 15),
        "estimated_close_date": date(2026, 4, 30),
        "borrower": {
            "first_name": "Michael",
            "last_name": "Johnson",
            "email": "michael.johnson@email.com",
            "phone": "512-555-0101",
            "credit_score": 745,
            "date_of_birth": date(1988, 5, 12),
        },
    },
    {
        "loan_number": "LN-2026-002",
        "status": LoanStatus.NEW,
        "loan_purpose_type": LoanPurposeType.PURCHASE,
        "loan_type": LoanType.FHA,
        "loan_amount": Decimal("285000.00"),
        "note_rate_percent": Decimal("6.2500"),
        "property_address_line": "567 Maple Drive",
        "property_city": "Denver",
        "property_state": "CO",
        "property_zip": "80202",
        "property_county": "Denver",
        "application_received_date": date(2026, 3, 22),
        "estimated_close_date": date(2026, 5, 15),
        "borrower": {
            "first_name": "Sarah",
            "last_name": "Williams",
            "email": "sarah.williams@email.com",
            "phone": "303-555-0202",
            "credit_score": 680,
            "date_of_birth": date(1992, 9, 3),
        },
    },
    {
        "loan_number": "LN-2026-003",
        "status": LoanStatus.CONDITIONAL_APPROVAL,
        "loan_purpose_type": LoanPurposeType.REFINANCE,
        "loan_type": LoanType.CONVENTIONAL,
        "loan_amount": Decimal("520000.00"),
        "note_rate_percent": Decimal("6.5000"),
        "property_address_line": "890 Pine Street",
        "property_city": "Seattle",
        "property_state": "WA",
        "property_zip": "98101",
        "property_county": "King",
        "application_received_date": date(2026, 2, 28),
        "estimated_close_date": date(2026, 4, 15),
        "borrower": {
            "first_name": "David",
            "last_name": "Chen",
            "email": "david.chen@email.com",
            "phone": "206-555-0303",
            "credit_score": 790,
            "date_of_birth": date(1985, 1, 20),
        },
    },
    {
        "loan_number": "LN-2026-004",
        "status": LoanStatus.APPROVED,
        "loan_purpose_type": LoanPurposeType.PURCHASE,
        "loan_type": LoanType.VA,
        "loan_amount": Decimal("375000.00"),
        "note_rate_percent": Decimal("6.0000"),
        "property_address_line": "2100 Elm Boulevard",
        "property_city": "San Antonio",
        "property_state": "TX",
        "property_zip": "78205",
        "property_county": "Bexar",
        "application_received_date": date(2026, 2, 10),
        "estimated_close_date": date(2026, 4, 5),
        "borrower": {
            "first_name": "James",
            "last_name": "Rodriguez",
            "email": "james.rodriguez@email.com",
            "phone": "210-555-0404",
            "credit_score": 720,
            "date_of_birth": date(1980, 7, 4),
        },
    },
    {
        "loan_number": "LN-2026-005",
        "status": LoanStatus.IN_PROCESS,
        "loan_purpose_type": LoanPurposeType.CASH_OUT_REFINANCE,
        "loan_type": LoanType.CONVENTIONAL,
        "loan_amount": Decimal("650000.00"),
        "note_rate_percent": Decimal("7.1250"),
        "property_address_line": "44 Harbor View Lane",
        "property_city": "Miami",
        "property_state": "FL",
        "property_zip": "33101",
        "property_county": "Miami-Dade",
        "application_received_date": date(2026, 3, 18),
        "estimated_close_date": date(2026, 5, 1),
        "borrower": {
            "first_name": "Emily",
            "last_name": "Thompson",
            "email": "emily.thompson@email.com",
            "phone": "305-555-0505",
            "credit_score": 760,
            "date_of_birth": date(1990, 11, 15),
        },
    },
    {
        "loan_number": "LN-2026-006",
        "status": LoanStatus.NEW,
        "loan_purpose_type": LoanPurposeType.PURCHASE,
        "loan_type": LoanType.USDA,
        "loan_amount": Decimal("195000.00"),
        "note_rate_percent": Decimal("6.3750"),
        "property_address_line": "789 Country Road",
        "property_city": "Boise",
        "property_state": "ID",
        "property_zip": "83702",
        "property_county": "Ada",
        "application_received_date": date(2026, 3, 25),
        "estimated_close_date": date(2026, 5, 20),
        "borrower": {
            "first_name": "Robert",
            "last_name": "Miller",
            "email": "robert.miller@email.com",
            "phone": "208-555-0606",
            "credit_score": 695,
            "date_of_birth": date(1995, 3, 28),
        },
    },
    {
        "loan_number": "LN-2026-007",
        "status": LoanStatus.SUSPENDED,
        "loan_purpose_type": LoanPurposeType.PURCHASE,
        "loan_type": LoanType.CONVENTIONAL,
        "loan_amount": Decimal("340000.00"),
        "note_rate_percent": Decimal("6.8750"),
        "property_address_line": "1500 Birch Court",
        "property_city": "Portland",
        "property_state": "OR",
        "property_zip": "97201",
        "property_county": "Multnomah",
        "application_received_date": date(2026, 1, 20),
        "estimated_close_date": date(2026, 4, 10),
        "borrower": {
            "first_name": "Lisa",
            "last_name": "Anderson",
            "email": "lisa.anderson@email.com",
            "phone": "503-555-0707",
            "credit_score": 640,
            "date_of_birth": date(1987, 8, 22),
        },
    },
    {
        "loan_number": "LN-2026-008",
        "status": LoanStatus.FUNDED,
        "loan_purpose_type": LoanPurposeType.PURCHASE,
        "loan_type": LoanType.CONVENTIONAL,
        "loan_amount": Decimal("480000.00"),
        "note_rate_percent": Decimal("6.6250"),
        "property_address_line": "3200 Sunset Drive",
        "property_city": "Phoenix",
        "property_state": "AZ",
        "property_zip": "85001",
        "property_county": "Maricopa",
        "application_received_date": date(2026, 1, 5),
        "estimated_close_date": date(2026, 3, 1),
        "borrower": {
            "first_name": "Jennifer",
            "last_name": "Martinez",
            "email": "jennifer.martinez@email.com",
            "phone": "602-555-0808",
            "credit_score": 775,
            "date_of_birth": date(1983, 12, 10),
        },
    },
]


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All tables created")

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        # --- Seed users ---
        user_map = {}  # email -> User
        for u in DEMO_USERS:
            result = await session.execute(select(User).where(User.email == u["email"]))
            existing = result.scalar_one_or_none()
            if existing:
                user_map[u["email"]] = existing
                print(f"  (already exists) {u['email']}")
                continue
            user = User(
                email=u["email"],
                hashed_password=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                is_active=True,
            )
            session.add(user)
            user_map[u["email"]] = user
            print(f"  + {u['email']}  ({u['role'].value})")

        await session.flush()

        # --- Seed loans ---
        lo_user = user_map["lo@loanorigination.com"]
        processor_user = user_map["processor@loanorigination.com"]
        uw_user = user_map["uw@loanorigination.com"]

        for loan_data in DEMO_LOANS:
            result = await session.execute(
                select(Loan).where(Loan.loan_number == loan_data["loan_number"])
            )
            if result.scalar_one_or_none():
                print(f"  (already exists) Loan {loan_data['loan_number']}")
                continue

            borrower_data = loan_data.pop("borrower")

            loan = Loan(
                **loan_data,
                created_by_id=lo_user.id,
                assigned_lo_id=lo_user.id,
                assigned_processor_id=processor_user.id,
                assigned_underwriter_id=uw_user.id,
                status_changed_at=datetime.now(timezone.utc),
            )
            session.add(loan)
            await session.flush()

            borrower = Borrower(
                loan_id=loan.id,
                borrower_classification=BorrowerClassification.PRIMARY,
                **borrower_data,
            )
            session.add(borrower)
            # Put borrower_data back for idempotency on re-run
            loan_data["borrower"] = borrower_data

            print(f"  + Loan {loan.loan_number}  ({loan.status.value}) — {borrower_data['first_name']} {borrower_data['last_name']}")

        await session.commit()

    await engine.dispose()
    print("\n✓ Seed complete. Demo credentials (all share same password):")
    print("─" * 50)
    for u in DEMO_USERS:
        print(f"  {u['role'].value:<25} {u['email']}")
    print(f"\n  Password: Admin1234!")
    print(f"\n  {len(DEMO_LOANS)} sample loans seeded")
    print("─" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
