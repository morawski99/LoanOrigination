"""
Development seed script — creates all tables and a demo admin user.
Run from the backend/ directory:
    python3 seed_dev.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.base import Base
from app.models.user import User, UserRole
from app.models.loan import Loan, LoanStatus, LoanPurposeType, LoanType
from app.models.borrower import Borrower
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
from app.core.security import hash_password

DATABASE_URL = "sqlite+aiosqlite:///./dev.db"

DEMO_USERS = [
    {"email": "admin@loanorigination.com",    "password": "Admin1234!",  "full_name": "Demo Admin",           "role": UserRole.ADMIN},
    {"email": "lo@loanorigination.com",        "password": "Admin1234!",  "full_name": "Jane Smith",           "role": UserRole.LOAN_OFFICER},
    {"email": "processor@loanorigination.com", "password": "Admin1234!",  "full_name": "Bob Processor",        "role": UserRole.PROCESSOR},
    {"email": "uw@loanorigination.com",        "password": "Admin1234!",  "full_name": "Carol Underwriter",    "role": UserRole.UNDERWRITER},
    {"email": "closer@loanorigination.com",    "password": "Admin1234!",  "full_name": "Dave Closer",          "role": UserRole.CLOSER},
]


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All tables created")

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    from sqlalchemy import select
    async with session_factory() as session:
        for u in DEMO_USERS:
            result = await session.execute(select(User).where(User.email == u["email"]))
            if result.scalar_one_or_none():
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
            print(f"  + {u['email']}  ({u['role'].value})")

        await session.commit()

    await engine.dispose()
    print("\n✓ Seed complete. Demo credentials (all share same password):")
    print("─" * 50)
    for u in DEMO_USERS:
        print(f"  {u['role'].value:<25} {u['email']}")
    print(f"\n  Password: Admin1234!")
    print("─" * 50)


if __name__ == "__main__":
    asyncio.run(seed())
