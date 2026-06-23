from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator
from typing import List, Optional
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Sport Schemas
class SportBase(BaseModel):
    name: str
    icon_url: Optional[str] = None

class SportCreate(SportBase):
    pass

class SportResponse(SportBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

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
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    bio: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class UserProfileUpdate(UserProfileBase):
    pass

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
    courts: List[CourtResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Booking Schemas
class BookingCreate(BaseModel):
    court_id: int
    start_time: datetime
    end_time: datetime

    @model_validator(mode='after')
    def validate_times(self) -> 'BookingCreate':
        if self.end_time <= self.start_time:
            raise ValueError("Thời gian kết thúc phải lớn hơn thời gian bắt đầu")
        return self

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
    joined_at: datetime
    user: UserResponse
    model_config = ConfigDict(from_attributes=True)

class MatchCreate(BaseModel):
    title: str
    description: Optional[str] = None
    sport_id: int
    court_id: Optional[int] = None
    required_level: str
    start_time: datetime
    end_time: datetime
    max_players: int = Field(..., ge=2)

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
