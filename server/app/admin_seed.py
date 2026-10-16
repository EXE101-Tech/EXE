"""Small idempotent bootstrap for the built-in moderator accounts.

The passwords are only used here to create bcrypt hashes; they are never stored in
the database or returned by an API response.  Deployments can override them with
SPORTGO_ADMIN1_PASSWORD / SPORTGO_ADMIN2_PASSWORD.
"""

import os

from sqlalchemy import func, inspect, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app import auth_utils, models


DEFAULT_ADMINS = (
    ("admin1@gmail.com", "Quản trị viên 1", "SPORTGO_ADMIN1_PASSWORD"),
    ("admin2@gmail.com", "Quản trị viên 2", "SPORTGO_ADMIN2_PASSWORD"),
)


def ensure_admin_schema(engine) -> None:
    """Add the role column to an existing database before seeding accounts."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("users")}
    default = "FALSE" if engine.dialect.name not in {"sqlite"} else "0"
    with engine.begin() as connection:
        if "is_admin" not in columns:
            connection.execute(text(f"ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT {default}"))
        if "premium_until" not in columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN premium_until TIMESTAMP NULL"))

        # Payment intents are created before the user uploads a proof image. Older
        # databases were created with proof_url NOT NULL, so relax that constraint
        # when the database supports the native ALTER operation.
        table_names = set(inspector.get_table_names())
        if "premium_payments" in table_names and engine.dialect.name == "postgresql":
            payment_columns = {column["name"]: column for column in inspector.get_columns("premium_payments")}
            if "proof_url" in payment_columns and not payment_columns["proof_url"].get("nullable", True):
                connection.execute(text("ALTER TABLE premium_payments ALTER COLUMN proof_url DROP NOT NULL"))


def ensure_admin_accounts(db: Session) -> None:
    """Create the two requested accounts and make the operation repeatable."""
    changed = False
    for email, name, password_env in DEFAULT_ADMINS:
        password = os.getenv(password_env, "123456")
        user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
        if user is None:
            user = models.User(
                email=email,
                password_hash=auth_utils.get_password_hash(password),
                status="active",
                is_admin=True,
            )
            db.add(user)
            db.flush()
            db.add(models.UserProfile(user_id=user.id, full_name=name))
            changed = True
            continue

        if not user.is_admin or user.status != "active":
            user.is_admin = True
            user.status = "active"
            changed = True
        if user.profile is None:
            db.add(models.UserProfile(user_id=user.id, full_name=name))
            changed = True

    if changed:
        db.commit()


def bootstrap_admins(engine, session_factory) -> None:
    """Run startup bootstrap without preventing the API from starting."""
    try:
        ensure_admin_schema(engine)
        with session_factory() as db:
            ensure_admin_accounts(db)
    except SQLAlchemyError:
        # A missing database service should still let the development server boot;
        # the next healthy startup will retry the bootstrap.
        return
