"""Isolated SQLite tests: never load or mutate the configured application database."""
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

os.environ["TRANSACTION_DATABASE_URL"] = "sqlite:///" + os.path.join(tempfile.gettempdir(), "sportgo-test-import-only.db")

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event as sql_event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import attendance, auth_utils, database, models, schemas
from app.cache import memory_cache
from app.crud import matches
from app.routers import auth, gamerooms
from app.routers import attendance as routes


class AttendanceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        @sql_event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
        models.Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine, autoflush=False)
        self.db = self.factory()
        self.stamp = datetime.now(timezone.utc).replace(tzinfo=None)
        self.clock = patch("app.attendance.now", side_effect=lambda: self.stamp)
        self.clock.start()
        self.host, self.player, self.witness, self.admin, self.outsider = [
            models.User(email=f"u{i}@gmail.com", password_hash="unused", status="active", is_admin=i == 4)
            for i in range(1, 6)
        ]
        self.db.add_all([self.host, self.player, self.witness, self.admin, self.outsider])
        self.sport = models.Sport(name="Badminton")
        self.db.add(self.sport)
        self.db.commit()
        memory_cache.clear()

    def tearDown(self):
        self.clock.stop()
        self.db.close()
        self.engine.dispose()

    def room(self, capacity=4):
        return matches.create_match(self.db, self.host.id, schemas.MatchCreate(
            title="Buổi cầu lông", sport_id=self.sport.id, price_info="50", required_level="Beginner",
            start_time=self.stamp + timedelta(minutes=20), end_time=self.stamp + timedelta(minutes=80),
            max_players=capacity, location="Quận 1",
        ))

    def approve(self, room, user):
        matches.join_match(self.db, room.id, user.id)
        matches.update_match_participant_status(self.db, room.id, user.id, "APPROVED")

    def confirm(self, room, user):
        result = attendance.confirm(self.db, attendance.lock_room(self.db, room.id), user)
        self.db.commit()
        return result

    def checkin(self, room, users):
        self.confirm(room, self.host)
        self.stamp = max(self.stamp, room.start_time)  # Check-in opens at the start time.
        code = attendance.open_checkin(self.db, room, self.host)["code"]
        self.db.commit()
        for user in users:
            self.confirm(room, user)
            attendance.check_in(self.db, room, user, code)
            self.db.commit()
        return code

    def finish(self, room):
        self.stamp = room.end_time + timedelta(minutes=1)

    def report(self, room, user, occurred=True, attended=True):
        attendance.report_self(self.db, room, user, occurred, attended)
        self.db.commit()

    def verified_room(self):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        self.checkin(room, [self.player, self.witness])
        self.finish(room)
        for user in (self.host, self.player, self.witness):
            attendance.report_host(self.db, room, self.host, user.id, "ATTENDED")
            self.report(room, user)
        for voter in (self.host, self.player, self.witness):
            for subject in (self.host, self.player, self.witness):
                if voter.id != subject.id:
                    attendance.report_peer(self.db, room, voter, subject.id, True)
        self.db.commit()
        return room

    def peer(self, room, voter, subject, attended=True, *, report=None):
        attendance.report_peer(self.db, room, voter, subject.id, attended, report=report)
        self.db.commit()

    def test_pending_requests_expire_at_end_including_previously_closed_rooms_without_penalties(self):
        room = self.room()
        matches.join_match(self.db, room.id, self.player.id)
        self.stamp = room.end_time - timedelta(microseconds=1)
        matches.close_expired_matches(self.db)
        participant = self.db.query(models.MatchParticipant).filter_by(match_id=room.id, user_id=self.player.id).one()
        self.assertEqual(participant.status, "PENDING")
        room.status = "CLOSED"  # Repair old rooms that had closed while applications stayed pending.
        self.db.commit()
        self.stamp = room.end_time
        self.assertTrue(matches.close_expired_matches(self.db))
        self.assertEqual(participant.status, "EXPIRED")
        self.assertFalse(matches.close_expired_matches(self.db))
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="JOIN_REQUEST_EXPIRED").count(), 1)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["mine"]["membership_status"], "EXPIRED")
        self.assertFalse(state["feedback_required"])
        self.assertEqual(attendance.required_feedback(self.db, self.player.id)["pending_count"], 0)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["sample_count"], 0)
        self.assertEqual(summary["late_cancellations"], 0)
        with self.assertRaises(HTTPException):
            matches.update_match_participant_status(self.db, room.id, self.player.id, "APPROVED")

    def test_required_feedback_starts_at_end_for_approved_members_even_without_consent_or_checkin(self):
        room = self.room()
        self.approve(room, self.player)
        before = attendance.required_feedback(self.db, self.player.id)
        self.assertEqual(before["pending_count"], 0)
        self.assertEqual(before["next_end_time"], room.end_time)
        self.stamp = room.end_time
        for user in (self.host, self.player):
            task = attendance.required_feedback(self.db, user.id)
            self.assertEqual(task["pending_count"], 1)
            self.assertEqual(task["room"]["match_id"], room.id)
            self.assertTrue(attendance.room_state(self.db, room, user)["feedback_required"])
        self.assertEqual(attendance.required_feedback(self.db, self.outsider.id)["pending_count"], 0)

    def test_required_feedback_orders_all_unanswered_rooms_and_preserves_next_deadline(self):
        rooms = [self.room() for _ in range(3)]
        for room in rooms:
            self.approve(room, self.player)
        self.finish(rooms[-1])
        upcoming = self.room()
        self.approve(upcoming, self.player)
        for index, room in enumerate(rooms):
            task = attendance.required_feedback(self.db, self.player.id)
            self.assertEqual(task["pending_count"], len(rooms) - index)
            self.assertEqual(task["room"]["match_id"], room.id)
            self.assertEqual(task["next_end_time"], upcoming.end_time)
            self.report(room, self.player, occurred=False, attended=False)
        task = attendance.required_feedback(self.db, self.player.id)
        self.assertEqual(task["pending_count"], 0)
        self.assertIsNone(task["room"])
        self.assertEqual(task["next_end_time"], upcoming.end_time)

    def test_feedback_gate_does_not_wait_for_peer_confirmation_or_conflict_resolution(self):
        room = self.reported_absence()
        self.assertEqual(attendance.required_feedback(self.db, self.player.id)["pending_count"], 1)
        self.report(room, self.player)
        state = attendance.room_state(self.db, room, self.player)
        self.assertTrue(state["mine"]["disputed"])
        self.assertEqual(state["mine"]["outcome"], "UNVERIFIED")
        self.assertFalse(state["feedback_required"])
        self.assertEqual(attendance.required_feedback(self.db, self.player.id)["pending_count"], 0)
        self.db.expire_all()
        self.assertEqual(attendance.required_feedback(self.db, self.player.id)["pending_count"], 0)

    def test_cancelled_removed_and_pending_memberships_do_not_require_feedback(self):
        cancelled = self.room()
        self.approve(cancelled, self.player)
        cancelled.status = "CANCELLED"
        pending = self.room()
        matches.join_match(self.db, pending.id, self.player.id)
        removed = self.room()
        self.approve(removed, self.player)
        matches.update_match_participant_status(self.db, removed.id, self.player.id, "REJECTED")
        self.finish(removed)
        self.db.commit()
        self.assertEqual(attendance.required_feedback(self.db, self.player.id)["pending_count"], 0)
        self.assertIsNone(attendance.required_feedback(self.db, self.player.id)["next_end_time"])
        for room in (cancelled, pending, removed):
            self.assertFalse(attendance.room_state(self.db, room, self.player)["feedback_required"])

    def test_solo_host_can_satisfy_required_feedback_without_peer_votes(self):
        room = self.room()
        self.finish(room)
        self.assertTrue(attendance.room_state(self.db, room, self.host)["feedback_required"])
        self.report(room, self.host, occurred=False, attended=False)
        self.assertFalse(attendance.room_state(self.db, room, self.host)["feedback_required"])
        self.assertEqual(attendance.required_feedback(self.db, self.host.id)["pending_count"], 0)

    def test_required_feedback_http_scopes_tasks_to_the_current_user_and_expires_pending_requests(self):
        room = self.room()
        self.approve(room, self.player)
        matches.join_match(self.db, room.id, self.witness.id)
        self.finish(room)
        app = FastAPI()
        app.include_router(routes.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        identity = {"user": self.player}
        app.dependency_overrides[auth_utils.get_current_user] = lambda: identity["user"]
        with TestClient(app) as client:
            path = "/api/gamerooms/required-feedback"
            response = client.get(path)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["pending_count"], 1)
            self.assertEqual(response.json()["room"]["match_id"], room.id)
            response = client.put(f"/api/gamerooms/{room.id}/attendance/report", json={"occurred": True, "attended": False})
            self.assertEqual(response.status_code, 200)
            self.assertFalse(response.json()["feedback_required"])
            self.assertEqual(client.get(path).json()["pending_count"], 0)
            identity["user"] = self.witness
            self.assertEqual(client.get(path).json()["pending_count"], 0)
            state = client.get(f"/api/gamerooms/{room.id}/attendance").json()
            self.assertEqual(state["mine"]["membership_status"], "EXPIRED")
            identity["user"] = self.admin
            self.assertEqual(client.get(path).status_code, 403)

    def test_peer_can_report_absence_without_the_subject_reporting_or_committing(self):
        room = self.reported_absence(confirmed=False, report_absent=False)
        self.peer(room, self.witness, self.player, report="ABSENT")
        state = attendance.room_state(self.db, room, self.witness)
        person = next(p for p in state["participants"] if p["user_id"] == self.player.id)
        self.assertEqual(person["my_peer_report"], "ABSENT")
        self.assertFalse(person["my_peer_confirmation"])
        self.assertEqual([p["user_id"] for p in person["peer_absences"]], [self.witness.id])
        self.assertEqual(person["peer_confirmations"], [])
        self.assertFalse(person["disputed"])
        self.assertFalse(person["can_receive_peer_confirmation"])
        self.assertTrue(person["can_receive_peer_absence"])
        self.peer(room, self.host, self.player, report="ABSENT")
        self.assertEqual(len(attendance.room_state(self.db, room, self.player)["mine"]["peer_absences"]), 2)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)
        attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)

    def test_peer_absence_keeps_host_commitment_and_verified_session_requirements(self):
        room = self.reported_absence(report_absent=False)
        self.peer(room, self.witness, self.player, report="ABSENT")
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "UNVERIFIED")
        self.report(room, self.player, attended=False)
        attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        state = attendance.room_state(self.db, room, self.player)["mine"]
        self.assertEqual(state["outcome"], "NO_SHOW")
        self.assertFalse(state["disputed"])
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 1)
        self.report(room, self.host, occurred=False, attended=False)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)

    def test_peer_absence_replaces_presence_and_withdrawal_restores_verified_attendance(self):
        room = self.verified_room()
        self.peer(room, self.witness, self.player, report="ABSENT")
        before = self.db.query(models.MatchTrustEvent).count()
        self.peer(room, self.witness, self.player, report="ABSENT")
        self.assertEqual(self.db.query(models.MatchTrustEvent).count(), before)
        person = attendance.room_state(self.db, room, self.player)["mine"]
        self.assertTrue(person["disputed"])
        self.assertEqual(person["outcome"], "UNVERIFIED")
        self.assertEqual(len(person["peer_confirmations"]), 1)
        self.assertEqual(len(person["peer_absences"]), 1)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["sample_count"], 0)
        self.assertEqual(summary["eligible_commitments"], 0)
        self.assertEqual(summary["no_shows"], 0)
        self.peer(room, self.witness, self.player, report="WITHDRAWN")
        person = attendance.room_state(self.db, room, self.player)["mine"]
        self.assertFalse(person["disputed"])
        self.assertEqual(person["peer_absences"], [])
        self.peer(room, self.witness, self.player, report="ATTENDED")
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "ATTENDED")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["verified_attended"], 1)

    def test_peer_presence_contradicting_host_absence_freezes_no_show(self):
        room = self.reported_absence()
        self.peer(room, self.witness, self.player, report="ATTENDED")
        person = attendance.room_state(self.db, room, self.player)["mine"]
        self.assertTrue(person["disputed"])
        self.assertEqual(person["outcome"], "UNVERIFIED")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)
        self.peer(room, self.witness, self.player, report="WITHDRAWN")
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "NO_SHOW")

    def test_legacy_false_peer_vote_remains_a_withdrawal(self):
        room = self.verified_room()
        self.peer(room, self.witness, self.player, False)
        vote = self.db.query(models.MatchTrustEvent).filter_by(event_type="PEER_REPORTED").order_by(models.MatchTrustEvent.id.desc()).first()
        vote.details = {key: value for key, value in vote.details.items() if key != "report"}
        self.db.commit()
        person = next(p for p in attendance.room_state(self.db, room, self.witness)["participants"] if p["user_id"] == self.player.id)
        self.assertEqual(person["my_peer_report"], "WITHDRAWN")
        self.assertEqual(person["peer_absences"], [])
        self.assertFalse(person["disputed"])

    def test_peer_can_withdraw_even_when_their_own_host_report_conflicts(self):
        room = self.verified_room()
        self.peer(room, self.witness, self.player, report="ABSENT")
        attendance.report_host(self.db, room, self.host, self.witness.id, "ABSENT")
        self.db.commit()
        self.assertFalse(attendance.room_state(self.db, room, self.witness)["can_peer_confirm"])
        self.peer(room, self.witness, self.player, report="WITHDRAWN")
        attendance.report_host(self.db, room, self.host, self.witness.id, "ATTENDED")
        self.db.commit()
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["peer_absences"], [])

    def test_peer_absence_requires_active_membership_and_present_witness_after_end(self):
        room = self.room()
        self.approve(room, self.player)
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.player, report="ABSENT")
        self.finish(room)
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.player, report="ABSENT")
        self.report(room, self.host)
        with self.assertRaises(HTTPException):
            self.peer(room, self.outsider, self.player, report="ABSENT")
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.host, report="ABSENT")
        self.peer(room, self.host, self.player, report="ABSENT")
        room.status = "CANCELLED"
        self.db.commit()
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.player, report="ABSENT")

    def test_low_attendance_starts_at_grace_boundary_and_counts_only_approved_members(self):
        room = self.room()
        matches.join_match(self.db, room.id, self.player.id)
        self.stamp = room.start_time + timedelta(minutes=15) - timedelta(seconds=1)
        self.assertFalse(attendance.room_state(self.db, room, self.host)["low_attendance"]["needs_decision"])
        self.stamp += timedelta(seconds=1)
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertTrue(state["needs_decision"])
        self.assertEqual(state["approved_count"], 1)
        self.assertEqual(state["present_count"], 0)
        self.assertTrue(state["can_continue"])
        self.assertTrue(state["can_cancel"])

    def test_low_attendance_continue_persists_without_duplicate_events_or_blocking_late_checkin(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        self.confirm(room, self.host)
        self.stamp = room.start_time + timedelta(minutes=15)
        for _ in range(2):
            attendance.decide_low_attendance(self.db, attendance.lock_room(self.db, room.id), self.host, "CONTINUE")
            self.db.commit()
        self.db.expire_all()
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="LOW_ATTENDANCE_CONTINUED").count(), 1)
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertTrue(state["continued"])
        self.assertFalse(state["needs_decision"])
        self.assertEqual(room.status, "OPEN")
        self.checkin(room, [self.player])
        self.assertEqual(attendance.room_state(self.db, room, self.host)["low_attendance"]["present_count"], 2)

    def test_low_attendance_cancel_preserves_history_notifies_once_and_has_no_reputation_penalty(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        self.stamp = room.start_time + timedelta(minutes=15)
        for _ in range(2):
            attendance.decide_low_attendance(self.db, room, self.host, "CANCEL")
            self.db.commit()
        self.assertEqual(room.status, "CANCELLED")
        self.assertEqual(room.trust_session.verification_status, "CANCELLED")
        self.assertTrue(attendance.room_state(self.db, room, self.host)["low_attendance"]["cancelled_for_low_attendance"])
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="ROOM_CANCELLED").count(), 1)
        self.assertEqual(self.db.query(models.Notification).filter_by(type="gameroom_cancelled_low_attendance").count(), 1)
        self.assertEqual(self.db.query(models.MatchParticipant).filter_by(match_id=room.id).count(), 2)
        self.finish(room)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["no_shows"], 0)
        self.assertEqual(summary["sample_count"], 0)
        self.assertIsNone(summary["score"])
        self.assertEqual(summary["late_cancellations"], 0)

    def test_short_solo_room_can_be_closed_for_low_attendance_at_its_end(self):
        room = self.room()
        room.end_time = room.start_time + timedelta(minutes=10)
        self.db.commit()
        self.stamp = room.end_time
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertEqual(state["decision_at"], room.end_time)
        self.assertTrue(state["needs_decision"])
        self.assertFalse(state["can_continue"])
        matches.close_expired_matches(self.db)
        self.db.expire_all()
        self.assertEqual(room.status, "CLOSED")
        attendance.decide_low_attendance(self.db, room, self.host, "CANCEL")
        self.db.commit()
        self.assertEqual(room.status, "CANCELLED")
        self.assertEqual(attendance.room_state(self.db, room, self.host)["mine"]["outcome"], "UNVERIFIED")

    def test_low_attendance_continuation_does_not_hide_unresolved_room_after_its_end(self):
        room = self.room()
        self.stamp = room.start_time + timedelta(minutes=15)
        attendance.decide_low_attendance(self.db, room, self.host, "CONTINUE")
        self.db.commit()
        self.finish(room)
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertTrue(state["needs_decision"])
        self.assertFalse(state["can_continue"])
        self.assertTrue(state["can_cancel"])

    def test_low_attendance_does_not_treat_missing_checkin_as_proof_the_session_failed(self):
        room = self.room()
        self.approve(room, self.player)
        self.finish(room)
        self.report(room, self.host)
        self.report(room, self.player)
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertEqual(state["checked_in_count"], 0)
        self.assertEqual(state["present_count"], 2)
        self.assertFalse(state["needs_decision"])
        with self.assertRaises(HTTPException):
            attendance.decide_low_attendance(self.db, room, self.host, "CANCEL")

    def test_low_attendance_does_not_double_count_checkin_and_self_report(self):
        room = self.room()
        self.checkin(room, [])
        self.finish(room)
        self.report(room, self.host)
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertEqual(state["checked_in_count"], 1)
        self.assertEqual(state["present_count"], 1)

    def test_low_attendance_cannot_cancel_verified_or_disputed_results(self):
        room = self.verified_room()
        self.assertFalse(attendance.room_state(self.db, room, self.host)["low_attendance"]["needs_decision"])
        with self.assertRaises(HTTPException):
            attendance.decide_low_attendance(self.db, room, self.host, "CANCEL")
        self.report(room, self.player, occurred=False, attended=False)
        self.assertEqual(room.trust_session.verification_status, "DISPUTED")
        with self.assertRaises(HTTPException):
            attendance.decide_low_attendance(self.db, room, self.host, "CANCEL")

    def test_low_attendance_policy_is_snapshotted_and_supports_old_rooms(self):
        with patch.dict(os.environ, {"ATTENDANCE_LOW_GRACE_MINUTES": "25"}):
            room = self.room()
        self.stamp = room.start_time + timedelta(minutes=15)
        with patch.dict(os.environ, {"ATTENDANCE_LOW_GRACE_MINUTES": "1"}):
            state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertFalse(state["needs_decision"])
        self.assertEqual(state["grace_minutes"], 25)
        room.trust_session.policy = {key: value for key, value in room.trust_session.policy.items()
                                    if key not in ("low_attendance_grace_minutes", "minimum_players")}
        self.db.commit()
        self.assertTrue(attendance.room_state(self.db, room, self.host)["low_attendance"]["needs_decision"])

    def test_low_attendance_continuation_does_not_apply_to_changed_schedule(self):
        room = self.room()
        self.stamp = room.start_time + timedelta(minutes=15)
        attendance.decide_low_attendance(self.db, room, self.host, "CONTINUE")
        self.db.commit()
        room.start_time += timedelta(minutes=30)
        room.end_time += timedelta(minutes=30)
        self.db.commit()
        self.stamp = room.start_time + timedelta(minutes=15)
        state = attendance.room_state(self.db, room, self.host)["low_attendance"]
        self.assertFalse(state["continued"])
        self.assertTrue(state["needs_decision"])

    def test_low_attendance_http_permissions_boundary_and_validation(self):
        room = self.room()
        self.approve(room, self.player)
        app = FastAPI()
        app.include_router(routes.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        identity = {"user": self.host}
        app.dependency_overrides[auth_utils.get_current_user] = lambda: identity["user"]
        path = f"/api/gamerooms/{room.id}/attendance/low-attendance"
        with TestClient(app) as client:
            self.assertEqual(client.post(path, json={"action": "CANCEL"}).status_code, 409)
            self.stamp = room.start_time + timedelta(minutes=15)
            for person in (self.player, self.outsider, self.admin):
                identity["user"] = person
                self.assertEqual(client.post(path, json={"action": "CANCEL"}).status_code, 403)
            player_state = attendance.room_state(self.db, room, self.player)["low_attendance"]
            self.assertFalse(player_state["can_cancel"])
            self.assertFalse(player_state["can_continue"])
            identity["user"] = self.host
            self.assertEqual(client.post(path, json={"action": "INVALID"}).status_code, 422)
            response = client.post(path, json={"action": "CANCEL"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "CANCELLED")

    def test_cross_confirmation_requires_two_distinct_people_and_cannot_include_self(self):
        room = self.room()
        for user in (self.player, self.witness):
            self.approve(room, user)
        self.checkin(room, [self.player, self.witness])
        self.finish(room)
        for user in (self.host, self.player, self.witness):
            self.report(room, user)
        self.peer(room, self.host, self.player)
        before = self.db.query(models.MatchTrustEvent).filter_by(event_type="PEER_REPORTED").count()
        self.peer(room, self.host, self.player)
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="PEER_REPORTED").count(), before)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["mine"]["outcome"], "UNVERIFIED")
        self.assertEqual(len(state["mine"]["peer_confirmations"]), 1)
        self.assertEqual(state["mine"]["required_peer_confirmations"], 2)
        with self.assertRaises(HTTPException) as error:
            self.peer(room, self.player, self.player)
        self.assertEqual(error.exception.status_code, 422)
        self.peer(room, self.witness, self.player)
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "ATTENDED")
        self.peer(room, self.witness, self.player, False)
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "UNVERIFIED")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["reviewed_no_shows"], 0)

    def test_two_people_use_one_peer_even_when_room_capacity_is_four(self):
        room = self.room(capacity=4)
        self.approve(room, self.player)
        self.checkin(room, [self.player])
        self.finish(room)
        self.report(room, self.host)
        self.report(room, self.player)
        self.peer(room, self.player, self.host)
        self.peer(room, self.host, self.player)
        for user in (self.host, self.player):
            state = attendance.room_state(self.db, room, user)
            self.assertEqual(state["mine"]["required_peer_confirmations"], 1)
            self.assertEqual(state["mine"]["outcome"], "ATTENDED")

    def test_cross_confirmation_checks_time_membership_and_self_report(self):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        self.checkin(room, [self.player])
        self.confirm(room, self.witness)
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.player)
        self.finish(room)
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.player)
        self.report(room, self.host)
        self.report(room, self.witness)
        self.peer(room, self.witness, self.player)
        with self.assertRaises(HTTPException):
            self.peer(room, self.outsider, self.player)
        self.peer(room, self.host, self.player)
        self.assertEqual(len(attendance.room_state(self.db, room, self.player)["mine"]["peer_confirmations"]), 2)
        with self.assertRaises(HTTPException):
            matches.update_match_participant_status(self.db, room.id, self.witness.id, "REJECTED")
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["required_peer_confirmations"], 2)

    def test_unconfirmed_attendee_can_be_cross_verified_without_backdating_commitment_or_checkin(self):
        room = self.room()
        for user in (self.player, self.witness):
            self.approve(room, user)
        self.checkin(room, [self.witness])
        self.finish(room)
        for user in (self.host, self.witness):
            self.report(room, user)
        with self.assertRaises(HTTPException):
            self.peer(room, self.host, self.player)
        self.report(room, self.player)
        self.peer(room, self.host, self.player)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["mine"]["outcome"], "UNVERIFIED")
        self.assertTrue(state["mine"]["supplemental_attendance"])
        self.assertTrue(state["can_peer_confirm"])
        self.peer(room, self.witness, self.player)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["mine"]["outcome"], "ATTENDED")
        self.assertEqual(state["mine"]["confirmation_status"], "UNCONFIRMED")
        self.assertIsNone(state["mine"]["confirmed_at"])
        self.assertIsNone(state["mine"]["checked_in_at"])
        self.assertFalse(state["mine"]["has_commitment"])
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["verified_attended"], 1)
        self.assertEqual(summary["eligible_commitments"], 0)
        self.assertIsNone(summary["verified_attendance_rate"])
        self.assertEqual(summary["reviewed_no_shows"], 0)

        self.verified_room()
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["verified_attended"], 2)
        self.assertEqual(summary["eligible_commitments"], 1)
        self.assertEqual(summary["verified_committed_attendance"], 1)
        self.assertEqual(summary["supplemental_attended"], 1)
        self.assertEqual(summary["verified_attendance_rate"], 100)

        attendance.invalidate_commitments(self.db, room, self.host.id)
        self.db.commit()
        state = attendance.room_state(self.db, room, self.player)
        self.assertIsNone(state["mine"]["self_attended"])
        self.assertEqual(state["mine"]["peer_confirmations"], [])

    def test_confirmed_attendee_who_forgot_code_is_verified_by_peers_without_inventing_checkin(self):
        room = self.room()
        for user in (self.player, self.witness):
            self.approve(room, user)
        self.confirm(room, self.player)
        self.checkin(room, [self.witness])
        self.finish(room)
        for user in (self.host, self.player, self.witness):
            self.report(room, user)
        self.peer(room, self.host, self.player)
        self.peer(room, self.witness, self.player)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["mine"]["outcome"], "ATTENDED")
        self.assertTrue(state["mine"]["has_commitment"])
        self.assertIsNone(state["mine"]["checked_in_at"])
        self.assertTrue(state["mine"]["supplemental_attendance"])

    def test_two_people_can_supplement_when_both_forgot_all_steps_and_withdrawing_vote_reopens_verification(self):
        room = self.room()
        self.approve(room, self.player)
        self.finish(room)
        self.report(room, self.host)
        self.report(room, self.player)
        self.assertEqual(room.trust_session.verification_status, "UNVERIFIED")
        self.peer(room, self.host, self.player)
        self.peer(room, self.player, self.host)
        for user in (self.host, self.player):
            state = attendance.room_state(self.db, room, user)
            self.assertEqual(state["verification_status"], "OCCURRED")
            self.assertEqual(state["mine"]["outcome"], "ATTENDED")
            self.assertIsNone(state["mine"]["confirmed_at"])
            self.assertIsNone(state["mine"]["checked_in_at"])
            self.assertEqual(state["mine"]["required_peer_confirmations"], 1)
        self.peer(room, self.player, self.host, False)
        self.assertEqual(attendance.room_state(self.db, room, self.host)["verification_status"], "UNVERIFIED")
        self.assertEqual(attendance.reputations(self.db, [self.host.id])[self.host.id]["reviewed_no_shows"], 0)

    def test_supplemental_reports_do_not_make_uncommitted_people_eligible_for_no_show_penalties(self):
        room = self.room()
        self.approve(room, self.player)
        self.finish(room)
        self.report(room, self.player, occurred=True, attended=False)
        self.assertFalse(attendance.room_state(self.db, room, self.player)["can_peer_confirm"])
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["reviewed_no_shows"], 0)

    def test_peer_evidence_is_not_limited_to_the_visible_history_and_changes_invalidate_votes(self):
        room = self.verified_room()
        for _ in range(60):
            attendance.event(self.db, room, self.host.id, "CHECKIN_OPENED", self.host.id)
        self.db.commit()
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "ATTENDED")
        self.stamp += timedelta(seconds=1)
        self.report(room, self.witness, occurred=True, attended=False)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(len(state["mine"]["peer_confirmations"]), 1)
        self.assertEqual(state["mine"]["outcome"], "UNVERIFIED")
        attendance.invalidate_commitments(self.db, room, self.host.id)
        self.db.commit()
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["peer_confirmations"], [])

    def test_erasing_a_witness_does_not_turn_a_three_person_room_into_the_one_vote_exception(self):
        room = self.verified_room()
        with patch("app.routers.auth._delete_user_media"):
            auth._delete_user_data(self.db, self.witness.id)
            self.db.commit()
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["mine"]["required_peer_confirmations"], 2)
        self.assertEqual(len(state["mine"]["peer_confirmations"]), 1)
        self.assertEqual(state["mine"]["outcome"], "UNVERIFIED")

    def test_cross_confirmation_http_permissions_and_validation(self):
        room = self.room()
        self.approve(room, self.player)
        self.checkin(room, [self.player])
        self.finish(room)
        self.report(room, self.host)
        self.report(room, self.player)
        app = FastAPI()
        app.include_router(routes.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        identity = {"user": self.host}
        app.dependency_overrides[auth_utils.get_current_user] = lambda: identity["user"]
        path = f"/api/gamerooms/{room.id}/attendance/peers/{self.player.id}"
        with TestClient(app) as client:
            self.assertEqual(client.put(path, json={}).status_code, 422)
            self.assertEqual(client.put(path, json={"report": "INVALID"}).status_code, 422)
            self.assertEqual(client.put(path, json={"report": "ABSENT", "attended": False}).status_code, 422)
            response = client.put(path, json={"attended": True})
            self.assertEqual(response.status_code, 200)
            person = next(p for p in response.json()["participants"] if p["user_id"] == self.player.id)
            self.assertEqual(person["outcome"], "ATTENDED")
            self.assertEqual(len(person["peer_confirmations"]), 1)
            response = client.put(path, json={"report": "ABSENT"})
            self.assertEqual(response.status_code, 200)
            person = next(p for p in response.json()["participants"] if p["user_id"] == self.player.id)
            self.assertEqual(person["my_peer_report"], "ABSENT")
            self.assertTrue(person["disputed"])
            self.assertEqual(len(person["peer_absences"]), 1)
            self.assertEqual(person["peer_confirmations"], [])
            response = client.put(path, json={"report": "WITHDRAWN"})
            person = next(p for p in response.json()["participants"] if p["user_id"] == self.player.id)
            self.assertEqual(person["peer_absences"], [])
            self.assertFalse(person["disputed"])
            identity["user"] = self.player
            self.assertEqual(client.put(path, json={"attended": True}).status_code, 422)
            self.assertEqual(client.put(path, json={"report": "ABSENT"}).status_code, 422)
            identity["user"] = self.outsider
            self.assertEqual(client.put(path, json={"attended": True}).status_code, 403)
            self.assertEqual(client.put(path, json={"report": "ABSENT"}).status_code, 403)
            identity["user"] = self.admin
            self.assertEqual(client.put(path, json={"attended": True}).status_code, 403)
            self.assertEqual(client.put(path, json={"report": "ABSENT"}).status_code, 403)

    def test_host_alone_and_expiry_do_not_prove_occurrence(self):
        room = self.room()
        self.checkin(room, [])
        self.finish(room)
        self.report(room, self.host)
        self.assertEqual(room.trust_session.verification_status, "UNVERIFIED")
        self.assertEqual(attendance.reputations(self.db, [self.host.id])[self.host.id]["verified_attended"], 0)

    def test_verified_attendance_is_not_double_counted_and_newcomers_have_no_score(self):
        room = self.verified_room()
        count = self.db.query(models.MatchTrustEvent).count()
        self.report(room, self.player)
        self.assertEqual(self.db.query(models.MatchTrustEvent).count(), count)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["verified_attended"], 1)
        self.assertEqual(summary["sample_count"], 1)
        self.assertIsNone(summary["score"])
        self.assertEqual(room.trust_session.verification_status, "OCCURRED")

    def test_checkin_is_idempotent_private_and_expires(self):
        room = self.room()
        self.approve(room, self.player)
        code = self.checkin(room, [self.player])
        stamp = attendance.record_for(self.db, room, self.player.id).checked_in_at
        attendance.check_in(self.db, room, self.player, code)
        self.assertEqual(attendance.record_for(self.db, room, self.player.id).checked_in_at, stamp)
        state = attendance.room_state(self.db, room, self.player)
        # Once the game has started players see who is playing, so they can confirm each other.
        self.assertEqual({person["user_id"] for person in state["participants"]}, {self.host.id, self.player.id})
        self.assertNotIn(code, str(state))
        self.assertNotIn("code_hash", state)
        self.approve(room, self.witness)
        self.confirm(room, self.witness)
        self.stamp += timedelta(seconds=60)
        with self.assertRaises(HTTPException) as error:
            attendance.check_in(self.db, room, self.witness, code)
        self.assertEqual(error.exception.status_code, 409)

    def test_checkin_rotates_to_a_different_code_after_sixty_seconds_for_old_rooms(self):
        room = self.room()
        session = attendance.session_for(self.db, room)
        session.policy = {**session.policy, "code_ttl_minutes": 10}
        self.approve(room, self.player)
        self.approve(room, self.witness)
        state = attendance.room_state(self.db, room, self.player)
        self.assertEqual(state["policy"]["code_ttl_minutes"], 1)
        attendance.confirm(self.db, room, self.player, state["terms_version"])
        self.confirm(room, self.witness)
        self.confirm(room, self.host)
        self.stamp = room.start_time
        opened_at = self.stamp
        with patch("app.attendance.secrets.randbelow", side_effect=[123456, 123456, 654321]):
            first = attendance.open_checkin(self.db, room, self.host)
            self.assertEqual(first["expires_at"], opened_at + timedelta(seconds=60))
            self.stamp += timedelta(seconds=59)
            attendance.check_in(self.db, room, self.witness, first["code"])
            self.stamp += timedelta(seconds=1)
            with self.assertRaises(HTTPException) as error:
                attendance.check_in(self.db, room, self.player, first["code"])
            self.assertEqual(error.exception.status_code, 409)
            second = attendance.open_checkin(self.db, room, self.host)
        self.assertNotEqual(first["code"], second["code"])
        self.assertEqual(second["expires_at"], self.stamp + timedelta(seconds=60))
        with self.assertRaises(HTTPException) as error:
            attendance.check_in(self.db, room, self.player, first["code"])
        self.assertEqual(error.exception.status_code, 400)
        attendance.check_in(self.db, room, self.player, second["code"])
        self.assertEqual(attendance.record_for(self.db, room, self.host.id).checked_in_at, opened_at)
        self.assertEqual(attendance.record_for(self.db, room, self.witness.id).checked_in_at, opened_at + timedelta(seconds=59))

    def test_checkin_opens_at_start_and_closes_thirty_minutes_after_end(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.host)
        self.confirm(room, self.player)
        self.stamp = room.start_time - timedelta(seconds=1)
        with self.assertRaises(HTTPException) as error:
            attendance.open_checkin(self.db, room, self.host)
        self.assertEqual(error.exception.status_code, 409)
        self.assertFalse(attendance.room_state(self.db, room, self.host)["checkin_available"])

        # Players who only reach their phones after the game can still check in.
        closes_at = room.end_time + timedelta(minutes=30)
        self.stamp = closes_at - timedelta(seconds=30)
        state = attendance.room_state(self.db, room, self.host)
        self.assertTrue(state["checkin_available"])
        self.assertEqual(state["window_closes_at"], closes_at)
        self.assertTrue(state["peer_window_open"])
        result = attendance.open_checkin(self.db, room, self.host)
        self.assertEqual(result["expires_at"], closes_at)
        attendance.check_in(self.db, room, self.player, result["code"])
        self.assertIsNotNone(attendance.record_for(self.db, room, self.player.id).checked_in_at)

        self.stamp = closes_at
        with self.assertRaises(HTTPException) as error:
            attendance.open_checkin(self.db, room, self.host)
        self.assertEqual(error.exception.status_code, 409)

    def test_peer_confirmation_closes_thirty_minutes_after_end_while_self_reports_stay_open(self):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        self.confirm(room, self.witness)
        self.stamp = room.start_time - timedelta(seconds=1)
        with self.assertRaises(HTTPException) as error:
            self.report(room, self.player)
        self.assertEqual(error.exception.status_code, 409)

        # From the start: "I was there" and peer confirmation both work during the game.
        self.stamp = room.start_time + timedelta(minutes=10)
        self.report(room, self.player)
        self.report(room, self.witness)
        self.peer(room, self.witness, self.player)
        self.assertTrue(attendance.room_state(self.db, room, self.witness)["peer_window_open"])
        self.assertFalse(attendance.room_state(self.db, room, self.player)["feedback_required"])

        # Peer confirmation closes at end + 30 minutes; the host and players can still submit their results.
        self.stamp = room.end_time + timedelta(minutes=30)
        self.assertFalse(attendance.room_state(self.db, room, self.host)["peer_window_open"])
        with self.assertRaises(HTTPException) as error:
            self.peer(room, self.host, self.player)
        self.assertEqual(error.exception.status_code, 409)
        attendance.report_host(self.db, room, self.host, self.witness.id, "ABSENT")
        self.db.commit()
        self.report(room, self.host, occurred=True, attended=True)
        self.assertIsNone(attendance.required_feedback(self.db, self.player.id)["room"])

    def test_feedback_reminder_only_after_the_end_for_players_who_have_not_reported(self):
        room = self.room()
        self.approve(room, self.player)
        self.stamp = room.end_time - timedelta(minutes=1)
        self.assertFalse(attendance.room_state(self.db, room, self.player)["feedback_required"])
        self.stamp = room.end_time + timedelta(minutes=1)
        self.assertTrue(attendance.room_state(self.db, room, self.player)["feedback_required"])
        self.assertEqual(attendance.required_feedback(self.db, self.player.id)["room"]["match_id"], room.id)

    def test_old_room_policies_use_the_new_checkin_window(self):
        room = self.room()
        session = attendance.session_for(self.db, room)
        policy = {key: value for key, value in session.policy.items() if key != "after_end_minutes"}
        session.policy = {**policy, "checkin_before_minutes": 30}
        self.db.commit()
        self.stamp = room.start_time - timedelta(minutes=10)
        self.assertFalse(attendance.room_state(self.db, room, self.host)["checkin_available"])
        self.stamp = room.end_time + timedelta(minutes=20)
        self.assertTrue(attendance.room_state(self.db, room, self.host)["checkin_available"])

    def test_all_checkins_close_the_code_and_do_not_generate_or_audit_more_rotations(self):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        self.checkin(room, [self.player, self.witness])
        matches.join_match(self.db, room.id, self.outsider.id)
        session = attendance.session_for(self.db, room)
        self.assertIsNone(session.code_hash)
        self.assertIsNone(session.code_salt)
        self.assertIsNone(session.code_expires_at)
        state = attendance.room_state(self.db, room, self.host)
        self.assertEqual(state["checkin_progress"], {"total": 3, "checked_in": 3, "complete": True})
        self.assertIsNone(state["code_expires_at"])
        self.assertFalse(state["checkin_available"])
        before = self.db.query(models.MatchTrustEvent).count()
        with patch("app.attendance.secrets.randbelow", side_effect=AssertionError("No code should be generated")):
            result = attendance.open_checkin(self.db, room, self.host)
            self.db.commit()
        self.assertEqual(result, {"complete": True, "code": None, "expires_at": None})
        self.assertEqual(self.db.query(models.MatchTrustEvent).count(), before)

    def test_newly_approved_member_reopens_checkin_after_everyone_was_checked_in(self):
        room = self.room()
        self.approve(room, self.player)
        self.checkin(room, [self.player])
        self.approve(room, self.witness)
        state = attendance.room_state(self.db, room, self.host)
        self.assertEqual(state["checkin_progress"], {"total": 3, "checked_in": 2, "complete": False})
        self.assertTrue(state["checkin_available"])
        self.confirm(room, self.witness)
        result = attendance.open_checkin(self.db, room, self.host)
        self.db.commit()
        self.assertFalse(result["complete"])
        self.assertRegex(result["code"], r"^\d{6}$")
        attendance.check_in(self.db, room, self.witness, result["code"])
        self.db.commit()
        self.assertTrue(attendance.room_state(self.db, room, self.host)["checkin_progress"]["complete"])
        self.assertIsNone(room.trust_session.code_hash)

    def test_solo_host_checks_in_without_creating_an_unneeded_code(self):
        room = self.room()
        self.confirm(room, self.host)
        self.stamp = room.start_time
        with patch("app.attendance.secrets.randbelow", side_effect=AssertionError("No one needs a code")):
            result = attendance.open_checkin(self.db, room, self.host)
            self.db.commit()
        self.assertTrue(result["complete"])
        self.assertIsNotNone(attendance.record_for(self.db, room, self.host.id).checked_in_at)
        self.assertEqual(attendance.room_state(self.db, room, self.host)["checkin_progress"],
                         {"total": 1, "checked_in": 1, "complete": True})

    def test_pending_and_removed_members_do_not_prevent_checkin_completion(self):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        self.checkin(room, [self.player])
        matches.join_match(self.db, room.id, self.outsider.id)
        self.assertFalse(attendance.room_state(self.db, room, self.host)["checkin_progress"]["complete"])
        matches.update_match_participant_status(self.db, room.id, self.witness.id, "REJECTED")
        self.assertEqual(attendance.room_state(self.db, room, self.host)["checkin_progress"],
                         {"total": 2, "checked_in": 2, "complete": True})
        self.assertTrue(attendance.open_checkin(self.db, room, self.host)["complete"])

    def test_wrong_code_lockout_persists_and_outsider_cannot_checkin(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        code = self.checkin(room, [])
        wrong = "000001" if code != "000001" else "000002"
        for _ in range(5):
            with self.assertRaises(HTTPException):
                attendance.check_in(self.db, room, self.player, wrong)
        with self.assertRaises(HTTPException) as error:
            attendance.check_in(self.db, room, self.player, code)
        self.assertEqual(error.exception.status_code, 429)
        with self.assertRaises(HTTPException) as error:
            attendance.check_in(self.db, room, self.outsider, code)
        self.assertEqual(error.exception.status_code, 403)
        self.stamp += timedelta(minutes=6)
        code = attendance.open_checkin(self.db, room, self.host)["code"]
        attendance.check_in(self.db, room, self.player, code)
        self.assertIsNotNone(attendance.record_for(self.db, room, self.player.id).checked_in_at)

    def test_unconfirmed_or_wrong_room_code_cannot_check_in(self):
        room = self.room()
        self.approve(room, self.player)
        code = self.checkin(room, [])
        with self.assertRaises(HTTPException):
            attendance.check_in(self.db, room, self.player, code)
        other = self.room()
        self.approve(other, self.player)
        self.confirm(other, self.player)
        with self.assertRaises(HTTPException):
            attendance.check_in(self.db, other, self.player, code)

    def test_leave_preserves_evidence_and_reopens_full_room(self):
        room = self.room(capacity=2)
        self.approve(room, self.player)
        self.confirm(room, self.player)
        self.assertEqual(room.status, "FULL")
        matches.leave_match(self.db, room.id, self.player.id, "Bận đột xuất")
        self.db.refresh(room)
        self.assertEqual(room.status, "OPEN")
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertTrue(record.late_cancellation)
        self.assertEqual(record.confirmation_status, "CANCELLED")
        self.assertIsNotNone(self.db.query(models.MatchParticipant).filter_by(match_id=room.id, user_id=self.player.id).first())
        self.assertGreater(self.db.query(models.MatchTrustEvent).filter_by(event_type="CANCELLED_PARTICIPATION").count(), 0)

    def test_current_roster_excludes_departed_removed_and_pending_members(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        self.approve(room, self.witness)
        matches.leave_match(self.db, room.id, self.player.id, "Bận đột xuất")
        matches.update_match_participant_status(self.db, room.id, self.witness.id, "REJECTED")
        matches.join_match(self.db, room.id, self.outsider.id)
        state = attendance.room_state(self.db, room, self.host)
        self.assertEqual([p["user_id"] for p in state["participants"]], [self.host.id])
        self.assertFalse(any(e["subject_id"] in (self.player.id, self.witness.id, self.outsider.id) for e in state["events"]))
        own = attendance.room_state(self.db, room, self.player)
        self.assertTrue(any(e["type"] == "CANCELLED_PARTICIPATION" for e in own["events"]))
        with self.assertRaises(HTTPException) as error:
            attendance.room_state(self.db, room, self.admin)
        self.assertEqual(error.exception.status_code, 403)
        self.assertIsNotNone(attendance.record_for(self.db, room, self.player.id).confirmed_at)

    def test_code_rotation_does_not_displace_meaningful_named_history(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        for _ in range(65):
            attendance.event(self.db, room, self.host.id, "CHECKIN_OPENED", self.host.id)
            attendance.event(self.db, room, self.host.id, "TERMS_CHANGED", self.host.id, room_update=True)
        self.db.commit()
        state = attendance.room_state(self.db, room, self.host)
        self.assertTrue(any(e["type"] == "CONFIRMED" for e in state["events"]))
        approval = next(e for e in state["events"] if e["type"] == "MEMBERSHIP_UPDATED")
        self.assertEqual(approval["actor_name"], self.host.email)
        self.assertEqual(approval["subject_name"], self.player.email)
        self.assertFalse(any(e["type"] == "CHECKIN_OPENED" for e in state["events"]))
        self.assertFalse(any(e["type"] == "TERMS_CHANGED" for e in state["events"]))
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="CHECKIN_OPENED").count(), 65)

    def test_room_change_history_exists_before_confirmation_and_has_before_after_values(self):
        room = self.room()
        data = schemas.MatchCreate(title=room.title, sport_id=room.sport_id, required_level=room.required_level,
                                   start_time=room.start_time, end_time=room.end_time, max_players=room.max_players,
                                   location="Sân mới", price_info=room.price_info)
        matches.update_match(self.db, room.id, data)
        state = attendance.room_state(self.db, room, self.host)
        updates = [e for e in state["events"] if e["type"] == "ROOM_UPDATED"]
        self.assertEqual(len(updates), 1)
        self.assertEqual(updates[0]["details"]["changes"]["location"], {"before": "Quận 1", "after": "Sân mới"})

    def test_host_transfer_and_capacity_guards(self):
        room = self.room(capacity=2)
        self.approve(room, self.player)
        matches.join_match(self.db, room.id, self.witness.id)
        with self.assertRaises(HTTPException) as error:
            matches.update_match_participant_status(self.db, room.id, self.witness.id, "APPROVED")
        self.assertEqual(error.exception.status_code, 409)
        matches.leave_match(self.db, room.id, self.host.id)
        self.db.refresh(room)
        self.assertEqual(room.host_id, self.player.id)
        self.assertEqual(room.status, "OPEN")

    def test_host_cancellation_and_removing_past_room_do_not_punish_players(self):
        room = self.verified_room()
        attendance.cancel_room(self.db, room, self.host.id, removed=True)
        self.db.commit()
        self.assertEqual(room.trust_session.verification_status, "OCCURRED")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["verified_attended"], 1)
        other = self.room()
        self.approve(other, self.player)
        self.confirm(other, self.player)
        attendance.cancel_room(self.db, other, self.host.id, removed=True)
        self.db.commit()
        self.finish(other)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["reviewed_no_shows"], 0)
        self.assertEqual(other.trust_session.verification_status, "CANCELLED")

    def test_conflicting_reports_freeze_reputation(self):
        room = self.verified_room()
        self.report(room, self.player, occurred=False, attended=False)
        self.assertEqual(room.trust_session.verification_status, "DISPUTED")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["verified_attended"], 0)
        self.assertTrue(attendance.is_disputed(attendance.record_for(self.db, room, self.player.id)))

    def reported_absence(self, *, confirmed=True, report_absent=True):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        if confirmed:
            self.confirm(room, self.player)
        self.checkin(room, [self.witness])
        self.finish(room)
        self.report(room, self.host)
        self.report(room, self.witness)
        if report_absent:
            attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        return room

    def test_committed_host_reported_absence_affects_score_without_admin_review(self):
        room = self.reported_absence()
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertIsNone(record.reviewed_at)
        self.assertIsNone(record.resolved_outcome)
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "NO_SHOW")
        with patch.dict(os.environ, {"REPUTATION_MINIMUM_SAMPLES": "1"}):
            summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["no_shows"], 1)
        self.assertEqual(summary["reviewed_no_shows"], 1)
        self.assertNotIn("pending_reviews", summary)
        self.assertEqual(summary["sample_count"], 1)
        self.assertEqual(summary["eligible_commitments"], 1)
        self.assertEqual(summary["no_show_rate"], 100)
        self.assertEqual(summary["score"], 0)
        before = self.db.query(models.MatchTrustEvent).count()
        attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        self.assertEqual(self.db.query(models.MatchTrustEvent).count(), before)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 1)

    def test_host_can_correct_absence_and_restore_peer_verified_attendance(self):
        room = self.reported_absence()
        self.report(room, self.player)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)
        attendance.report_host(self.db, room, self.host, self.player.id, "ATTENDED")
        self.db.commit()
        self.peer(room, self.host, self.player)
        self.peer(room, self.witness, self.player)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["no_shows"], 0)
        self.assertEqual(summary["verified_attended"], 1)
        self.assertEqual(summary["sample_count"], 1)
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "ATTENDED")


    def test_absence_is_not_counted_until_session_has_been_verified(self):
        room = self.room()
        self.approve(room, self.player)
        self.approve(room, self.witness)
        self.confirm(room, self.player)
        self.checkin(room, [self.witness])
        self.finish(room)
        attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)
        self.report(room, self.host)
        self.report(room, self.witness)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 1)

    def test_silence_and_uncommitted_absence_in_verified_session_do_not_count(self):
        self.reported_absence(report_absent=False)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)
        self.reported_absence(confirmed=False)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)

    def test_checked_in_player_cannot_be_automatically_counted_as_no_show(self):
        room = self.verified_room()
        self.report(room, self.player, occurred=True, attended=False)
        attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        self.assertFalse(attendance.is_disputed(attendance.record_for(self.db, room, self.player.id)))
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 0)

    def test_conflicting_self_report_freezes_automatic_absence(self):
        room = self.reported_absence()
        self.report(room, self.player)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["no_shows"], 0)
        self.assertNotIn("pending_reviews", summary)
        self.assertIsNone(summary["score"])
        self.assertEqual(attendance.room_state(self.db, room, self.player)["mine"]["outcome"], "UNVERIFIED")

    def test_admin_review_and_dispute_endpoints_are_removed_for_every_user(self):
        room = self.reported_absence()
        app = FastAPI()
        app.include_router(routes.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        identity = {"user": self.player}
        app.dependency_overrides[auth_utils.get_current_user] = lambda: identity["user"]
        with TestClient(app) as client:
            for person in (self.player, self.host, self.admin):
                identity["user"] = person
                self.assertEqual(client.get("/api/reputation/admin/reviews").status_code, 404)
                self.assertEqual(client.post(
                    f"/api/reputation/admin/matches/{room.id}/participants/{self.player.id}/review",
                    json={"outcome": "NO_SHOW", "note": "This route has been removed"},
                ).status_code, 404)
                self.assertEqual(client.post(
                    f"/api/gamerooms/{room.id}/attendance/dispute", json={"reason": "This route has been removed"},
                ).status_code, 404)


    def test_legacy_admin_decisions_do_not_override_or_lock_automatic_results(self):
        room = self.reported_absence()
        record = attendance.record_for(self.db, room, self.player.id)
        record.reviewed_at = self.stamp
        record.reviewed_by = self.admin.id
        record.resolved_outcome = "EXCUSED"
        record.dispute_reason = "Legacy dispute"
        room.trust_session.reviewed_status = "CANCELLED"
        room.trust_session.reviewed_at = self.stamp
        self.db.commit()
        attendance.refresh_verification(self.db, room)
        self.db.commit()
        self.assertEqual(room.trust_session.verification_status, "OCCURRED")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["no_shows"], 1)
        self.report(room, self.player)
        attendance.report_host(self.db, room, self.host, self.player.id, "ATTENDED")
        self.db.commit()
        self.peer(room, self.host, self.player)
        self.peer(room, self.witness, self.player)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["verified_attended"], 1)


    def test_old_absent_and_silence_are_not_no_shows(self):
        room = self.room()
        self.approve(room, self.player)
        self.finish(room)
        attendance.report_host(self.db, room, self.host, self.player.id, "ABSENT")
        self.db.commit()
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["sample_count"], 0)

    def test_changed_schedule_requires_new_consent(self):
        room = self.room()
        self.approve(room, self.player)
        record = self.confirm(room, self.player)
        data = schemas.MatchCreate(title=room.title, sport_id=room.sport_id, price_info="50", required_level="Beginner",
                                   start_time=room.start_time + timedelta(hours=1), end_time=room.end_time + timedelta(hours=1),
                                   max_players=4, location="Quận 2")
        matches.update_match(self.db, room.id, data)
        self.db.refresh(record)
        self.assertEqual(record.confirmation_status, "UNCONFIRMED")
        self.assertIsNone(record.confirmed_at)
        self.assertIsNone(record.checked_in_at)

    def test_stale_terms_cannot_be_accepted_and_repeat_confirmation_is_idempotent(self):
        room = self.room()
        self.approve(room, self.player)
        old_version = attendance.room_state(self.db, room, self.player)["terms_version"]
        room.location = "Sân mới Quận 3"
        self.db.commit()
        with self.assertRaises(HTTPException) as error:
            attendance.confirm(self.db, room, self.player, old_version)
        self.assertEqual(error.exception.status_code, 409)
        self.db.rollback()
        version = attendance.room_state(self.db, room, self.player)["terms_version"]
        attendance.confirm(self.db, room, self.player, version)
        self.db.commit()
        count = self.db.query(models.MatchTrustEvent).filter_by(event_type="CONFIRMED").count()
        self.stamp = room.end_time + timedelta(minutes=1)
        attendance.confirm(self.db, room, self.player, version)
        self.db.commit()
        self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(event_type="CONFIRMED").count(), count)

    def test_activity_totals_do_not_expire_with_reputation_window(self):
        room = self.verified_room()
        self.stamp = room.end_time + timedelta(days=181)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["sample_count"], 0)
        self.assertEqual(attendance.verified_games_by_sport(self.db, self.player.id)[self.sport.id], 1)

    def test_cancellation_cutoff_is_snapshotted_and_rejoin_preserves_history(self):
        with patch.dict(os.environ, {"ATTENDANCE_LATE_CANCEL_MINUTES": "10"}):
            room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        with patch.dict(os.environ, {"ATTENDANCE_LATE_CANCEL_MINUTES": "120"}):
            matches.leave_match(self.db, room.id, self.player.id, "Báo hủy sớm")
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertFalse(record.late_cancellation)
        self.approve(room, self.player)
        self.assertIsNone(record.confirmed_at)
        self.confirm(room, self.player)
        self.stamp = room.start_time - timedelta(minutes=5)
        matches.leave_match(self.db, room.id, self.player.id, "Báo hủy sát giờ")
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["early_cancellations"], 1)
        self.assertEqual(summary["late_cancellations"], 1)
        self.assertEqual(summary["reviewed_no_shows"], 0)

    def test_host_removal_is_not_player_cancellation(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        matches.update_match_participant_status(self.db, room.id, self.player.id, "REJECTED")
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertEqual(record.confirmation_status, "REMOVED")
        self.assertFalse(record.late_cancellation)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["early_cancellations"] + summary["late_cancellations"], 0)

    def test_late_approval_requires_explicit_consent_and_deadline_has_no_penalty(self):
        with patch.dict(os.environ, {"ATTENDANCE_CONFIRM_AFTER_START_MINUTES": "5"}):
            room = self.room()
        self.stamp = room.start_time + timedelta(minutes=6)
        self.approve(room, self.player)
        with self.assertRaises(HTTPException) as error:
            self.confirm(room, self.player)
        self.assertEqual(error.exception.status_code, 409)
        self.db.rollback()
        record = attendance.record_for(self.db, room, self.player.id)
        self.assertIsNone(record.confirmed_at)
        self.finish(room)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["reviewed_no_shows"], 0)

    def test_correcting_conflicting_feedback_automatically_restores_one_result(self):
        room = self.verified_room()
        self.stamp += timedelta(seconds=1)
        self.report(room, self.player, occurred=False, attended=False)
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["verified_attended"], 0)
        self.stamp += timedelta(seconds=1)
        self.report(room, self.player)
        summary = attendance.reputations(self.db, [self.player.id])[self.player.id]
        self.assertEqual(summary["verified_attended"], 1)
        self.assertEqual(summary["eligible_commitments"], 1)
        self.assertEqual(summary["verified_attendance_rate"], 100)


    def test_evidence_survives_new_database_session_and_public_summary_is_private(self):
        room = self.verified_room()
        room_id, player_id = room.id, self.player.id
        self.db.close()
        self.db = self.factory()
        loaded = matches.get_match_by_id(self.db, room_id)
        attendance.attach_reputations(self.db, [loaded])
        player = next(p.user for p in loaded.participants if p.user_id == player_id)
        self.assertNotIn("pending_reviews", player.reputation)
        self.assertEqual(player.reputation["verified_attended"], 1)

    def test_account_erasure_handles_attendance_records_and_admin_references(self):
        room = self.verified_room()
        # Old stored references still need to be cleaned up on account deletion.
        record = attendance.record_for(self.db, room, self.player.id)
        record.reviewed_by = self.admin.id
        record.reviewed_at = self.stamp
        self.db.commit()
        player_id, admin_id, host_id = self.player.id, self.admin.id, self.host.id
        with patch("app.routers.auth._delete_user_media"):
            auth._delete_user_data(self.db, admin_id)
            self.db.commit()
            self.db.expire_all()
            self.assertIsNone(attendance.record_for(self.db, room, player_id).reviewed_by)
            auth._delete_user_data(self.db, player_id)
            self.db.commit()
            self.assertEqual(self.db.query(models.MatchAttendanceRecord).filter_by(user_id=player_id).count(), 0)
            self.assertEqual(self.db.query(models.MatchTrustEvent).filter_by(subject_id=player_id).count(), 0)
            auth._delete_user_data(self.db, host_id)
            self.db.commit()
            self.assertEqual(self.db.query(models.MatchTrustSession).count(), 0)

    def test_attendance_payload_has_no_admin_review_controls_or_special_access(self):
        room = self.reported_absence()
        state = attendance.room_state(self.db, room, self.player)
        self.assertNotIn("can_review", state)
        self.assertNotIn("review_participants", state)
        self.assertNotIn("resolved_outcome", state["mine"])
        self.assertNotIn("resolution_note", state["mine"])
        with self.assertRaises(HTTPException) as error:
            attendance.room_state(self.db, room, self.admin)
        self.assertEqual(error.exception.status_code, 403)


    def test_host_cancellation_notifies_members_and_keeps_their_history(self):
        room = self.room()
        self.approve(room, self.player)
        self.confirm(room, self.player)
        app = FastAPI()
        app.include_router(gamerooms.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        app.dependency_overrides[auth_utils.get_current_user] = lambda: self.host
        with TestClient(app) as client:
            self.assertEqual(client.delete(f"/api/gamerooms/{room.id}").status_code, 204)
        self.db.refresh(room)
        self.assertEqual(room.status, "CANCELLED")
        self.assertIsNotNone(attendance.record_for(self.db, room, self.player.id).confirmed_at)
        notification = self.db.query(models.Notification).filter_by(
            recipient_id=self.player.id, type="gameroom_deleted").one()
        self.assertEqual(notification.title, "Buổi chơi đã bị hủy")
        self.assertIn("không bị tính vắng", notification.body)
        self.assertEqual(notification.target_url, f"/matches?attendance={room.id}")
        self.assertEqual(attendance.reputations(self.db, [self.player.id])[self.player.id]["reviewed_no_shows"], 0)

    def test_http_permissions_validation_history_and_legacy_compatibility(self):
        app = FastAPI()
        app.include_router(routes.router, prefix="/api")
        app.include_router(gamerooms.router, prefix="/api")
        app.dependency_overrides[database.get_db] = lambda: self.db
        identity = {"user": self.player}
        app.dependency_overrides[auth_utils.get_current_user] = lambda: identity["user"]
        app.dependency_overrides[auth_utils.get_optional_current_user] = lambda: None
        client = TestClient(app)
        room = self.room()
        self.approve(room, self.player)
        root = f"/api/gamerooms/{room.id}/attendance"
        self.assertEqual(client.post(root + "/confirm", json={"accepted_policy": False}).status_code, 422)
        terms_version = client.get(root).json()["terms_version"]
        self.assertEqual(client.post(root + "/confirm", json={"accepted_policy": True, "terms_version": terms_version}).status_code, 200)
        self.assertEqual(client.post(root + "/checkin-code").status_code, 403)
        self.assertEqual(client.get("/api/reputation/admin/reviews").status_code, 404)
        response = client.get("/api/gamerooms/participating")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["id"], room.id)
        self.assertIn("reputation", response.json()[0]["host"])
        self.assertEqual(client.get(f"/api/gamerooms/{room.id}").status_code, 200)
        self.finish(room)
        self.assertEqual(client.put(root + "/report", json={"occurred": False, "attended": True}).status_code, 422)
        identity["user"] = self.outsider
        self.assertEqual(client.get(root).status_code, 403)
        identity["user"] = self.admin
        self.assertEqual(client.get("/api/reputation/admin/reviews").status_code, 404)


if __name__ == "__main__":
    unittest.main()
