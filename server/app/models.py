from datetime import datetime, timezone
from sqlalchemy import CheckConstraint, Column, Integer, String, Float, DateTime, ForeignKey, Text, Table, Boolean, JSON, UniqueConstraint
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
    owner_status = Column(String, default="none", nullable=False)  # none, registered
    created_at = Column(DateTime, default=utc_now_naive)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    # Relationships
    profile = relationship("UserProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    sports = relationship("UserSport", back_populates="user", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="user")
    hosted_matches = relationship("Match", back_populates="host")
    participations = relationship("MatchParticipant", back_populates="user")
    owned_teams = relationship("Team", back_populates="owner")
    team_memberships = relationship("TeamMembership", back_populates="user", cascade="all, delete-orphan")
    team_reviews = relationship("TeamReview", back_populates="user", cascade="all, delete-orphan")
    lfg_posts = relationship("LfgPost", back_populates="author")
    lfg_participations = relationship("LfgPostParticipant", back_populates="user", cascade="all, delete-orphan")
    conversations_as_user1 = relationship("Conversation", foreign_keys="Conversation.user1_id", back_populates="user1")
    conversations_as_user2 = relationship("Conversation", foreign_keys="Conversation.user2_id", back_populates="user2")
    sent_messages = relationship("Message", back_populates="sender")

class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    cover_url = Column(Text, nullable=True)
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
    sport_key = Column(String(40), nullable=True)
    price_label = Column(String(100), nullable=True)
    court_count = Column(Integer, nullable=False, default=1)
    facilities = Column(JSON, nullable=False, default=dict)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # Relationships
    courts = relationship("Court", back_populates="venue", cascade="all, delete-orphan")

class Court(Base):
    __tablename__ = "courts"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    price_per_hour = Column(Integer, default=120000)
    is_active = Column(Boolean, nullable=False, default=True)

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


class VenueReservationBlock(Base):
    """An owner-entered reservation made outside SportGo; blocks online booking."""
    __tablename__ = "venue_reservation_blocks"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id", ondelete="CASCADE"), nullable=False, index=True)
    court_id = Column(Integer, ForeignKey("courts.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id", ondelete="CASCADE"), nullable=False)
    court_id = Column(Integer, ForeignKey("courts.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    price_info = Column(String(120), nullable=True)
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
    note = Column(Text, nullable=True)
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


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(160), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False, index=True)
    sport_key = Column(String(40), nullable=True, index=True)
    sport_name = Column(String(80), nullable=True)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    total_slots = Column(Integer, nullable=False, default=20)
    image_url = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    rating = Column(Float, nullable=True, default=0.0)
    rating_count = Column(Integer, nullable=False, default=0)
    avatar_badge = Column(String, nullable=True)
    bg_gradient = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

    owner = relationship("User", back_populates="owned_teams")
    memberships = relationship("TeamMembership", back_populates="team", cascade="all, delete-orphan")
    reviews = relationship("TeamReview", back_populates="team", cascade="all, delete-orphan")


class TeamMembership(Base):
    __tablename__ = "team_memberships"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_membership"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED
    joined_at = Column(DateTime, default=utc_now_naive, nullable=False)

    team = relationship("Team", back_populates="memberships")
    user = relationship("User", back_populates="team_memberships")


class TeamReview(Base):
    __tablename__ = "team_reviews"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_review"),)

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

    team = relationship("Team", back_populates="reviews")
    user = relationship("User", back_populates="team_reviews")


class LfgPost(Base):
    __tablename__ = "lfg_posts"

    id = Column(Integer, primary_key=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sport_id = Column(String(40), nullable=False, index=True)
    sport_name = Column(String(80), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(255), nullable=False)
    time_slot = Column(String(100), nullable=False)
    date_label = Column(String(100), nullable=False)
    current_members = Column(Integer, nullable=False, default=1)
    total_members = Column(Integer, nullable=False, default=4)
    price = Column(String(120), nullable=True)
    skill_level = Column(String(80), nullable=False)
    image_url = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="OPEN")  # OPEN, FULL, CANCELLED
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)

    author = relationship("User", back_populates="lfg_posts")
    participants = relationship("LfgPostParticipant", back_populates="post", cascade="all, delete-orphan")


class LfgPostParticipant(Base):
    __tablename__ = "lfg_post_participants"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_lfg_post_participant"),)

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("lfg_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime, default=utc_now_naive, nullable=False)

    post = relationship("LfgPost", back_populates="participants")
    user = relationship("User", back_populates="lfg_participations")


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (UniqueConstraint("user1_id", "user2_id", name="uq_direct_conversation_pair"),)

    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_message = Column(String, nullable=True)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive)

    user1 = relationship("User", foreign_keys=[user1_id], back_populates="conversations_as_user1")
    user2 = relationship("User", foreign_keys=[user2_id], back_populates="conversations_as_user2")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now_naive)
    is_read = Column(Integer, default=0)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("user_low_id", "user_high_id", name="uq_friendship_pair"),
        CheckConstraint("user_low_id < user_high_id", name="ck_friendship_ordered_users"),
        CheckConstraint("requester_id IN (user_low_id, user_high_id)", name="ck_friendship_requester_member"),
        CheckConstraint("status IN ('pending', 'accepted')", name="ck_friendship_status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_low_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user_high_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=utc_now_naive, nullable=False)
    updated_at = Column(DateTime, default=utc_now_naive, onupdate=utc_now_naive, nullable=False)

    user_low = relationship("User", foreign_keys=[user_low_id])
    user_high = relationship("User", foreign_keys=[user_high_id])
