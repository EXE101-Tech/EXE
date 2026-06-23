from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from .database import Base

def utc_now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    status = Column(String, default="active")  # active, banned
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    # Relationships
    profile = relationship("UserProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    sports = relationship("UserSport", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user")
    hosted_matches = relationship("Match", back_populates="host")
    participations = relationship("MatchParticipant", back_populates="user")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    gender = Column(String, nullable=True)  # Male, Female, Other
    birth_date = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Relationships
    user = relationship("User", back_populates="profile")

class Sport(Base):
    __tablename__ = "sports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    icon_url = Column(String, nullable=True)

    # Relationships
    user_sports = relationship("UserSport", back_populates="sport")
    courts = relationship("Court", back_populates="sport")
    matches = relationship("Match", back_populates="sport")

class UserSport(Base):
    __tablename__ = "user_sports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    skill_level = Column(String, nullable=False)  # Beginner, Intermediate, Advanced, Expert
    rating = Column(Float, default=5.0)
    games_played = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="sports")
    sport = relationship("Sport", back_populates="user_sports")

class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    courts = relationship("Court", back_populates="venue", cascade="all, delete-orphan")

class Court(Base):
    __tablename__ = "courts"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    price_per_hour = Column(Integer, default=120000)

    # Relationships
    venue = relationship("Venue", back_populates="courts")
    sport = relationship("Sport", back_populates="courts")
    bookings = relationship("Booking", back_populates="court", cascade="all, delete-orphan")
    matches = relationship("Match", back_populates="court")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    court_id = Column(Integer, ForeignKey("courts.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    total_price = Column(Integer, nullable=False)
    status = Column(String, default="confirmed")  # confirmed, cancelled
    created_at = Column(DateTime, default=utc_now_naive)

    # Relationships
    court = relationship("Court", back_populates="bookings")
    user = relationship("User", back_populates="bookings")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    court_id = Column(Integer, ForeignKey("courts.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    required_level = Column(String, default="Intermediate")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    max_players = Column(Integer, default=4)
    status = Column(String, default="OPEN")  # OPEN, FULL, PLAYING, FINISHED, CANCELLED
    created_at = Column(DateTime, default=utc_now_naive)

    # Relationships
    host = relationship("User", back_populates="hosted_matches")
    sport = relationship("Sport", back_populates="matches")
    court = relationship("Court", back_populates="matches")
    participants = relationship("MatchParticipant", back_populates="match", cascade="all, delete-orphan")

class MatchParticipant(Base):
    __tablename__ = "match_participants"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="PLAYER")  # HOST, PLAYER
    status = Column(String, default="APPROVED")  # PENDING, APPROVED, REJECTED
    joined_at = Column(DateTime, default=utc_now_naive)

    # Relationships
    match = relationship("Match", back_populates="participants")
    user = relationship("User", back_populates="participations")

class BlacklistedToken(Base):
    __tablename__ = "blacklisted_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime, default=utc_now_naive)

class LoginAttempt(Base):
    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    ip = Column(String, index=True, nullable=False)
    attempted_at = Column(DateTime, default=utc_now_naive)
