"""Mandatory post-session feedback and expired requests against disposable local fixtures."""
import argparse
import json
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--artifacts", required=True)
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:5178"
API = "http://127.0.0.1:8018"
fixture = json.load(urlopen(API + "/test/state"))

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    contexts, errors = [], []

    def user_page(role, width=1440, theme="light"):
        context = browser.new_context(viewport={"width": width, "height": 900})
        contexts.append(context)
        context.add_init_script("localStorage.setItem('token', " + json.dumps(fixture["identities"][role]["token"]) + ");localStorage.setItem('theme', " + json.dumps(theme) + ");")
        context.route("**/*", lambda route: route.continue_() if route.request.url.startswith((BASE, API, "data:", "blob:")) else route.abort())
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        return page

    def task(page):
        return page.get_by_role("region", name="Phản hồi bắt buộc", exact=True)

    def submit(page, occurred="true", attended="true"):
        page.get_by_label("Buổi chơi có diễn ra không?").select_option(occurred)
        page.get_by_label("Bạn có tham gia không?").select_option(attended)
        page.get_by_role("button", name="Gửi phản hồi và tiếp tục", exact=True).click()

    try:
        player = user_page("player", 390)
        response = player.request.post(API + "/test/required-feedback-rooms")
        assert response.ok, response.text()
        first, second = response.json()["room_ids"]
        player.goto(BASE + "/home", wait_until="networkidle")
        expect(task(player)).to_contain_text("Còn 2 buổi cần phản hồi")
        expect(player.get_by_role("dialog")).to_contain_text("Buổi cần phản hồi 1")
        expect(player.get_by_role("button", name="Đóng điểm danh buổi chơi")).to_have_count(0)
        expect(player.locator(".member-app-shell")).to_have_count(0)
        player.keyboard.press("Escape")
        expect(task(player)).to_be_visible()
        player.locator(".sg-attendance-backdrop").click(position={"x": 1, "y": 1})
        expect(task(player)).to_be_visible()
        player.get_by_role("dialog").screenshot(path=str(artifacts / "mandatory-feedback-mobile.png"))
        player.set_viewport_size({"width": 320, "height": 740})
        assert player.get_by_role("dialog").evaluate("node => node.scrollWidth <= node.clientWidth"), "Mandatory form overflows at 320px"
        player.get_by_role("dialog").screenshot(path=str(artifacts / "mandatory-feedback-narrow.png"))
        player.set_viewport_size({"width": 390, "height": 900})

        # Failed saves, reloads and direct navigation must not dismiss an unanswered task.
        failed_path = f"**/api/gamerooms/{first}/attendance/report"
        player.route(failed_path, lambda route: route.fulfill(status=503, json={"detail": "Chưa lưu được phản hồi kiểm thử"}))
        submit(player, "false", "false")
        expect(player.get_by_role("alert")).to_contain_text("Chưa lưu được phản hồi kiểm thử")
        expect(task(player)).to_be_visible()
        player.unroute(failed_path)
        player.reload(wait_until="networkidle")
        expect(task(player)).to_contain_text("Còn 2 buổi")
        player.goto(BASE + "/team", wait_until="networkidle")
        expect(task(player)).to_contain_text("Còn 2 buổi")
        submit(player, "false", "false")
        expect(task(player)).to_contain_text("Còn 1 buổi")
        expect(player.get_by_role("dialog")).to_contain_text("Buổi cần phản hồi 2")
        expect(player.get_by_label("Buổi chơi có diễn ra không?")).to_have_value("")
        player.reload(wait_until="networkidle")
        expect(task(player)).to_contain_text("Còn 1 buổi")
        submit(player)
        expect(task(player)).to_have_count(0)
        expect(player.locator(".member-app-shell")).to_be_visible()
        headers = {"Authorization": "Bearer " + fixture["identities"]["player"]["token"]}
        state = player.request.get(API + f"/api/gamerooms/{second}/attendance", headers=headers).json()
        assert state["mine"]["outcome"] == "UNVERIFIED" and not state["feedback_required"], state
        player.goto(BASE + "/home", wait_until="networkidle")
        player.reload(wait_until="networkidle")
        expect(task(player)).to_have_count(0)
        expect(player.locator(".member-app-shell")).to_be_visible()

        # Applicants who were never approved only see an expired request and can use the app.
        witness = user_page("witness", 390)
        witness.goto(BASE + f"/matches?attendance={first}", wait_until="networkidle")
        expect(witness.get_by_role("heading", name="Yêu cầu tham gia đã hết hạn", exact=True)).to_be_visible()
        expect(witness.get_by_role("dialog")).to_contain_text("không cần đánh giá")
        expect(witness.get_by_role("heading", name="Đang chờ chủ phòng duyệt", exact=True)).to_have_count(0)
        expect(task(witness)).to_have_count(0)
        witness.get_by_role("dialog").screenshot(path=str(artifacts / "expired-request-mobile.png"))
        witness.get_by_role("button", name="Đóng điểm danh buổi chơi").click()
        witness.goto(BASE + "/matches?view=joined", wait_until="networkidle")
        expect(witness.get_by_role("button", name="Xem yêu cầu", exact=True)).to_be_visible()

        host = user_page("host")
        host.goto(BASE + "/matches?view=hosted", wait_until="networkidle")
        card = host.locator(".sg-room-card").filter(has=host.get_by_role("heading", name="Buổi cần phản hồi 1", exact=True))
        card.get_by_role("button", name="Quản lý phòng", exact=True).click()
        host.get_by_role("tab", name="Yêu cầu đã hết hạn", exact=False).click()
        expect(host.get_by_role("tabpanel")).to_contain_text("Nam Người Chơi")
        expect(host.get_by_role("button", name="Duyệt vào", exact=True)).to_have_count(0)
        host.get_by_role("dialog").screenshot(path=str(artifacts / "expired-requests-host.png"))

        # A known deadline opens feedback without focus, navigation or waiting for the periodic poll.
        response = player.request.post(API + "/test/required-feedback-rooms?count=1&end_in_seconds=3")
        assert response.ok, response.text()
        deadline_id = response.json()["room_ids"][0]
        player.goto(BASE + "/matches", wait_until="networkidle")
        expect(player.locator(".member-app-shell")).to_be_visible()
        player.get_by_role("button", name="Mở phòng", exact=True).click()
        player.locator('input[name="title"]').fill("Bản nháp được giữ sau phản hồi")
        response = player.request.post(API + "/test/advance?seconds=4")
        assert response.ok, response.text()
        expect(task(player)).to_be_visible(timeout=6000)
        expect(player.locator(".member-app-shell")).to_be_hidden()
        player.set_viewport_size({"width": 1440, "height": 1000})
        player.evaluate("document.documentElement.classList.add('dark')")
        player.get_by_role("dialog").screenshot(path=str(artifacts / "mandatory-feedback-dark-desktop.png"))
        submit(player, "true", "false")
        expect(player.locator(".member-app-shell")).to_be_visible()
        expect(player.locator('input[name="title"]')).to_have_value("Bản nháp được giữ sau phản hồi")

        # A failed check at a known end time cannot leave the rest of the app usable.
        response = player.request.post(API + "/test/required-feedback-rooms?count=1&end_in_seconds=3")
        assert response.ok, response.text()
        failed_deadline_id = response.json()["room_ids"][0]
        player.reload(wait_until="networkidle")
        expect(player.locator(".member-app-shell")).to_be_visible()
        player.route("**/api/gamerooms/required-feedback", lambda route: route.fulfill(status=503, json={"detail": "Kiểm thử lỗi tại giờ kết thúc"}))
        response = player.request.post(API + "/test/advance?seconds=4")
        assert response.ok, response.text()
        expect(player.get_by_role("heading", name="Chưa tải được phản hồi sau buổi", exact=True)).to_be_visible(timeout=6000)
        expect(player.locator(".member-app-shell")).to_be_hidden()
        player.unroute("**/api/gamerooms/required-feedback")
        player.get_by_role("button", name="Thử lại", exact=True).click()
        expect(task(player)).to_be_visible()
        submit(player, "false", "false")
        expect(player.locator(".member-app-shell")).to_be_visible()

        # Initial queue errors fail closed and offer a retry rather than silently allowing navigation.
        player.route("**/api/gamerooms/required-feedback", lambda route: route.fulfill(status=503, json={"detail": "Kiểm thử mất kết nối"}))
        player.reload(wait_until="networkidle")
        expect(player.get_by_role("heading", name="Chưa tải được phản hồi sau buổi", exact=True)).to_be_visible()
        expect(player.locator(".member-app-shell")).to_have_count(0)
        player.unroute("**/api/gamerooms/required-feedback")
        player.get_by_role("button", name="Thử lại", exact=True).click()
        expect(player.locator(".member-app-shell")).to_be_visible()

        # A host alone in an ended room can submit a truthful result or cancel, without a dead end.
        host_headers = {"Authorization": "Bearer " + fixture["identities"]["host"]["token"]}
        response = host.request.put(API + f"/api/gamerooms/{deadline_id}/attendance/report", headers=host_headers, data={"occurred": False, "attended": False})
        assert response.ok, response.text()
        response = host.request.put(API + f"/api/gamerooms/{failed_deadline_id}/attendance/report", headers=host_headers, data={"occurred": False, "attended": False})
        assert response.ok, response.text()
        response = host.request.post(API + "/test/required-feedback-rooms?count=1&solo=true")
        assert response.ok, response.text()
        host.goto(BASE + "/home", wait_until="networkidle")
        expect(task(host)).to_contain_text("Còn 1 buổi")
        expect(host.get_by_label("Buổi chơi có diễn ra không?")).to_be_visible()
        submit(host, "false", "false")
        expect(host.locator(".member-app-shell")).to_be_visible()
        assert not errors, errors
        print("PASS: expired applications, mandatory multi-room feedback, save failure, reload/navigation persistence, deadline prompt, retry, and unlock without peer/admin review")
    except Exception:
        for index, context in enumerate(contexts):
            for page in context.pages:
                page.screenshot(path=str(artifacts / f"failure-{index}.png"))
                print(json.dumps({"url": page.url, "body": page.locator("body").inner_text()[-5000:]}, ensure_ascii=True))
        raise
    finally:
        for context in contexts:
            context.close()
        browser.close()
