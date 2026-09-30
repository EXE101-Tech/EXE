import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load env variables
load_dotenv()

DATABASE_URL = os.getenv("TRANSACTION_DATABASE_URL") or os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/exe101")

# Normalize old postgres:// URLs to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Strip pgbouncer query param that psycopg/psycopg2 doesn't recognize
if "?pgbouncer=true" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?pgbouncer=true", "")
elif "&pgbouncer=true" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&pgbouncer=true", "")

# Auto-adapt driver prefix based on installed library
try:
    import psycopg  # noqa: F401
    _has_psycopg3 = True
except ImportError:
    _has_psycopg3 = False

try:
    import psycopg2  # noqa: F401
    _has_psycopg2 = True
except ImportError:
    _has_psycopg2 = False

if DATABASE_URL.startswith("postgresql+psycopg://") and not _has_psycopg3 and _has_psycopg2:
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql+psycopg2://") and not _has_psycopg2 and _has_psycopg3:
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
