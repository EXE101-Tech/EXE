"""Run the admin match history browser check with Vite and a disposable SQLite API."""

import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import urlopen

from fastapi.testclient import TestClient
from playwright.sync_api import expect, sync_playwright


@contextmanager
def vite_server():
    client_dir = Path(__file__).resolve().parents[2] / "client"
    vite = client_dir / "node_modules/vite/bin/vite.js"
    node = shutil.which("node")
    if not node or not vite.is_file():
        raise SystemExit("Install Node.js and run npm ci in client/ first.")

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    command = [node, str(vite), "--host", "127.0.0.1", "--port", str(port), "--strictPort"]
    with subprocess.Popen(command, cwd=client_dir, env={**os.environ, "VITE_API_URL": "/api"},
                          creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)) as process:
        try:
            deadline = time.monotonic() + 20
            while process.poll() is None and time.monotonic() < deadline:
                try:
                    with urlopen(url, timeout=1):
                        break
                except (URLError, TimeoutError):
                    time.sleep(0.2)
            else:
                raise RuntimeError("Vite did not start on the local test port.")
            yield url
        finally:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()


def main():
    from attendance_web_fixture import app, clock, identities

    headers = {role: {"Authorization": f"Bearer {identity['token']}"}
               for role, identity in identities.items()}
    history_url = "/api/admin/rooms?occurred_only=true"
    with vite_server() as base_url, TestClient(app) as api, sync_playwright() as playwright:
        assert api.get(history_url, headers=headers["player"]).status_code == 403

        browser = playwright.chromium.launch(channel="chrome", headless=True)
        try:
            page = browser.new_page()
            page.clock.set_fixed_time(datetime(2026, 11, 9, 12, tzinfo=timezone.utc))
            token = json.dumps(identities["admin"]["token"])
            page.add_init_script(f"localStorage.setItem('token', {token});")

            def local_request(route):
                request = route.request
                if not request.url.startswith(f"{base_url}/"):
                    return route.abort()
                url = urlsplit(request.url)
                if not url.path.startswith("/api/"):
                    return route.continue_()
                # Send the browser's API calls through the actual FastAPI routes in the fixture.
                response = api.request(request.method, f"{url.path}?{url.query}" if url.query else url.path,
                                       headers=request.headers, content=request.post_data_buffer)
                route.fulfill(status=response.status_code, body=response.content,
                              content_type=response.headers.get("content-type"))

            page.route("**/*", local_request)
            page.goto(f"{base_url}/admin")
            page.get_by_role("button", name="Trận đã diễn ra 0 Xem danh sách").click()
            expect(page.get_by_text("Chưa có trận nào được xác minh đã diễn ra.")).to_be_visible()

            def create_occurred_room(start):
                clock["now"] = start - timedelta(minutes=10)
                created = api.post("/test/cross-confirmation-room")
                created.raise_for_status()
                match_id = created.json()["room_id"]
                for role in ("host", "player", "witness"):
                    report = api.put(f"/api/gamerooms/{match_id}/attendance/report", headers=headers[role],
                                     json={"occurred": True, "attended": True})
                    report.raise_for_status()
                assert report.json()["verification_status"] == "OCCURRED"
                return match_id

            create_occurred_room(datetime(2026, 10, 1, 17))
            create_occurred_room(datetime(2026, 10, 31, 16, 59))
            month_start_id = create_occurred_room(datetime(2026, 10, 31, 17))
            room_id = create_occurred_room(datetime(2026, 11, 2, 17))
            for role in ("host", "witness"):
                vote = api.put(f"/api/gamerooms/{room_id}/attendance/peers/{identities['player']['id']}",
                               headers=headers[role], json={"report": "ATTENDED"})
                vote.raise_for_status()

            # Removing a verified match hides it from moderation but preserves its history.
            api.delete(f"/api/gamerooms/{room_id}", headers=headers["admin"]).raise_for_status()
            rooms = api.get("/api/admin/rooms", headers=headers["admin"])
            rooms.raise_for_status()
            assert room_id not in {room["id"] for room in rooms.json()}

            page.reload()
            page.get_by_role("button", name="Trận đã diễn ra 4 Xem danh sách").click()
            expect(page.locator("details")).to_have_count(4)
            period_select = page.get_by_role("combobox", name="Khoảng thời gian")
            for period, count in (("7 ngày qua", 1), ("30 ngày qua", 3), ("Tháng này", 2)):
                period_select.select_option(label=period)
                expect(page.get_by_role("button", name=f"Trận đã diễn ra {count} {period} Xem danh sách")).to_be_visible()
                expect(page.get_by_role("heading", name=f"Trận đã diễn ra ({count})")).to_be_visible()
                expect(page.locator("details")).to_have_count(count)
            expect(page.locator("summary").filter(has_text=f"#{month_start_id} ·")).to_be_visible()

            match = page.locator("details").filter(has_text=f"#{room_id} ·")
            expect(match.get_by_text("Phòng đã gỡ")).to_be_visible()
            match.locator("summary").click()
            expect(match).to_have_attribute("open", "")
            for detail in ("Bắt đầu", "Kết thúc", "Sân Thảo Điền, Quận 2", "Nam Người Chơi", "50.000"):
                expect(match.get_by_text(detail, exact=False)).to_be_visible()
            expect(match.get_by_role("heading", name="Kết quả điểm danh")).to_be_visible()
            expect(match.get_by_role("listitem").filter(has_text="Minh Chủ Phòng")).to_contain_text("Chưa có kết quả")
            expect(match.get_by_role("listitem").filter(has_text="Lan Người Chơi")).to_contain_text("Có mặt đã xác nhận")
        finally:
            browser.close()

    print("PASS: admin access, date filters, synchronized counts, archived badge and attendance details.")


if __name__ == "__main__":
    main()
