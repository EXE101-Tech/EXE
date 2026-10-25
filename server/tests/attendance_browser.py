"""Playwright smoke flow against attendance_web_fixture.py and Vite on :5178.

Only disposable users/data are used. Pass --inspect for DOM reconnaissance.
"""
import argparse
import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument("--inspect", action="store_true")
parser.add_argument("--theme", choices=("light", "dark"), default="light")
parser.add_argument("--artifacts", default=os.path.join(os.environ.get("TEMP", "."), "sportgo-attendance-browser"))
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:5178"
API = "http://127.0.0.1:8018"
fixture = json.load(urlopen(API + "/test/state", timeout=5))

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    contexts = []
    errors = []
    def user_page(role, mobile=False):
        context = browser.new_context(viewport={"width": 390 if mobile else 1440, "height": 844 if mobile else 1000})
        contexts.append(context)
        token = fixture["identities"][role]["token"]
        context.add_init_script("localStorage.setItem('token', " + json.dumps(token) + ");")
        context.add_init_script("localStorage.setItem('theme', " + json.dumps(args.theme) + ");")
        context.route("**/*", lambda route: route.continue_() if route.request.url.startswith((BASE, API, "data:", "blob:")) else route.abort())
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        return page

    def person_row(page, name):
        return page.locator(".sg-attendance-person").filter(has=page.locator(".sg-attendance-person-info > strong").filter(has_text=name))

    def save_report(page):
        required = page.locator(".sg-attendance-required").count() > 0
        page.get_by_role("button", name=re.compile(r"^Gửi (?:phản hồi và tiếp tục|xác nhận sau buổi|khai báo bổ sung)$")).click()
        if required:
            expect(page.locator(".sg-attendance-required")).to_have_count(0)
            expect(page.get_by_role("button", name="Sửa xác nhận của tôi", exact=True)).to_be_visible()
        else:
            expect(page.get_by_role("dialog").get_by_role("status")).to_contain_text("Đã lưu xác nhận")

    try:
        host = user_page("host")
        response = host.request.post(API + "/test/membership-history")
        assert response.ok, response.text()
        host.goto(BASE + "/matches", wait_until="networkidle")
        host.screenshot(path=str(artifacts / "rooms-desktop.png"), full_page=True)
        host.set_viewport_size({"width": 390, "height": 844})
        host.screenshot(path=str(artifacts / "rooms-host-mobile.png"), full_page=True)
        assert host.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), "Room card overflows on mobile"
        host.set_viewport_size({"width": 1440, "height": 1000})
        if args.inspect:
            print(json.dumps({"buttons": host.get_by_role("button").all_text_contents(), "body": host.locator("body").inner_text()}, ensure_ascii=True))
            host.get_by_role("button", name="Điểm danh", exact=True).click()
            expect(host).to_have_url(re.compile(r"attendance="))
            expect(host.get_by_role("dialog")).to_be_visible()
            host.screenshot(path=str(artifacts / "attendance-desktop.png"))
            print(json.dumps({"dialog": host.get_by_role("dialog").inner_text()}, ensure_ascii=True))
            host.get_by_role("button", name="Đóng điểm danh buổi chơi").click()
            host.get_by_role("button", name="Mở phòng", exact=True).click()
            print(json.dumps({"create": host.locator("body").inner_text(), "inputs": host.locator("input").evaluate_all("nodes => nodes.map(n => ({type:n.type, placeholder:n.placeholder, value:n.value}))")}, ensure_ascii=True))
            player = user_page("player", mobile=True)
            player.goto(BASE + "/matches", wait_until="networkidle")
            print(json.dumps({"player_buttons": player.get_by_role("button").all_text_contents()}, ensure_ascii=True))
        else:
            player = user_page("player", mobile=True)
            witness = user_page("witness")
            for page in (player, witness):
                page.goto(BASE + "/matches", wait_until="networkidle")
                page.get_by_role("button", name="Tham gia ngay", exact=True).click()
                page.get_by_role("button", name="Gửi yêu cầu", exact=True).click()
                expect(page.get_by_role("button", name="Đang chờ duyệt", exact=True)).to_be_visible()

            host.reload(wait_until="networkidle")
            host.get_by_role("button", name="Quản lý phòng").click()
            manager = host.get_by_role("dialog", name="Quản lý phòng", exact=True)
            expect(manager.get_by_role("tab", name=re.compile("Chờ duyệt"))).to_have_attribute("aria-selected", "true")
            expect(manager).to_contain_text("50.000đ/người")
            manager.screenshot(path=str(artifacts / "room-manager-requests.png"), animations="disabled")
            host.set_viewport_size({"width": 390, "height": 844})
            assert manager.evaluate("node => node.scrollWidth <= node.clientWidth"), "Manager overflows on mobile"
            manager.screenshot(path=str(artifacts / "room-manager-mobile.png"), animations="disabled")
            host.set_viewport_size({"width": 1440, "height": 1000})
            for name in ("Lan Người Chơi", "Nam Người Chơi"):
                applicant = host.locator(".sg-modal-pending").filter(has_text=name)
                expect(applicant.get_by_text("Chưa đủ dữ liệu uy tín")).to_be_visible()
                applicant.get_by_role("button", name="Duyệt vào").click()
                expect(applicant).to_have_count(0)
            manager.locator(".sg-modal-pending").filter(has_text="Người Chờ Duyệt").get_by_role("button", name="Duyệt vào").click()
            expect(manager.get_by_text("Không có yêu cầu đang chờ", exact=True)).to_be_visible()
            manager.get_by_role("tab", name=re.compile("Thành viên")).click()
            expect(manager.locator(".sg-room-manager-member")).to_have_count(4)
            target = manager.locator(".sg-room-manager-member").filter(has_text="Người Chờ Duyệt")
            target.get_by_role("button", name="Gỡ khỏi phòng", exact=True).click()
            expect(manager.locator(".sg-room-manager-member")).to_have_count(4)
            target.get_by_role("button", name="Giữ thành viên", exact=True).click()
            expect(target.get_by_role("button", name="Xác nhận gỡ", exact=True)).to_have_count(0)
            target.get_by_role("button", name="Gỡ khỏi phòng", exact=True).click()
            target.get_by_role("button", name="Xác nhận gỡ", exact=True).click()
            expect(target).to_have_count(0)
            expect(manager.locator(".sg-room-manager-member")).to_have_count(3)
            expect(manager.locator(".sg-room-manager-member").filter(has_text="Minh Chủ Phòng")).to_have_count(1)
            manager.screenshot(path=str(artifacts / "room-manager-members.png"), animations="disabled")
            host.locator(".sg-modal-card .sg-modal-close").click()

            room_url = BASE + f'/matches?attendance={fixture["room_id"]}'
            for page in (host, player, witness):
                page.goto(room_url, wait_until="networkidle")
                dialog = page.get_by_role("dialog")
                expect(dialog.get_by_role("button", name="Tôi sẽ tham gia", exact=True)).to_be_disabled()
                if page == host:
                    expect(dialog.locator(".sg-attendance-person-status.is-waiting")).to_have_count(3)
                    expect(dialog.locator(".sg-attendance-person-status.is-waiting").first).to_have_text("Chưa xác nhận")
                expect(dialog.get_by_text("Quy định tham gia", exact=True)).to_be_visible()
                assert not dialog.locator('details').filter(has=page.get_by_text("Quy định tham gia", exact=True)).get_attribute("open")
                dialog.get_by_role("checkbox").check()
                with page.expect_response(lambda response: response.url.endswith(f'/gamerooms/{fixture["room_id"]}/attendance') and response.request.method == "GET"):
                    page.evaluate("window.dispatchEvent(new Event('focus'))")
                expect(dialog.get_by_role("checkbox")).to_be_checked()
                dialog.get_by_role("button", name="Tôi sẽ tham gia", exact=True).click()
                expect(dialog.get_by_role("status")).to_contain_text("Đã xác nhận tham gia")
            response = host.request.post(API + "/test/advance?seconds=600")
            assert response.ok, response.text()
            for page in (host, player, witness):
                page.reload(wait_until="networkidle")
            host.get_by_role("button", name="Tạo mã check-in", exact=True).click()
            code_output = host.get_by_label("Mã check-in của phòng")
            expect(code_output).to_have_text(re.compile(r"^\d{6}$"))
            code = code_output.inner_text()
            response = host.request.post(API + "/test/advance?seconds=60")
            assert response.ok, response.text()
            player_headers = {"Authorization": "Bearer " + fixture["identities"]["player"]["token"]}
            expired = host.request.post(API + f'/api/gamerooms/{fixture["room_id"]}/attendance/checkin', headers=player_headers, data={"code": code})
            assert expired.status == 409, expired.text()
            with host.expect_response(lambda response: response.url.endswith('/attendance/checkin-code') and response.request.method == "POST"):
                host.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(code_output).not_to_have_text(code)
            expect(code_output).to_have_text(re.compile(r"^\d{6}$"))
            expect(host.get_by_text(re.compile(r"^Mã tự đổi mỗi 1 phút\. Chỉ chia sẻ với những người đang có mặt tại sân\."))).to_be_visible()
            host.screenshot(path=str(artifacts / "attendance-host-code.png"))
            host.get_by_role("button", name="Đóng điểm danh buổi chơi").click()
            host.get_by_role("button", name="Điểm danh", exact=True).click()
            expect(host.get_by_label("Mã check-in của phòng")).to_have_count(0)
            expect(host.get_by_text("Mã đã tạo không hiển thị lại sau khi đóng cửa sổ. Tạo mã mới sẽ thay thế mã trước đó.", exact=True)).to_be_visible()
            host.get_by_role("button", name="Tạo mã check-in mới", exact=True).click()
            code = host.get_by_label("Mã check-in của phòng").inner_text()
            player.get_by_label("Mã check-in", exact=True).fill(code)
            player.get_by_role("button", name="Check-in tại sân", exact=True).click()
            expect(player.get_by_role("dialog").get_by_role("status")).to_contain_text("Check-in thành công")
            expect(person_row(player, "Lan Người Chơi").locator(".sg-attendance-person-time")).to_contain_text("Check-in lúc")
            expect(player.get_by_text("Tôi không thể tham gia", exact=True)).to_have_count(0)
            expect(player.get_by_role("dialog").locator(".sg-attendance-status")).to_have_count(0)
            player.screenshot(path=str(artifacts / "attendance-mobile.png"))
            assert player.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Modal overflows on mobile"

            with host.expect_response(lambda response: response.url.endswith(f'/gamerooms/{fixture["room_id"]}/attendance') and response.request.method == "GET"):
                host.evaluate("window.dispatchEvent(new Event('focus'))")
            roster = host.locator(".sg-attendance-roster")
            expect(roster).to_be_visible()
            expect(roster).to_contain_text("2/3 đã check-in")
            expect(roster.locator(".sg-attendance-person")).to_have_count(3)
            expect(roster.locator(".sg-attendance-person-status.is-present")).to_have_count(2)
            expect(roster.locator(".sg-attendance-person-status.is-confirmed")).to_have_count(1)
            expect(roster.get_by_text(re.compile("Huy Đã Rời|Linh Đã Gỡ|Người Chờ Duyệt"))).to_have_count(0)
            expect(roster.get_by_role("heading", name="Xác nhận người cùng chơi 3", exact=True)).to_be_visible()
            host.get_by_role("dialog").screenshot(path=str(artifacts / "attendance-current-roster.png"))
            roster.screenshot(path=str(artifacts / "attendance-roster-desktop.png"), animations="disabled")
            host.set_viewport_size({"width": 390, "height": 844})
            assert roster.evaluate("node => node.scrollWidth <= node.clientWidth"), "Participant list overflows on mobile"
            roster.screenshot(path=str(artifacts / "attendance-roster-mobile.png"), animations="disabled")
            host.set_viewport_size({"width": 1440, "height": 1000})
            host.get_by_text("Lịch sử hoạt động", exact=True).click()
            history = host.locator(".sg-attendance-history")
            expect(history).to_contain_text("Bạn duyệt Lan Người Chơi vào phòng")
            expect(history).to_contain_text("Lan Người Chơi đã check-in tại sân")
            expect(history.get_by_text(re.compile("Huy Đã Rời|Linh Đã Gỡ|Người Chờ Duyệt|Tạo mã check-in"))).to_have_count(0)
            expect(history.get_by_role("button", name="Xem thêm hoạt động", exact=True)).to_be_visible()
            history.get_by_role("button", name="Xem thêm hoạt động", exact=True).click()
            expect(history).to_contain_text("Bạn tạo buổi chơi")
            history.screenshot(path=str(artifacts / "attendance-history-desktop.png"), animations="disabled")
            host.set_viewport_size({"width": 390, "height": 844})
            assert host.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "History overflows on mobile"
            host.get_by_role("dialog").screenshot(path=str(artifacts / "attendance-history-mobile.png"), animations="disabled")
            host.set_viewport_size({"width": 1440, "height": 1000})

            response = host.request.post(API + "/test/finish")
            assert response.ok, response.text()
            for page in (host, player):
                page.reload(wait_until="networkidle")
                page.get_by_label("Buổi chơi có diễn ra không?").select_option("true")
                page.get_by_label("Bạn có tham gia không?").select_option("true")
                with page.expect_response(lambda response: response.url.endswith(f'/gamerooms/{fixture["room_id"]}/attendance') and response.request.method == "GET"):
                    page.evaluate("window.dispatchEvent(new Event('focus'))")
                expect(page.get_by_label("Buổi chơi có diễn ra không?")).to_have_value("true")
                expect(page.get_by_label("Bạn có tham gia không?")).to_have_value("true")
                save_report(page)
                expect(page.get_by_role("button", name="Gửi xác nhận sau buổi", exact=True)).to_have_count(0)

            host.reload(wait_until="networkidle")
            expect(person_row(host, "Minh Chủ Phòng").get_by_role("button", name="Xác nhận có mặt", exact=True)).to_have_count(0)
            person_row(host, "Lan Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True).click()
            expect(person_row(host, "Lan Người Chơi").get_by_role("button", name="Đã xác nhận có mặt", exact=True)).to_have_attribute("aria-pressed", "true")
            person_row(host, "Nam Người Chơi").get_by_role("button", name="Báo vắng", exact=True).click()
            expect(person_row(host, "Nam Người Chơi").get_by_role("button", name="Bỏ báo vắng", exact=True)).to_have_attribute("aria-pressed", "true")
            expect(host.locator(".sg-attendance-status")).to_contain_text("Buổi chơi đã được xác nhận")
            host.screenshot(path=str(artifacts / "attendance-host-results.png"))

            token = fixture["identities"]["witness"]["token"]
            reputation_path = API + f'/api/reputation/users/{fixture["identities"]["witness"]["id"]}'
            summary = host.request.get(reputation_path, headers={"Authorization": "Bearer " + token}).json()
            assert summary["no_shows"] == 1 and "pending_reviews" not in summary, summary
            expect(person_row(host, "Nam Người Chơi")).to_contain_text("Vắng không báo")

            # Conflicting feedback and host corrections are recalculated without admin review.
            witness = user_page("witness")
            witness.goto(BASE + f'/matches?attendance={fixture["room_id"]}', wait_until="networkidle")
            expect(witness.get_by_role("heading", name="Vắng không báo", exact=True)).to_be_visible()
            expect(witness.get_by_text("Yêu cầu xem lại kết quả", exact=True)).to_have_count(0)
            witness.get_by_label("Buổi chơi có diễn ra không?").select_option("true")
            witness.get_by_label("Bạn có tham gia không?").select_option("true")
            save_report(witness)
            expect(witness.get_by_role("heading", name="Phản hồi chưa khớp", exact=True)).to_be_visible()
            summary = witness.request.get(reputation_path, headers={"Authorization": "Bearer " + token}).json()
            assert summary["no_shows"] == 0, summary
            host.reload(wait_until="networkidle")
            person_row(host, "Nam Người Chơi").get_by_role("button", name="Bỏ báo vắng", exact=True).click()
            expect(host.get_by_role("dialog").get_by_role("status")).to_contain_text("Đã bỏ báo vắng")
            person_row(host, "Nam Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True).click()
            player.reload(wait_until="networkidle")
            person_row(player, "Nam Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True).click()
            witness.reload(wait_until="networkidle")
            expect(witness.get_by_role("heading", name="Đã xác minh tham dự bổ sung", exact=True)).to_be_visible()
            summary = witness.request.get(reputation_path, headers={"Authorization": "Bearer " + token}).json()
            assert summary["no_shows"] == 0 and summary["verified_attended"] == 1, summary
            witness.get_by_role("dialog").screenshot(path=str(artifacts / "attendance-automatic-correction.png"))
            admin = user_page("admin")
            admin.goto(BASE + "/admin", wait_until="networkidle")
            expect(admin.get_by_role("button", name="Điểm danh & uy tín", exact=True)).to_have_count(0)

            # Three checked-in people confirm one another. One vote alone cannot verify attendance.
            peer_response = host.request.post(API + "/test/cross-confirmation-room")
            assert peer_response.ok, peer_response.text()
            peer_id = peer_response.json()["room_id"]
            for page in (host, player, witness):
                page.goto(BASE + f'/matches?attendance={peer_id}', wait_until="networkidle")
                page.get_by_label("Buổi chơi có diễn ra không?").select_option("true")
                page.get_by_label("Bạn có tham gia không?").select_option("true")
                save_report(page)
            person_row(host, "Lan Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True).click()
            player.reload(wait_until="networkidle")
            expect(player.get_by_role("heading", name="Đã gửi xác nhận sau buổi", exact=True)).to_be_visible()
            expect(person_row(player, "Lan Người Chơi").locator(".sg-attendance-peer-count")).to_contain_text("1/2")
            expect(person_row(player, "Lan Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True)).to_have_count(0)
            person_row(witness, "Lan Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True).click()
            for page, names in [(host, ["Nam Người Chơi"]), (player, ["Minh Chủ Phòng", "Nam Người Chơi"]), (witness, ["Minh Chủ Phòng"])]:
                for name in names:
                    person_row(page, name).get_by_role("button", name="Xác nhận có mặt", exact=True).click()
                    expect(person_row(page, name).get_by_role("button", name="Đã xác nhận có mặt", exact=True)).to_be_visible()
            player.reload(wait_until="networkidle")
            expect(player.get_by_role("heading", name="Tham dự đã xác minh", exact=True)).to_be_visible()
            expect(person_row(player, "Lan Người Chơi").locator(".sg-attendance-peer-count")).to_contain_text("2/2")
            assert player.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Cross-confirmation overflows mobile"
            player.get_by_role("dialog").screenshot(path=str(artifacts / "cross-confirmation-mobile.png"), animations="disabled")
            host.reload(wait_until="networkidle")
            host.get_by_role("dialog").screenshot(path=str(artifacts / "cross-confirmation-desktop.png"), animations="disabled")
            # Presence and absence are exclusive; an explicit absence opens a conflict, never an instant penalty.
            absent_row = person_row(player, "Nam Người Chơi")
            expect(person_row(player, "Lan Người Chơi").get_by_role("button", name="Xác nhận không tham gia", exact=True)).to_have_count(0)
            absent_row.get_by_role("button", name="Xác nhận không tham gia", exact=True).click()
            expect(absent_row.get_by_role("button", name="Đã xác nhận không tham gia", exact=True)).to_have_attribute("aria-pressed", "true")
            expect(absent_row.get_by_role("button", name="Xác nhận có mặt", exact=True)).to_have_attribute("aria-pressed", "false")
            expect(absent_row.locator(".sg-attendance-peer-absences")).to_contain_text("1 người xác nhận không tham gia")
            expect(absent_row.locator(".sg-attendance-peer-absences")).to_contain_text("Lan Người Chơi")
            expect(absent_row.locator(".sg-attendance-person-result")).to_have_text("Phản hồi chưa khớp")
            absent_row.screenshot(path=str(artifacts / "peer-absence-mobile.png"), animations="disabled")
            player.set_viewport_size({"width": 320, "height": 740})
            assert player.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Absence actions overflow at 320px"
            absent_row.screenshot(path=str(artifacts / "peer-absence-narrow.png"), animations="disabled")
            player.set_viewport_size({"width": 390, "height": 844})
            witness.reload(wait_until="networkidle")
            expect(witness.get_by_role("heading", name="Phản hồi chưa khớp", exact=True)).to_be_visible()
            witness.get_by_role("dialog").screenshot(path=str(artifacts / "peer-absence-conflict-desktop.png"), animations="disabled")
            absent_row.get_by_role("button", name="Bỏ xác nhận của tôi", exact=True).click()
            expect(absent_row.locator(".sg-attendance-peer-absences")).to_have_count(0)
            absent_row.get_by_role("button", name="Xác nhận có mặt", exact=True).click()
            witness.reload(wait_until="networkidle")
            expect(witness.get_by_role("heading", name="Tham dự đã xác minh", exact=True)).to_be_visible()
            person_row(witness, "Lan Người Chơi").get_by_role("button", name="Đã xác nhận có mặt", exact=True).click()
            expect(person_row(witness, "Lan Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True)).to_be_visible()
            player.reload(wait_until="networkidle")
            expect(player.get_by_role("heading", name="Đã gửi xác nhận sau buổi", exact=True)).to_be_visible()
            person_row(witness, "Lan Người Chơi").get_by_role("button", name="Xác nhận có mặt", exact=True).click()

            # Approved people who missed consent or check-in can report and be cross-verified honestly.
            missing_response = host.request.post(API + "/test/cross-confirmation-room?missing_steps=true")
            assert missing_response.ok, missing_response.text()
            missing_id = missing_response.json()["room_id"]
            host.goto(BASE + f'/matches?attendance={missing_id}', wait_until="networkidle")
            host.get_by_label("Buổi chơi có diễn ra không?").select_option("true")
            host.get_by_label("Bạn có tham gia không?").select_option("true")
            save_report(host)
            missing_row = person_row(host, "Lan Người Chơi")
            expect(missing_row.get_by_role("button", name="Xác nhận có mặt", exact=True)).to_have_count(0)
            missing_row.get_by_role("button", name="Xác nhận không tham gia", exact=True).click()
            expect(missing_row.locator(".sg-attendance-peer-absences")).to_contain_text("Minh Chủ Phòng")
            missing_row.get_by_role("button", name="Đã xác nhận không tham gia", exact=True).click()
            expect(missing_row.locator(".sg-attendance-peer-absences")).to_have_count(0)
            for page in (host, player, witness):
                page.goto(BASE + f'/matches?attendance={missing_id}', wait_until="networkidle")
                if page != host:
                    page.get_by_label("Buổi chơi có diễn ra không?").select_option("true")
                    page.get_by_label("Bạn có tham gia không?").select_option("true")
                    save_report(page)
                own = page.locator(".sg-attendance-person.is-self")
                expect(own.locator(".sg-attendance-person-you")).to_have_text("Bạn")
                assert page.locator(".sg-attendance-person").first.evaluate("node => node.classList.contains('is-self')"), "Current user is not first"
            for page, names in [(host, ["Lan Người Chơi", "Nam Người Chơi"]), (player, ["Minh Chủ Phòng", "Nam Người Chơi"]), (witness, ["Minh Chủ Phòng", "Lan Người Chơi"])]:
                page.reload(wait_until="networkidle")
                for name in names:
                    person_row(page, name).get_by_role("button", name="Xác nhận có mặt", exact=True).click()
                    expect(person_row(page, name).get_by_role("button", name="Đã xác nhận có mặt", exact=True)).to_be_visible()
            player.reload(wait_until="networkidle")
            expect(player.get_by_role("heading", name="Đã xác minh tham dự bổ sung", exact=True)).to_be_visible()
            own = person_row(player, "Lan Người Chơi")
            expect(own.get_by_text("Chưa xác nhận trước buổi", exact=True)).to_be_visible()
            expect(own.locator(".sg-attendance-person-status")).to_have_text("Chưa check-in")
            expect(own.locator(".sg-attendance-peer-count")).to_contain_text("2/2")
            assert player.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Supplemental flow overflows mobile"
            own.screenshot(path=str(artifacts / "supplemental-current-user-mobile.png"), animations="disabled")
            player.get_by_role("dialog").screenshot(path=str(artifacts / "supplemental-entry-mobile.png"), animations="disabled")
            missing_state = player.request.get(API + f'/api/gamerooms/{missing_id}/attendance', headers=player_headers).json()
            assert missing_state["mine"]["confirmed_at"] is None and missing_state["mine"]["checked_in_at"] is None, missing_state["mine"]
            assert missing_state["mine"]["outcome"] == "ATTENDED", missing_state["mine"]
            witness.reload(wait_until="networkidle")
            expect(witness.get_by_role("heading", name="Đã xác minh tham dự bổ sung", exact=True)).to_be_visible()
            witness.get_by_role("dialog").screenshot(path=str(artifacts / "supplemental-entry-desktop.png"), animations="disabled")

            player.goto(room_url, wait_until="networkidle")
            player.reload(wait_until="networkidle")
            expect(player.get_by_role("heading", name="Đã gửi xác nhận sau buổi", exact=True)).to_be_visible()
            expect(player.get_by_text("Yêu cầu xem lại kết quả", exact=True)).to_have_count(0)
            player.get_by_role("button", name="Sửa xác nhận của tôi", exact=True).click()
            player.get_by_label("Buổi chơi có diễn ra không?").select_option("false")
            player.get_by_role("button", name="Gửi xác nhận sau buổi", exact=True).click()
            expect(player.locator(".sg-attendance-status")).to_contain_text("Phản hồi về buổi chơi chưa khớp")
            player.get_by_role("button", name="Sửa xác nhận của tôi", exact=True).click()
            player.get_by_label("Buổi chơi có diễn ra không?").select_option("true")
            player.get_by_label("Bạn có tham gia không?").select_option("true")
            player.get_by_role("button", name="Gửi xác nhận sau buổi", exact=True).click()
            expect(player.locator(".sg-attendance-status")).to_contain_text("Buổi chơi đã được xác nhận")
            player.goto(BASE + "/home", wait_until="networkidle")
            expect(player.get_by_role("heading", name="Uy tín tham gia", exact=True)).to_be_visible()
            expect(player.locator(".sg-reputation-panel")).to_contain_text("Chưa đủ dữ liệu")
            player.locator(".sg-reputation-panel").screenshot(path=str(artifacts / "reputation-mobile.png"))

            # Creation opens explicit consent; leaving alone cancels the room and retains its history.
            host.goto(BASE + "/matches", wait_until="networkidle")
            host.get_by_role("button", name="Mở phòng", exact=True).click()
            host.locator('input[name="title"]').fill("Kèo kiểm thử xác nhận mới")
            host.locator('input[name="location"]').fill("Sân Quận 1")
            host.locator('input[type="date"]').fill((datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"))
            host.get_by_placeholder("VD: 50 hoặc 50.000", exact=True).fill("50000")
            expect(host.get_by_text("Mỗi người: 50.000đ", exact=True)).to_be_visible()
            host.get_by_role("button", name="Tạo Phòng Ngay", exact=True).click()
            expect(host.get_by_role("dialog")).to_contain_text("Kèo kiểm thử xác nhận mới")
            host.get_by_role("dialog").get_by_role("checkbox").check()
            host_headers = {"Authorization": "Bearer " + fixture["identities"]["host"]["token"]}
            rooms = host.request.get(API + "/api/gamerooms/participating", headers=host_headers).json()
            created = next(room for room in rooms if room["title"] == "Kèo kiểm thử xác nhận mới")
            assert created["price_info"] == "50000", created["price_info"]
            changed = {key: created[key] for key in ("title", "sport_id", "location", "price_info", "required_level", "start_time", "end_time", "max_players")}
            changed["location"] = "Sân mới Quận 3"
            response = host.request.put(API + f'/api/gamerooms/{created["id"]}', headers=host_headers, data=changed)
            assert response.ok, response.text()
            host.get_by_role("button", name="Tôi sẽ tham gia", exact=True).click()
            expect(host.get_by_role("dialog").get_by_role("alert")).to_contain_text("điều kiện đã thay đổi")
            expect(host.get_by_role("dialog")).to_contain_text("Sân mới Quận 3")
            expect(host.get_by_role("button", name="Tôi sẽ tham gia", exact=True)).to_be_disabled()
            expect(host.get_by_role("dialog").get_by_text("50.000đ/người", exact=True)).to_be_visible()
            host.get_by_role("dialog").get_by_role("checkbox").check()
            host.get_by_role("button", name="Tôi sẽ tham gia", exact=True).click()
            expect(host.get_by_role("dialog").get_by_role("status")).to_contain_text("Đã xác nhận tham gia")
            expect(host.get_by_role("heading", name="Đã xác nhận tham gia", exact=True)).to_be_visible()
            host.screenshot(path=str(artifacts / "attendance-upcoming.png"))
            host.get_by_text("Hủy buổi chơi", exact=True).click()
            expect(host.get_by_role("button", name="Xác nhận hủy buổi chơi", exact=True)).to_be_disabled()
            host.get_by_role("checkbox", name="Tôi muốn hủy buổi chơi cho tất cả thành viên.").check()
            host.get_by_role("button", name="Xác nhận hủy buổi chơi", exact=True).click()
            expect(host.locator(".sg-attendance-status")).to_contain_text("Buổi chơi đã hủy")
            response = host.request.post(API + "/test/low-attendance-room")
            assert response.ok, response.text()
            low_id = response.json()["room_id"]
            low_url = BASE + f"/matches?attendance={low_id}"
            host.goto(low_url, wait_until="networkidle")
            warning = host.get_by_role("region", name="Buổi chơi chưa đủ người", exact=True)
            expect(warning).to_be_visible()
            expect(warning).to_contain_text("15 phút")
            expect(warning.get_by_role("button", name="Hủy vì thiếu người", exact=True)).to_be_disabled()
            player.goto(low_url, wait_until="networkidle")
            expect(player.get_by_role("region", name="Buổi chơi chưa đủ người", exact=True)).to_be_visible()
            expect(player.get_by_role("button", name="Tiếp tục buổi chơi", exact=True)).to_have_count(0)
            expect(player.get_by_role("button", name="Hủy vì thiếu người", exact=True)).to_have_count(0)
            host.get_by_role("button", name="Tiếp tục buổi chơi", exact=True).click()
            expect(warning).to_have_count(0)
            host.reload(wait_until="networkidle")
            expect(host.get_by_role("region", name="Buổi chơi chưa đủ người", exact=True)).to_have_count(0)

            response = host.request.post(API + "/test/low-attendance-room?ended=true")
            assert response.ok, response.text()
            solo_id = response.json()["room_id"]
            host.goto(BASE + f"/matches?attendance={solo_id}", wait_until="networkidle")
            expect(host.get_by_role("region", name="Phản hồi bắt buộc", exact=True)).to_be_visible()
            expect(host.get_by_label("Buổi chơi có diễn ra không?")).to_be_visible()
            expect(host.locator(".sg-attendance-peer-count")).to_have_count(0)
            expect(host.get_by_role("button", name="Tiếp tục buổi chơi", exact=True)).to_have_count(0)
            host.set_viewport_size({"width": 390, "height": 844})
            assert host.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Low attendance flow overflows mobile"
            host.get_by_role("dialog").screenshot(path=str(artifacts / "low-attendance-mobile.png"))
            host.set_viewport_size({"width": 1440, "height": 1000})
            host.get_by_role("dialog").screenshot(path=str(artifacts / "low-attendance-desktop.png"))
            host.get_by_role("checkbox", name="Xác nhận buổi chơi không diễn ra vì thiếu người.", exact=True).check()
            host.get_by_role("button", name="Hủy vì thiếu người", exact=True).click()
            expect(host.get_by_role("heading", name="Buổi chơi đã hủy vì thiếu người", exact=True)).to_be_visible()
            expect(host.get_by_role("dialog")).to_contain_text("Buổi này không làm giảm uy tín")
            host.get_by_text("Lịch sử hoạt động", exact=True).click()
            expect(host.locator(".sg-attendance-history")).to_contain_text("Bạn hủy buổi chơi vì thiếu người")
            response = host.request.post(API + "/test/checkin-completion-room")
            assert response.ok, response.text()
            complete_id = response.json()["room_id"]
            host.goto(BASE + f"/matches?attendance={complete_id}", wait_until="networkidle")
            code_requests = []
            host.on("request", lambda request: code_requests.append(request.url)
                    if request.method == "POST" and request.url.endswith("/attendance/checkin-code") else None)
            host.get_by_role("button", name="Tạo mã check-in", exact=True).click()
            code = host.get_by_label("Mã check-in của phòng").inner_text()
            response = host.request.post(API + f"/api/gamerooms/{complete_id}/attendance/checkin",
                                         headers=player_headers, data={"code": code})
            assert response.ok, response.text()
            with host.expect_response(lambda response: response.url.endswith(f"/gamerooms/{complete_id}/attendance") and response.request.method == "GET"):
                host.evaluate("window.dispatchEvent(new Event('focus'))")
            expect(host.locator(".sg-attendance-roster-checkins.is-complete")).to_contain_text("2/2 đã check-in")
            expect(host.get_by_label("Mã check-in của phòng")).to_have_count(0)
            expect(host.get_by_role("button", name="Đổi mã check-in", exact=True)).to_have_count(0)
            expect(host.locator(".sg-attendance-roster")).to_contain_text("2/2 đã check-in")
            before = len(code_requests)
            response = host.request.post(API + "/test/advance?seconds=61")
            assert response.ok, response.text()
            with host.expect_response(lambda response: response.url.endswith(f"/gamerooms/{complete_id}/attendance") and response.request.method == "GET"):
                host.evaluate("window.dispatchEvent(new Event('focus'))")
            host.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
            assert len(code_requests) == before, "Completed check-in still rotates the code"
            host.reload(wait_until="networkidle")
            expect(host.locator(".sg-attendance-roster-checkins.is-complete")).to_contain_text("2/2 đã check-in")
            host.get_by_role("dialog").screenshot(path=str(artifacts / "checkin-complete-desktop.png"))
            host.set_viewport_size({"width": 390, "height": 844})
            assert host.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Completed check-in overflows mobile"
            host.get_by_role("dialog").screenshot(path=str(artifacts / "checkin-complete-mobile.png"))
            host.set_viewport_size({"width": 1440, "height": 1000})

            witness_headers = {"Authorization": "Bearer " + fixture["identities"]["witness"]["token"]}
            response = host.request.post(API + f"/api/gamerooms/{complete_id}/join", headers=witness_headers, data={})
            assert response.ok, response.text()
            host.reload(wait_until="networkidle")
            expect(host.locator(".sg-attendance-roster-checkins.is-complete")).to_contain_text("2/2 đã check-in")
            response = host.request.patch(API + f'/api/gamerooms/{complete_id}/participants/{fixture["identities"]["witness"]["id"]}/status',
                                          headers=host_headers, data={"status": "APPROVED"})
            assert response.ok, response.text()
            host.reload(wait_until="networkidle")
            expect(host.get_by_role("button", name="Tạo mã check-in", exact=True)).to_be_visible()
            expect(host.locator(".sg-attendance-roster-checkins.is-complete")).to_have_count(0)
            host.get_by_role("button", name="Tạo mã check-in", exact=True).click()
            expect(host.get_by_label("Mã check-in của phòng")).to_have_text(re.compile(r"^\d{6}$"))
            print("PASS: attendance flows, automatic no-show and conflict correction without admin, low-attendance decisions, close code and stop rotation when everyone checks in, reopen for newly approved members")
    except Exception:
        for index, context in enumerate(contexts):
            for page in context.pages:
                page.screenshot(path=str(artifacts / f"failure-{index}.png"))
                print(json.dumps({"page": index, "url": page.url, "body": page.locator("body").inner_text()[-6500:]}, ensure_ascii=True))
        raise
    finally:
        for context in contexts:
            context.close()
        browser.close()
    assert not errors, errors
