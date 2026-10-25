"""Headless browser QA with temporary SQLite API and loopback Vite, cleaned up on exit."""
import argparse
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright, expect


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--artifacts", required=True)
    args = parser.parse_args()
    artifacts = Path(args.artifacts).resolve()
    artifacts.mkdir(parents=True, exist_ok=True)
    root = Path(__file__).resolve().parents[2]
    api, base = "http://127.0.0.1:8018", "http://127.0.0.1:5178"
    processes = []
    logs = []
    try:
        env = {**os.environ, "VITE_API_URL": api + "/api"}
        commands = [([sys.executable, str(root / "server/tests/attendance_web_fixture.py")], root / "server", api + "/test/state"),
                    ([shutil.which("node"), str(root / "client/node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "5178", "--strictPort"], root / "client", base)]
        for index, (command, cwd, url) in enumerate(commands):
            log = (artifacts / f"server-{index}.log").open("w", encoding="utf-8")
            logs.append(log)
            process = subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT,
                                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            processes.append(process)
            deadline = time.monotonic() + 30
            while True:
                try:
                    urlopen(url, timeout=1).close()
                    break
                except Exception:
                    if process.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError(f"Local test server failed; inspect server-{index}.log")
                    time.sleep(.2)
        fixture = json.load(urlopen(api + "/test/state", timeout=3))
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel="chrome", headless=True)
            contexts, errors = [], []

            def page_for(role, mobile=False):
                context = browser.new_context(viewport={"width": 390 if mobile else 1440, "height": 844 if mobile else 1000}, timezone_id="Asia/Ho_Chi_Minh")
                contexts.append(context)
                context.add_init_script("localStorage.setItem('token', " + json.dumps(fixture["identities"][role]["token"]) + "); localStorage.setItem('theme', 'light');")
                context.route("**/*", lambda route: route.continue_() if route.request.url.startswith((base, api, "data:", "blob:")) else route.abort())
                page = context.new_page()
                page.on("pageerror", lambda err: errors.append(str(err)))
                return page

            host = page_for("host")
            created = host.request.post(api + "/test/seat-hold-room")
            assert created.ok, created.text()
            room = created.json()["room_id"]
            host.goto(base + "/matches", wait_until="networkidle")
            host.screenshot(path=str(artifacts / "rooms-desktop.png"), full_page=True)
            if args.inspect:
                print(json.dumps({"body": host.locator("body").inner_text(), "buttons": host.get_by_role("button").all_text_contents()}, ensure_ascii=True))
                player = page_for("player", mobile=True)
                player.goto(base + f"/matches?attendance={room}", wait_until="networkidle")
                player.screenshot(path=str(artifacts / "hold-mobile.png"), full_page=True)
                print(json.dumps({"dialog": player.get_by_role("dialog").inner_text()}, ensure_ascii=True))
            else:
                host.get_by_role("button", name="Mở phòng", exact=True).click()
                toggle = host.get_by_role("checkbox", name=re.compile("Nhắc chốt kèo & tìm người thay"))
                expect(toggle).to_be_visible()
                toggle.check()
                expect(toggle).to_be_checked()
                host.locator(".sg-modal-card .sg-modal-close").click()
                host.get_by_role("button", name="Quản lý phòng").click()
                manager = host.get_by_role("dialog", name="Quản lý phòng", exact=True)
                expect(manager.get_by_role("tab", name=re.compile("Dự bị & lời mời"))).to_be_visible()
                host.set_viewport_size({"width": 390, "height": 844})
                assert manager.evaluate("node => node.scrollWidth <= node.clientWidth"), "Manager overflows mobile"
                manager.screenshot(path=str(artifacts / "manager-mobile.png"))
                host.get_by_role("button", name="Đóng quản lý phòng").click()
                player = page_for("player", mobile=True)
                player.goto(base + f"/matches?attendance={room}", wait_until="networkidle")
                expect(player.get_by_text("Chỗ đang được giữ tạm", exact=False)).to_be_visible()
                player.screenshot(path=str(artifacts / "hold-mobile.png"), full_page=True)
                witness = page_for("witness", mobile=True)
                witness.goto(base + "/matches", wait_until="networkidle")
                witness.get_by_role("button", name="Đăng ký dự bị", exact=True).click()
                signup = witness.get_by_role("dialog", name="Đăng ký chơi dự bị", exact=True)
                expect(signup.get_by_role("button", name="Đăng ký dự bị", exact=True)).to_be_disabled()
                signup.get_by_role("checkbox").check()
                signup.get_by_role("button", name="Đăng ký dự bị", exact=True).click()
                expect(witness.get_by_role("button", name="Rút dự bị", exact=True)).to_be_visible()
                assert host.request.post(api + "/test/advance?seconds=3600").ok
                assert host.request.post(api + "/test/seat-hold-cycle").ok
                player.reload(wait_until="networkidle")
                expect(player.get_by_role("heading", name="Đã hết hạn giữ chỗ", exact=True)).to_be_visible()
                expect(player.get_by_role("dialog")).to_contain_text("không bị trừ uy tín")
                witness.goto(base + f"/matches?attendance={room}", wait_until="networkidle")
                expect(witness.get_by_role("heading", name="Có suất chơi dành cho bạn", exact=True)).to_be_visible()
                witness.screenshot(path=str(artifacts / "offer-mobile.png"), full_page=True)
                witness.get_by_role("checkbox").check()
                witness.get_by_role("button", name="Nhận chỗ & xác nhận", exact=True).click()
                expect(witness.get_by_role("dialog").get_by_role("status")).to_contain_text("Đã nhận chỗ")
                expect(witness.get_by_role("heading", name="Có suất chơi dành cho bạn", exact=True)).to_have_count(0)
                for context in contexts:
                    context.close()
                contexts.clear()
                late_host = page_for("host")
                late_info = late_host.request.post(api + "/test/seat-hold-room?minutes=20&approved=false").json()
                late_room = late_info["room_id"]
                late = page_for("player", mobile=True)
                late.goto(base + "/matches", wait_until="networkidle")
                card = late.locator(".sg-room-card").filter(has=late.get_by_role("heading", name="Kèo thử giữ chỗ và dự bị", exact=True)).filter(has=late.get_by_role("button", name="Tham gia ngay", exact=True))
                card.get_by_role("button", name="Tham gia ngay", exact=True).click()
                expect(late.get_by_label("Dự kiến đến sân lúc", exact=False)).to_be_visible()
                late.screenshot(path=str(artifacts / "late-join-mobile.png"), full_page=True)
                arrival = (datetime.fromisoformat(late_info["server_time"]).replace(tzinfo=timezone.utc)
                           + timedelta(minutes=10)).astimezone(timezone(timedelta(hours=7)))
                late.get_by_label("Dự kiến đến sân lúc", exact=False).fill(arrival.strftime("%Y-%m-%dT%H:%M"))
                late.get_by_role("checkbox").check()
                late.get_by_role("dialog").get_by_role("button", name="Gửi yêu cầu", exact=True).click()
                late_host.goto(base + "/matches", wait_until="networkidle")
                late_host.locator(".sg-room-card").filter(has_text="Còn 1 chỗ").get_by_role("button", name="Quản lý phòng").click()
                late_manager = late_host.get_by_role("dialog", name="Quản lý phòng", exact=True)
                expect(late_manager).to_contain_text("Dự kiến đến")
                late_manager.get_by_role("button", name="Duyệt vào", exact=True).click()
                expect(late_manager.locator(".sg-modal-pending")).to_have_count(0)
                late.goto(base + f"/matches?attendance={late_room}", wait_until="networkidle")
                expect(late.get_by_role("dialog")).to_contain_text("Còn 4 phút")
                late.get_by_role("checkbox").check()
                late.get_by_role("button", name="Tôi sẽ tham gia", exact=True).click()
                expect(late.get_by_role("dialog").get_by_role("status")).to_contain_text("Đã xác nhận tham gia")
                print(json.dumps({"ok": True, "room_id": room, "late_room_id": late_room, "page_errors": errors}))
            if errors:
                raise AssertionError(errors)
            for context in contexts:
                context.close()
            browser.close()
    finally:
        for process in reversed(processes):
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        for log in logs:
            log.close()


if __name__ == "__main__":
    main()
