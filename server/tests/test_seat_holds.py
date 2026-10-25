"""Deadline, consent and reservation tests against disposable SQLite only."""
from datetime import timedelta
import unittest

import test_attendance as legacy
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app import attendance, auth_utils, database, models, schemas, seat_holds
from app.auto_room_invites import process_auto_room_invite_for_match, process_auto_room_invites
from app.crud import matches
from app.routers import gamerooms
from app.routers import attendance as attendance_routes


class SeatHoldsTests(unittest.TestCase):
    setUp = legacy.AttendanceTests.setUp
    tearDown = legacy.AttendanceTests.tearDown

    def room(self, minutes=300, capacity=3, enabled=True):
        self.host.premium_until = self.stamp + timedelta(days=7)
        self.db.commit()
        return matches.create_match(self.db, self.host.id, schemas.MatchCreate(
            title="Kèo có hạn giữ chỗ", sport_id=self.sport.id, price_info="50000",
            required_level="Beginner", location="Quận 1", max_players=capacity,
            start_time=self.stamp + timedelta(minutes=minutes), end_time=self.stamp + timedelta(minutes=minutes + 120),
            seat_holds_enabled=enabled))

    def member(self, room, user, confirm=False):
        p = matches.join_match(self.db, room.id, user.id, accepted_hold_policy=room.seat_holds_enabled,
                               expected_arrival_at=self.stamp + timedelta(minutes=5))
        matches.update_match_participant_status(self.db, room.id, user.id, "APPROVED")
        if confirm:
            attendance.confirm(self.db, room, user, room.terms_version)
            self.db.commit()
        return p

    def waitlist(self, room, user):
        return gamerooms.join_waitlist(room.id, schemas.MatchJoinRequest(
            accepted_hold_policy=True, terms_version=room.terms_version), current_user=user, db=self.db)

    def client(self, user):
        app = FastAPI()
        app.include_router(attendance_routes.router, prefix="/api")
        app.include_router(gamerooms.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        app.dependency_overrides[auth_utils.get_current_user] = lambda: user
        app.dependency_overrides[auth_utils.get_optional_current_user] = lambda: user
        return TestClient(app)

    def test_standard_deadline_and_late_approval_grace(self):
        room = self.room()
        p = self.member(room, self.player)
        self.assertEqual(p.response_deadline, room.start_time - timedelta(hours=2))
        self.stamp = room.start_time - timedelta(minutes=125)
        late = self.member(room, self.witness)
        self.assertEqual(late.response_deadline, self.stamp + timedelta(minutes=15))
        self.assertGreater(late.response_deadline, room.start_time - timedelta(hours=2))

    def test_five_minute_grace_at_one_hour_and_fifteen_above_it(self):
        room = self.room(minutes=61)
        p = self.member(room, self.player)
        self.assertEqual(p.response_deadline, self.stamp + timedelta(minutes=15))
        self.stamp += timedelta(minutes=1)
        p2 = self.member(room, self.witness)
        self.assertEqual(p2.response_deadline, self.stamp + timedelta(minutes=5))

    def test_expiry_releases_only_unconfirmed_seat_without_penalties_and_is_idempotent(self):
        room = self.room()
        unconfirmed = self.member(room, self.player)
        committed = self.member(room, self.witness, confirm=True)
        self.assertEqual(room.status, "FULL")
        self.stamp = unconfirmed.response_deadline
        self.assertGreater(seat_holds.process_seat_holds(self.db), 0)
        self.assertEqual(unconfirmed.status, "EXPIRED")
        self.assertEqual(committed.status, "APPROVED")
        self.assertIsNone(committed.response_deadline)
        self.assertEqual(room.status, "OPEN")
        self.assertEqual(seat_holds.process_seat_holds(self.db), 0)
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="SEAT_HOLD_EXPIRED").count(), 1)
        self.stamp = room.end_time
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["sample_count"], 0)
        self.assertEqual(summary["late_cancellations"], 0)
        self.assertFalse(attendance.room_state(self.db, room, self.player)["feedback_required"])

    def test_reminders_sent_once_at_four_hours_and_thirty_minutes_before_cutoff(self):
        room = self.room()
        self.member(room, self.player)
        self.member(room, self.witness, confirm=True)
        self.stamp = room.start_time - timedelta(hours=4)
        seat_holds.process_seat_holds(self.db)
        seat_holds.process_seat_holds(self.db)
        self.stamp = room.start_time - timedelta(minutes=150)
        seat_holds.process_seat_holds(self.db)
        seat_holds.process_seat_holds(self.db)
        notices = self.db.query(models.Notification).filter_by(type="seat_confirmation_reminder").all()
        self.assertEqual(len(notices), 2)
        self.assertTrue(all(n.recipient_id == self.player.id for n in notices))

    def test_waitlist_priority_offer_expiry_and_one_reservation_per_slot(self):
        room = self.room(minutes=180, capacity=2)
        self.member(room, self.player, confirm=True)
        first = self.waitlist(room, self.witness)
        second = self.waitlist(room, self.outsider)
        self.assertEqual(first.status, "WAITLISTED")
        matches.leave_match(self.db, room.id, self.player.id)
        process_auto_room_invite_for_match(self.db, room)
        self.db.commit()
        self.assertEqual(first.status, "PENDING")
        self.assertEqual(first.invite_source, "WAITLIST")
        self.assertEqual(second.status, "WAITLISTED")
        self.assertEqual(seat_holds.reserved_count(self.db, room), 2)
        process_auto_room_invite_for_match(self.db, room)
        self.assertEqual(second.status, "WAITLISTED")
        self.stamp = first.response_deadline
        process_auto_room_invite_for_match(self.db, room)
        self.db.commit()
        self.assertEqual(first.status, "EXPIRED")
        self.assertEqual(second.status, "PENDING")
        self.assertEqual(seat_holds.reserved_count(self.db, room), 2)

    def test_accepting_offer_requires_current_terms_and_commits_in_one_action(self):
        room = self.room(minutes=180, capacity=2)
        offer = self.waitlist(room, self.player)
        self.assertEqual(offer.status, "PENDING")
        with self.client(self.player) as client:
            self.assertEqual(client.post(f"/api/gamerooms/{room.id}/invite-response", json={"action": "ACCEPT"}).status_code, 422)
            stale = client.post(f"/api/gamerooms/{room.id}/invite-response", json={
                "action": "ACCEPT", "accepted_policy": True, "terms_version": "0" * 64})
            self.assertEqual(stale.status_code, 409)
            accepted = client.post(f"/api/gamerooms/{room.id}/invite-response", json={
                "action": "ACCEPT", "accepted_policy": True, "terms_version": room.terms_version})
            self.assertEqual(accepted.status_code, 200, accepted.text)
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertEqual(record.confirmation_status, "CONFIRMED")
        self.assertEqual(record.confirmed_at, self.stamp)
        self.assertIsNone(offer.response_deadline)
        self.assertEqual(room.status, "FULL")

    def test_expired_offer_cannot_be_accepted_even_without_worker(self):
        room = self.room(minutes=180, capacity=2)
        offer = self.waitlist(room, self.player)
        self.stamp = offer.response_deadline
        with self.client(self.player) as client:
            result = client.post(f"/api/gamerooms/{room.id}/invite-response", json={
                "action": "ACCEPT", "accepted_policy": True, "terms_version": room.terms_version})
            self.assertEqual(result.status_code, 409)
        self.assertEqual(offer.status, "EXPIRED")
        self.assertEqual(attendance.record_for(self.db, room, self.player.id).confirmation_status, "UNCONFIRMED")

    def test_under_thirty_minutes_requires_arrival_and_disables_auto_invitations(self):
        room = self.room(minutes=29, capacity=2)
        with self.client(self.player) as client:
            payload = {"accepted_hold_policy": True, "terms_version": room.terms_version}
            self.assertEqual(client.post(f"/api/gamerooms/{room.id}/join", json=payload).status_code, 422)
            payload["expected_arrival_at"] = (self.stamp + timedelta(minutes=10)).isoformat() + "Z"
            joined = client.post(f"/api/gamerooms/{room.id}/join", json=payload)
            self.assertEqual(joined.status_code, 200, joined.text)
        matches.update_match_participant_status(self.db, room.id, self.player.id, "APPROVED")
        self.assertEqual(process_auto_room_invite_for_match(self.db, room), 0)

    def test_existing_rooms_keep_members_without_deadlines_or_new_consent(self):
        room = self.room(enabled=False)
        participant = self.member(room, self.player)
        self.assertIsNone(participant.response_deadline)
        self.stamp = room.start_time - timedelta(minutes=1)
        seat_holds.process_seat_holds(self.db)
        self.assertEqual(participant.status, "APPROVED")

    def test_cancelled_room_stops_reminders_and_expiry(self):
        room = self.room()
        p = self.member(room, self.player)
        attendance.cancel_room(self.db, room, self.host.id)
        self.db.commit()
        self.stamp = p.response_deadline
        self.assertEqual(seat_holds.process_seat_holds(self.db), 0)
        self.assertEqual(p.status, "APPROVED")

    def test_nonpremium_host_cannot_enable_automation(self):
        room = self.room(enabled=False)
        self.host.premium_until = None
        self.db.commit()
        with self.client(self.host) as client:
            payload = schemas.MatchCreate(title="Không Premium", sport_id=self.sport.id, price_info="50",
                required_level="Beginner", start_time=room.start_time, end_time=room.end_time,
                max_players=2, seat_holds_enabled=True).model_dump(mode="json")
            self.assertEqual(client.post("/api/gamerooms", json=payload).status_code, 403)

    def test_host_cannot_approve_another_player_into_a_reserved_offer(self):
        room = self.room(minutes=180, capacity=2)
        matches.join_match(self.db, room.id, self.witness.id, accepted_hold_policy=True)
        offered = self.waitlist(room, self.player)
        self.assertEqual(offered.status, "PENDING")
        with self.assertRaises(HTTPException) as raised:
            matches.update_match_participant_status(self.db, room.id, self.witness.id, "APPROVED")
        self.assertEqual(raised.exception.status_code, 409)
        self.db.rollback()
        self.assertEqual(seat_holds.reserved_count(self.db, room), 2)

    def test_delayed_approval_requires_updated_arrival_then_starts_five_minute_hold(self):
        room = self.room(minutes=60)
        with self.client(self.player) as client:
            payload = {"accepted_hold_policy": True, "terms_version": room.terms_version}
            self.assertEqual(client.post(f"/api/gamerooms/{room.id}/join", json=payload).status_code, 200)
        self.stamp = room.start_time - timedelta(minutes=20)
        with self.client(self.host) as client:
            self.assertEqual(client.patch(f"/api/gamerooms/{room.id}/participants/{self.player.id}/status",
                                          json={"status": "APPROVED"}).status_code, 409)
        with self.client(self.player) as client:
            payload["expected_arrival_at"] = (self.stamp + timedelta(minutes=10)).isoformat() + "Z"
            self.assertEqual(client.post(f"/api/gamerooms/{room.id}/join", json=payload).status_code, 200)
        with self.client(self.host) as client:
            approved = client.patch(f"/api/gamerooms/{room.id}/participants/{self.player.id}/status", json={"status": "APPROVED"})
            self.assertEqual(approved.status_code, 200, approved.text)
            self.assertEqual(approved.json()["response_deadline"], (self.stamp + timedelta(minutes=5)).isoformat())

    def test_changed_schedule_invalidates_commitment_and_discloses_new_deadline(self):
        room = self.room()
        participant = self.member(room, self.player, confirm=True)
        previous_version = room.terms_version
        changed = schemas.MatchCreate(title=room.title, sport_id=room.sport_id, price_info=room.price_info,
            required_level=room.required_level, location=room.location, max_players=room.max_players,
            start_time=room.start_time + timedelta(hours=1), end_time=room.end_time + timedelta(hours=1),
            seat_holds_enabled=True)
        matches.update_match(self.db, room.id, changed)
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertEqual(record.confirmation_status, "UNCONFIRMED")
        self.assertIsNone(record.confirmed_at)
        self.assertEqual(participant.response_deadline, room.start_time - timedelta(hours=2))
        with self.assertRaises(HTTPException):
            attendance.confirm(self.db, room, self.player, previous_version)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["sample_count"], 0)

    def test_shortage_notification_is_committed_and_not_repeated(self):
        room = self.room(minutes=180, capacity=2)
        self.assertEqual(process_auto_room_invites(self.db), 1)
        with self.factory() as fresh:
            self.assertEqual(fresh.query(models.Notification).filter_by(type="gameroom_needs_players").count(), 1)
        self.assertEqual(process_auto_room_invites(self.db), 0)
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(match_id=room.id, event_type="ROOM_NEEDS_PLAYERS").count(), 1)

    def test_late_joiners_do_not_receive_reminders_from_before_approval(self):
        room = self.room()
        self.stamp = room.start_time - timedelta(hours=3)
        self.member(room, self.player)
        seat_holds.process_seat_holds(self.db)
        self.assertEqual(self.db.query(models.Notification).filter_by(type="seat_confirmation_reminder").count(), 0)
        self.stamp = room.start_time - timedelta(minutes=150)
        seat_holds.process_seat_holds(self.db)
        self.assertEqual(self.db.query(models.Notification).filter_by(type="seat_confirmation_reminder").count(), 1)


if __name__ == "__main__":
    unittest.main()
