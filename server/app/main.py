import asyncio
import logging
import sys
import os
from contextlib import asynccontextmanager
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.database import engine, Base, SessionLocal
from app.admin_seed import bootstrap_admins
from app.routers import auth, courts, gamerooms, bookings, teams, lfg, owner, chat, search, storage, notifications, social, admin
from app.auto_room_invites import process_auto_room_invites
from app.team_fee_reminders import process_team_fee_reminders

logger = logging.getLogger(__name__)

# Create all database tables on startup if they do not exist
Base.metadata.create_all(bind=engine)
bootstrap_admins(engine, SessionLocal)

async def _auto_room_invite_worker():
    while True:
        db = SessionLocal()
        try:
            process_auto_room_invites(db)
            process_team_fee_reminders(db)
        except Exception:
            db.rollback()
            logger.exception("Automatic Premium room invitation cycle failed")
        finally:
            db.close()
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    worker = asyncio.create_task(_auto_room_invite_worker())
    try:
        yield
    finally:
        worker.cancel()
        try:
            await worker
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="EXE101 Badminton Social Network & Booking API",
    description="Python FastAPI backend with PostgreSQL support for EXE101",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS so our React Frontend can fetch APIs from localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://sportgo.io.vn",
        "https://www.sportgo.io.vn",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers with /api prefix to match frontend service URLs
app.include_router(auth.router, prefix="/api")
app.include_router(courts.router, prefix="/api")
app.include_router(gamerooms.router, prefix="/api")
app.include_router(bookings.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(lfg.router, prefix="/api")
app.include_router(owner.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(storage.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(social.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "EXE101 Badminton Social Network API is running. Go to /docs for Swagger UI documentation."
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
