"""Scheduled fee reminders for Premium club owners."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session, joinedload, selectinload

from app import models
from app.notification_utils import create_notification


LOCAL_TIMEZONE = timezone(timedelta(hours=7))


def _now_utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _is_due(team: models.Team, now: datetime) -> bool:
    if not team.owner or not team.owner.is_premium:
        return False
    if team.fee_reminder_day is None or not team.fee_reminder_frequency:
        return False
    local_now = now.replace(tzinfo=timezone.utc).astimezone(LOCAL_TIMEZONE)
    if local_now.weekday() != team.fee_reminder_day:
        return False
    if not team.fee_reminder_last_sent_at:
        return True
    last_local = team.fee_reminder_last_sent_at.replace(tzinfo=timezone.utc).astimezone(LOCAL_TIMEZONE)
    if team.fee_reminder_frequency == "WEEKLY":
        return last_local.date() != local_now.date()
    return (last_local.year, last_local.month) != (local_now.year, local_now.month)


def process_team_fee_reminders(db: Session) -> int:
    now = _now_utc_naive()
    teams = db.query(models.Team).options(
        joinedload(models.Team.owner),
        selectinload(models.Team.memberships),
    ).filter(
        models.Team.fee_reminder_day.isnot(None),
        models.Team.fee_reminder_frequency.isnot(None),
    ).all()
    sent = 0
    for team in teams:
        if not _is_due(team, now):
            continue
        frequency_label = "hàng tuần" if team.fee_reminder_frequency == "WEEKLY" else "hàng tháng"
        for membership in team.memberships or []:
            if membership.status != "APPROVED":
                continue
            create_notification(
                db,
                recipient_id=membership.user_id,
                actor=team.owner,
                notification_type="team_fee_reminder",
                title="Nhắc thu phí CLB",
                body=f'CLB “{team.name}” có lịch nhắc thu phí {frequency_label} hôm nay.',
                target_url=f"/team/{team.id}",
                entity_type="team",
                entity_id=team.id,
            )
        team.fee_reminder_last_sent_at = now
        sent += 1
    if sent:
        db.commit()
    return sent
