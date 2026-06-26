import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.database import engine, Base
from app.routers import auth, courts, gamerooms, bookings, teams, chat, posts

# Create all database tables on startup if they do not exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EXE101 Badminton Social Network & Booking API",
    description="Python FastAPI backend with PostgreSQL support for EXE101",
    version="1.0.0"
)

# Configure CORS so our React Frontend can fetch APIs from localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev. Change in production.
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
app.include_router(chat.router, prefix="/api")
app.include_router(posts.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "EXE101 Badminton Social Network API is running. Go to /docs for Swagger UI documentation."
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=5000, reload=True)
