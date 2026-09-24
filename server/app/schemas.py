from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator
from typing import List, Optional, Dict
from datetime import datetime, timezone
import re


def normalize_cost_thousands(value: str) -> str:
    raw_value = str(value).strip()
    if re.fullmatch(r"\d+", raw_value):
        amount_vnd = int(raw_value) * 1000
    elif re.fullmatch(r"\d{1,3}(?:\.\d{3})+", raw_value):
        amount_vnd = int(raw_value.replace(".", ""))
    else:
        raise ValueError("Chi phí phải là số nguyên theo đơn vị nghìn đồng (ví dụ: 50 hoặc 50.000)")

    if amount_vnd % 1000 != 0:
        raise ValueError("Chi phí phải là bội số của 1.000 đồng, không nhập số thập phân")
    normalized = str(amount_vnd)
    if len(normalized) > 120:
        raise ValueError("Chi phí vượt quá giới hạn cho phép")
    return normalized

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


class GoogleLoginRequest(BaseModel):
    code: str = Field(min_length=1, max_length=4096)

# Sport Schemas
class SportBase(BaseModel):
    name: str
    icon_url: Optional[str] = None

class SportCreate(SportBase):
    pass

class SportResponse(SportBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SportCatalogItem(BaseModel):
    id: Optional[int] = None
    key: str
    name: str

class SearchResult(BaseModel):
    kind: str
    id: int
    title: str
    subtitle: str
    href: str

# User Sport Schemas
class UserSportBase(BaseModel):
    sport_id: int
    skill_level: str  # Beginner, Intermediate, Advanced, Expert

class UserSportCreate(UserSportBase):
    pass

class UserSportResponse(UserSportBase):
    id: int
    user_id: int
    rating: float
    games_played: int
    sport: SportResponse
    model_config = ConfigDict(from_attributes=True)

# Profile Schemas
class UserProfileBase(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserProfileUpdate(UserProfileBase):
    pass

class UserProfileWithSportsUpdate(BaseModel):
    name: Optional[str] = None
    sports: Optional[Dict[str, str]] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    user_id: int
    model_config = ConfigDict(from_attributes=True)

# User Schemas
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    password: str
    name: str

class UserLogin(UserBase):
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    status: str
    owner_status: str = "none"
    created_at: datetime
    profile: Optional[UserProfileResponse] = None
    sports: List[UserSportResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Venue / Court Schemas
class VenueBase(BaseModel):
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None

class VenueCreate(VenueBase):
    pass

class OwnerRegistrationRequest(BaseModel):
    accepted_terms: bool

class OwnerRegistrationResponse(BaseModel):
    owner_status: str
    owned_venues_count: int

class OwnerVenueCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    address: str = Field(..., min_length=3, max_length=255)
    sport_id: str = Field(..., min_length=2, max_length=40)
    price_label: str = Field("50.000đ", max_length=100)
    court_count: int = Field(1, ge=1, le=50)
    facilities: Dict[str, bool] = Field(default_factory=dict)
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None

class OwnerVenueUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=160)
    address: Optional[str] = Field(None, min_length=3, max_length=255)
    sport_id: Optional[str] = Field(None, min_length=2, max_length=40)
    price_label: Optional[str] = Field(None, max_length=100)
    court_count: Optional[int] = Field(None, ge=1, le=50)
    facilities: Optional[Dict[str, bool]] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None

class OwnerVenueResponse(BaseModel):
    id: int
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None
    sport_id: Optional[str] = None
    price_label: Optional[str] = None
    court_count: int
    facilities: Dict[str, bool] = Field(default_factory=dict)
    image_url: Optional[str] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class OwnerReservationBlockCreate(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("start_time", "end_time")
    @classmethod
    def store_utc_naive(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value

    @model_validator(mode="after")
    def validate_times(self) -> "OwnerReservationBlockCreate":
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải sau thời gian bắt đầu")
        return self

class OwnerScheduleItem(BaseModel):
    id: int
    court_id: int
    court_name: str
    start_time: datetime
    end_time: datetime
    kind: str
    status: Optional[str] = None
    note: Optional[str] = None


class UserStatsResponse(BaseModel):
    games_played: int = 0
    teams_joined: int = 0
    bookings_count: int = 0
    average_skill_rating: Optional[float] = None

class CourtBase(BaseModel):
    name: str
    sport_id: int
    price_per_hour: Optional[float] = 120000.0

class CourtCreate(CourtBase):
    venue_id: int

class VenueMinResponse(BaseModel):
    id: int
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CourtResponse(BaseModel):
    id: int
    venue_id: int
    name: str
    sport_id: int
    price_per_hour: int
    sport: SportResponse
    venue: VenueMinResponse
    model_config = ConfigDict(from_attributes=True)

class VenueResponse(VenueBase):
    id: int
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    sport_key: Optional[str] = None
    price_label: Optional[str] = None
    court_count: int = 0
    facilities: Dict[str, bool] = Field(default_factory=dict)
    image_url: Optional[str] = None
    rating: Optional[float] = None
    review_count: int = 0
    courts: List[CourtResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Booking Schemas
class BookingCreate(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime

    @field_validator("start_time", "end_time")
    @classmethod
    def store_utc_naive(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value

    @model_validator(mode='after')
    def validate_times(self) -> 'BookingCreate':
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải lớn hơn thời gian bắt đầu")
        return self

class BookingBatchCreate(BaseModel):
    bookings: List[BookingCreate] = Field(..., min_length=1, max_length=100)

class BookingResponse(BaseModel):
    id: int
    court_id: int
    user_id: int
    start_time: datetime
    end_time: datetime
    total_price: int
    status: str
    created_at: datetime
    court: CourtResponse
    model_config = ConfigDict(from_attributes=True)

# Match Schemas
class MatchParticipantResponse(BaseModel):
    id: int
    match_id: int
    user_id: int
    role: str
    status: str
    note: Optional[str] = None
    joined_at: datetime
    user: UserResponse
    model_config = ConfigDict(from_attributes=True)

class MatchCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    price_info: str = Field(..., min_length=1, max_length=120, description="Chi phí nhập theo nghìn đồng; response được chuẩn hóa thành chuỗi số tiền VND")
    sport_id: int
    court_id: Optional[int] = None
    required_level: str
    start_time: datetime
    end_time: datetime
    max_players: int = Field(..., ge=2)

    @field_validator("start_time", "end_time")
    @classmethod
    def store_utc_naive(cls, value: datetime) -> datetime:
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value

    @model_validator(mode='after')
    def validate_times(self) -> 'MatchCreate':
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải lớn hơn thời gian bắt đầu")
        return self

    @field_validator('required_level')
    @classmethod
    def validate_required_level(cls, v: str) -> str:
        valid_levels = {"Beginner", "Intermediate", "Advanced", "Expert"}
        if v not in valid_levels:
            raise ValueError("Mức độ kỹ năng phải thuộc một trong các giá trị: Beginner, Intermediate, Advanced, Expert")
        return v

    @field_validator("price_info")
    @classmethod
    def validate_price_info(cls, value: str) -> str:
        return normalize_cost_thousands(value)

class MatchResponse(BaseModel):
    id: int
    host_id: int
    sport_id: int
    court_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    required_level: str
    start_time: datetime
    end_time: datetime
    max_players: int
    status: str
    created_at: datetime
    host: UserResponse
    sport: SportResponse
    court: Optional[CourtResponse] = None
    participants: List[MatchParticipantResponse] = []
    model_config = ConfigDict(from_attributes=True)

class ParticipantStatusUpdate(BaseModel):
    status: str

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {"APPROVED", "REJECTED"}
        if v not in valid_statuses:
            raise ValueError("Trạng thái phải là APPROVED hoặc REJECTED")
        return v


class MatchJoinRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


class ChatConversationCreate(BaseModel):
    recipient_id: int = Field(..., gt=0)


class FriendRequestCreate(BaseModel):
    recipient_id: int = Field(..., gt=0)


class ChatMessageCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Tin nhắn không được để trống")
        return value


class ChatUserResponse(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None


class ChatUserSearchResponse(ChatUserResponse):
    friendship_status: str = "none"
    friendship_id: Optional[int] = None


class FriendshipResponse(BaseModel):
    id: int
    requester_id: int
    status: str
    user: ChatUserResponse
    created_at: datetime


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    text: str
    created_at: datetime
    is_read: bool


class ChatConversationResponse(BaseModel):
    id: int
    other_user: ChatUserResponse
    last_message: Optional[str] = None
    updated_at: Optional[datetime] = None
    unread_count: int = 0


class ChatConversationDetailResponse(ChatConversationResponse):
    messages: List[ChatMessageResponse] = Field(default_factory=list)


class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    body: str
    target_url: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    created_at: datetime
    actor: Optional[ChatUserResponse] = None


class NotificationListResponse(BaseModel):
    items: List[NotificationResponse] = Field(default_factory=list)
    unread_count: int = 0


class BookingAvailabilityItem(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime


# Team / club schemas
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=160)
    sport_id: str = Field(..., min_length=2, max_length=40)
    sport_name: str = Field(..., min_length=2, max_length=80)
    description: Optional[str] = None
    location: str = Field(..., min_length=2, max_length=255)
    total_slots: int = Field(20, ge=2, le=500)
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=160)
    sport_id: Optional[str] = Field(None, min_length=2, max_length=40)
    sport_name: Optional[str] = Field(None, min_length=2, max_length=80)
    description: Optional[str] = None
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    total_slots: Optional[int] = Field(None, ge=2, le=500)
    image_url: Optional[str] = None
    tags: Optional[List[str]] = None

class TeamResponse(BaseModel):
    id: int
    owner_id: Optional[int] = None
    owner_name: str
    name: str
    sport_id: str
    sport_name: str
    description: Optional[str] = None
    location: str
    total_slots: int
    member_count: int
    rating: float
    rating_count: int
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    membership_status: Optional[str] = None
    is_captain: bool = False
    is_member: bool = False
    created_at: datetime

class TeamMemberResponse(BaseModel):
    id: int
    team_id: int
    user_id: int
    full_name: Optional[str] = None
    email: Optional[str] = None
    status: str
    joined_at: datetime

class TeamMembershipStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in {"APPROVED", "REJECTED"}:
            raise ValueError("Trạng thái phải là APPROVED hoặc REJECTED")
        return value

class TeamReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

class TeamReviewResponse(BaseModel):
    id: int
    team_id: int
    user_id: int
    rating: int
    comment: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Forum / find-a-game (LFG) schemas
class LfgPostCreate(BaseModel):
    sport_id: str = Field(..., min_length=2, max_length=40)
    sport_name: str = Field(..., min_length=2, max_length=80)
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    location: str = Field(..., min_length=2, max_length=255)
    time_slot: str = Field(..., min_length=1, max_length=100)
    date_label: str = Field(..., min_length=1, max_length=100)
    current_members: int = Field(1, ge=1, le=500)
    total_members: int = Field(4, ge=2, le=500)
    price: str = Field(..., min_length=1, max_length=120, description="Chi phí nhập theo nghìn đồng; response được chuẩn hóa thành chuỗi số tiền VND")
    skill_level: str = Field(..., min_length=1, max_length=80)
    image_url: Optional[str] = None

    @model_validator(mode="after")
    def validate_member_counts(self):
        if self.current_members > self.total_members:
            raise ValueError("Số người hiện có không được vượt quá tổng số người")
        return self

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: str) -> str:
        return normalize_cost_thousands(value)


class LfgPostUpdate(BaseModel):
    sport_id: Optional[str] = Field(None, min_length=2, max_length=40)
    sport_name: Optional[str] = Field(None, min_length=2, max_length=80)
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = Field(None, min_length=2, max_length=255)
    time_slot: Optional[str] = Field(None, min_length=1, max_length=100)
    date_label: Optional[str] = Field(None, min_length=1, max_length=100)
    total_members: Optional[int] = Field(None, ge=2, le=500)
    price: Optional[str] = Field(None, max_length=120)
    skill_level: Optional[str] = Field(None, min_length=1, max_length=80)
    image_url: Optional[str] = None

    @field_validator("price")
    @classmethod
    def validate_price(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            raise ValueError("Chi phí là bắt buộc khi đăng bài")
        return normalize_cost_thousands(value)

class LfgPostResponse(BaseModel):
    id: int
    author_id: int
    author_name: str
    author_avatar_url: Optional[str] = None
    author_owner_status: str = "none"
    sport_id: str
    sport_name: str
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    price_info: Optional[str] = None
    location: str
    time_slot: str
    date_label: str
    current_members: int
    total_members: int
    price: Optional[str] = None
    skill_level: str
    image_url: Optional[str] = None
    status: str
    has_joined: bool = False
    membership_status: Optional[str] = None
    pending_participants_count: int = 0
    approved_participants_count: int = 0
    created_at: datetime


class LfgParticipantStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in {"APPROVED", "REJECTED"}:
            raise ValueError("Trạng thái phải là APPROVED hoặc REJECTED")
        return value


class LfgParticipantResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    name: str
    avatar_url: Optional[str] = None
    status: str
    joined_at: datetime
