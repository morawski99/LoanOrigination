from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.loans import router as loans_router
from app.api.v1.documents import router as documents_router
from app.api.v1.users import router as users_router
from app.api.v1.urla import router as urla_router
from app.api.v1.loan_estimates import router as loan_estimates_router
from app.api.v1.conditions import router as conditions_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(loans_router)
api_router.include_router(documents_router)
api_router.include_router(users_router)
api_router.include_router(urla_router, prefix="/loans", tags=["urla"])
api_router.include_router(loan_estimates_router)
api_router.include_router(conditions_router, prefix="/loans", tags=["conditions"])
