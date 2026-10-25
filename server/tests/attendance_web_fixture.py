"""Disposable local app for attendance browser tests. Never imports app.main or live DB config.

Run from server/: .venv/Scripts/python.exe tests/attendance_web_fixture.py
The /test/* routes exist only in this fixture process, bound to loopback.
"""
import os
import sys
import tempfile
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
scratch = tempfile.TemporaryDirectory(prefix="sportgo-attendance-web-")
os.environ["TRANSACTION_DATABASE_URL"] = "sqlite:///" + (Path(scratch.name) / "fixture.db").as_posix()
os.environ["JWT_SECRET"] = "attendance-browser-test-only-secret"

import uvicorn
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from app import attendance, auth_utils, database, models, schemas
from app.cache import memory_cache
from app.crud import matches
from app.routers import admin, auth, chat, courts, gamerooms, notifications, owner, social, teams
from app.routers import attendance as attendance_routes

clock = {"now": datetime.now(timezone.utc).replace(tzinfo=None)}
attendance.now = lambda: clock["now"]
models.Base.metadata.create_all(database.engine)
identities = {}
with database.SessionLocal() as db:
    sport = models.Sport(name="Badminton")
    db.add(sport)
    db.flush()
    for role, name in [("host", "Minh Chủ Phòng"), ("player", "Lan Người Chơi"),
                       ("witness", "Nam Người Chơi"), ("admin", "Quản Trị Viên")]:
        user = models.User(email=f"{role}@sportgo.test", password_hash=auth_utils.get_password_hash("SportGo123!"), is_admin=role == "admin")
        db.add(user)
        db.flush()
        db.add(models.UserProfile(user_id=user.id, full_name=name))
        db.add(models.UserPolicyAcceptance(user_id=user.id))
        db.add(models.UserSport(user_id=user.id, sport_id=sport.id, skill_level="Beginner"))
        identities[role] = {"id": user.id, "token": auth_utils.create_access_token({"sub": user.email})}
    db.commit()
    room = matches.create_match(db, identities["host"]["id"], schemas.MatchCreate(
        title="Cầu lông tối thứ hai", sport_id=sport.id, max_players=4,
        location="Sân Thảo Điền, Quận 2", price_info="50", required_level="Beginner",
        start_time=clock["now"] + timedelta(minutes=10), end_time=clock["now"] + timedelta(minutes=70),
    ))
    room_id = room.id


@asynccontextmanager
async def lifespan(_app):
    yield
    database.engine.dispose()
    scratch.cleanup()


app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:5178"], allow_methods=["*"], allow_headers=["*"])
for router in [auth.router, courts.router, attendance_routes.router, gamerooms.router,
               chat.router, notifications.router, owner.router, social.router, teams.router, admin.router]:
    app.include_router(router, prefix="/api")


@app.get("/test/state")
def state():
    return {"identities": identities, "room_id": room_id}


@app.post("/test/seat-hold-room")
def seat_hold_room(minutes: int = Query(180, ge=1, le=360), approved: bool = True):
    with database.SessionLocal() as db:
        original = db.get(models.Match, room_id)
        attendance.cancel_room(db, original, identities["host"]["id"])
        host = db.get(models.User, identities["host"]["id"])
        host.premium_until = clock["now"] + timedelta(days=7)
        db.flush()
        room = matches.create_match(db, host.id, schemas.MatchCreate(
            title="Kèo thử giữ chỗ và dự bị", sport_id=original.sport_id, max_players=2,
            location="Sân Thảo Điền, Quận 2", price_info="50000", required_level="Beginner",
            start_time=clock["now"] + timedelta(minutes=minutes),
            end_time=clock["now"] + timedelta(minutes=minutes + 90), seat_holds_enabled=True))
        if approved:
            matches.join_match(db, room.id, identities["player"]["id"], accepted_hold_policy=True,
                               expected_arrival_at=clock["now"] + timedelta(minutes=5))
            matches.update_match_participant_status(db, room.id, identities["player"]["id"], "APPROVED")
        attendance.confirm(db, room, host, room.terms_version)
        db.commit()
        memory_cache.clear()
        return {"room_id": room.id, "server_time": clock["now"]}


@app.post("/test/seat-hold-cycle")
def seat_hold_cycle():
    from app.seat_holds import process_seat_holds
    from app.auto_room_invites import process_auto_room_invites
    with database.SessionLocal() as db:
        process_seat_holds(db)
        process_auto_room_invites(db)
        db.commit()
        memory_cache.clear()
    return {"ok": True}


@app.post("/test/finish")
def finish():
    with database.SessionLocal() as db:
        room = db.get(models.Match, room_id)
        clock["now"] = room.end_time + timedelta(minutes=1)
        memory_cache.clear()
    return {"ok": True}


@app.post("/test/advance")
def advance(seconds: int = Query(60, ge=1, le=3600)):
    clock["now"] += timedelta(seconds=seconds)
    memory_cache.clear()
    return {"server_time": clock["now"]}


@app.post("/test/cross-confirmation-room")
def cross_confirmation_room(missing_steps: bool = False):
    with database.SessionLocal() as db:
        original = db.get(models.Match, room_id)
        room = matches.create_match(db, identities["host"]["id"], schemas.MatchCreate(
            title="Buổi thử xác nhận chéo", sport_id=original.sport_id, max_players=4,
            location="Sân Thảo Điền, Quận 2", price_info="50000", required_level="Beginner",
            start_time=clock["now"] + timedelta(minutes=10), end_time=clock["now"] + timedelta(minutes=70),
        ))
        for role in ("player", "witness"):
            matches.join_match(db, room.id, identities[role]["id"])
            matches.update_match_participant_status(db, room.id, identities[role]["id"], "APPROVED")
        host = db.get(models.User, identities["host"]["id"])
        attendance.confirm(db, room, host)
        clock["now"] = room.start_time
        code = attendance.open_checkin(db, room, host)["code"]
        for role in ("player", "witness"):
            person = db.get(models.User, identities[role]["id"])
            if not missing_steps or role != "player":
                attendance.confirm(db, room, person)
            if not missing_steps:
                attendance.check_in(db, room, person, code)
        db.commit()
        clock["now"] = room.end_time + timedelta(minutes=1)
        memory_cache.clear()
        return {"room_id": room.id}


@app.post("/test/low-attendance-room")
def low_attendance_room(ended: bool = False):
    with database.SessionLocal() as db:
        original = db.get(models.Match, room_id)
        start = clock["now"] - timedelta(minutes=16)
        room = matches.create_match(db, identities["host"]["id"], schemas.MatchCreate(
            title="Buổi thiếu người đã kết thúc" if ended else "Buổi chờ thêm người",
            sport_id=original.sport_id, max_players=4, location="Sân Quận 1",
            price_info="50000", required_level="Beginner", start_time=start,
            end_time=start + timedelta(minutes=10) if ended else clock["now"] + timedelta(minutes=44),
        ))
        if not ended:
            matches.join_match(db, room.id, identities["player"]["id"])
            matches.update_match_participant_status(db, room.id, identities["player"]["id"], "APPROVED")
        db.commit()
        memory_cache.clear()
        return {"room_id": room.id}


@app.post("/test/required-feedback-rooms")
def required_feedback_rooms(count: int = Query(2, ge=1, le=3), end_in_seconds: int = Query(0, ge=0, le=10), solo: bool = False):
    with database.SessionLocal() as db:
        original = db.get(models.Match, room_id)
        created = []
        for index in range(count):
            end = clock["now"] + timedelta(seconds=end_in_seconds) if end_in_seconds else clock["now"] - timedelta(minutes=count - index)
            room = matches.create_match(db, identities["host"]["id"], schemas.MatchCreate(
                title=f"Buổi cần phản hồi {index + 1}", sport_id=original.sport_id, max_players=4,
                location="Sân Thảo Điền, Quận 2", price_info="50000", required_level="Beginner",
                start_time=end - timedelta(hours=1), end_time=end,
            ))
            if not solo:
                matches.join_match(db, room.id, identities["player"]["id"])
                if end_in_seconds:
                    matches.update_match_participant_status(db, room.id, identities["player"]["id"], "APPROVED")
            # Seed prior membership for ended fixtures without opening a retrospective approval path.
            if not end_in_seconds and not solo:
                db.query(models.MatchParticipant).filter_by(match_id=room.id, user_id=identities["player"]["id"]).one().status = "APPROVED"
                attendance.record_for(db, room, identities["player"]["id"])
                db.flush()
                attendance.report_self(db, room, db.get(models.User, identities["host"]["id"]), True, True)
            if index == 0 and not end_in_seconds and not solo:
                db.add(models.MatchParticipant(match_id=room.id, user_id=identities["witness"]["id"], status="PENDING"))
            created.append(room.id)
        db.commit()
        memory_cache.clear()
        return {"room_ids": created}


@app.post("/test/checkin-completion-room")
def checkin_completion_room():
    with database.SessionLocal() as db:
        original = db.get(models.Match, room_id)
        room = matches.create_match(db, identities["host"]["id"], schemas.MatchCreate(
            title="Buổi thử hoàn tất check-in", sport_id=original.sport_id, max_players=4,
            location="Sân Quận 1", price_info="50000", required_level="Beginner",
            start_time=clock["now"] + timedelta(minutes=10), end_time=clock["now"] + timedelta(minutes=70),
        ))
        matches.join_match(db, room.id, identities["player"]["id"])
        matches.update_match_participant_status(db, room.id, identities["player"]["id"], "APPROVED")
        for role in ("host", "player"):
            attendance.confirm(db, room, db.get(models.User, identities[role]["id"]))
        db.commit()
        clock["now"] = room.start_time
        memory_cache.clear()
        return {"room_id": room.id}


@app.post("/test/membership-history")
def membership_history():
    with database.SessionLocal() as db:
        for kind, name in (("departed", "Huy Đã Rời"), ("removed", "Linh Đã Gỡ"), ("pending", "Người Chờ Duyệt")):
            email = f"{kind}@sportgo.test"
            if db.query(models.User.id).filter_by(email=email).first():
                continue
            user = models.User(email=email, password_hash="unused-test-only-password")
            db.add(user)
            db.flush()
            db.add(models.UserProfile(user_id=user.id, full_name=name))
            db.commit()
            matches.join_match(db, room_id, user.id)
            if kind != "pending":
                matches.update_match_participant_status(db, room_id, user.id, "APPROVED")
                if kind == "departed":
                    matches.leave_match(db, room_id, user.id, "Có việc đột xuất")
                else:
                    matches.update_match_participant_status(db, room_id, user.id, "REJECTED")
        memory_cache.clear()
    return {"ok": True}


@app.get("/test/controls", response_class=HTMLResponse)
def controls():
    return """<!doctype html><html lang="vi"><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>SportGo — Điều khiển buổi chơi mẫu</title>
    <style>
    body{font:16px/1.65 system-ui;background:#0b1220;color:#e8edf6;max-width:650px;margin:60px auto;padding:24px}
    a{color:#91b5ff}button{font:inherit;background:#4e73ed;border:0;border-radius:10px;padding:12px 20px;color:white;cursor:pointer}
    table{border-collapse:collapse;width:100%;margin:20px 0}td,th{text-align:left;border-bottom:1px solid #334155;padding:10px}
    #result{color:#8ee2b5}
    </style>
    <h1>Thử buổi chơi SportGo</h1>
    <p><a href="http://127.0.0.1:5178/login" target="_blank">Mở web để đăng nhập</a>.</p>
    <table><tr><th>Vai trò</th><th>Email</th></tr>
    <tr><td>Chủ phòng</td><td>host@sportgo.test</td></tr>
    <tr><td>Người chơi</td><td>player@sportgo.test</td></tr>
    <tr><td>Người chơi thứ hai</td><td>witness@sportgo.test</td></tr>
    <tr><td>Quản trị viên</td><td>admin@sportgo.test</td></tr></table>
    <p>Mật khẩu chung: <strong>SportGo123!</strong></p>
    <ol><li>Vào Tìm trận, xin tham gia phòng mẫu rồi dùng chủ phòng duyệt.</li>
    <li>Mỗi người chọn Tôi sẽ đến. Chủ phòng mở mã để người chơi check-in.</li>
    <li>Bấm nút dưới sau khi check-in xong, rồi tải lại web để điểm danh và gửi phản hồi.</li>
    <li>Nếu phản hồi chưa khớp, người chơi sửa xác nhận và chủ phòng cập nhật điểm danh để hệ thống tự tính lại.</li></ol>
    <button id="finish" onclick="finishSession()">Kết thúc buổi chơi mẫu</button><p id="result" role="status"></p>
    <p>Dữ liệu được tạo riêng cho lượt chạy này. Nút chỉ chuyển giờ của phòng mẫu; dữ liệu được làm mới khi khởi động lại API này.</p>
    <script>
    async function finishSession(){
      const button=document.getElementById('finish');button.disabled=true;
      try{const response=await fetch('/test/finish',{method:'POST'});if(!response.ok)throw new Error();
      document.getElementById('result').textContent='Buổi mẫu đã kết thúc. Tải lại web để thử xác nhận sau buổi và điểm danh.';
      }catch{document.getElementById('result').textContent='Chưa kết thúc được buổi mẫu. Hãy thử lại.';button.disabled=false;}
    }
    </script></html>"""


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8018, log_level="warning")
