"""Reputation presentation checks using the disposable attendance fixture and mocked summaries."""
import argparse
import json
import os
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright


parser = argparse.ArgumentParser()
parser.add_argument("--artifacts", default=os.path.join(os.environ.get("TEMP", "."), "sportgo-reputation-browser"))
args = parser.parse_args()
artifacts = Path(args.artifacts)
artifacts.mkdir(parents=True, exist_ok=True)
BASE = "http://127.0.0.1:5178"
API = "http://127.0.0.1:8018"
fixture = json.load(urlopen(API + "/test/state", timeout=5))
token = fixture["identities"]["player"]["token"]
base = {
    "score": None, "verified_attended": 0, "no_shows": 0, "sample_count": 0,
    "minimum_samples": 5, "window_days": 180, "early_cancellations": 0,
    "late_cancellations": 0, "supplemental_attended": 0, "eligible_commitments": 0,
    "verified_committed_attendance": 0, "no_show_rate": None, "hosted_sessions": 0,
    "cancelled_hosted_sessions": 0,
}
scenarios = {
    "empty": base,
    "building": {**base, "verified_attended": 1, "sample_count": 1, "eligible_commitments": 1,
                 "verified_committed_attendance": 1, "no_show_rate": 0},
    "building-with-absence": {**base, "verified_attended": 1, "no_shows": 2, "sample_count": 3,
                              "eligible_commitments": 4, "verified_committed_attendance": 1, "no_show_rate": 50},
    "rated": {**base, "score": 80, "verified_attended": 8, "no_shows": 2, "sample_count": 10,
              "eligible_commitments": 10, "verified_committed_attendance": 8, "no_show_rate": 20,
              "late_cancellations": 1, "early_cancellations": 2, "supplemental_attended": 2,
              "hosted_sessions": 3, "cancelled_hosted_sessions": 1},
    "zero-score": {**base, "score": 0, "no_shows": 5, "sample_count": 5,
                   "eligible_commitments": 5, "no_show_rate": 100},
}


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    errors = []
    checks = 0
    try:
        for theme in ("light", "dark"):
            for width in (1440, 390):
                context = browser.new_context(viewport={"width": width, "height": 1000})
                try:
                    context.add_init_script("localStorage.setItem('token', " + json.dumps(token) + ");")
                    context.add_init_script("localStorage.setItem('theme', " + json.dumps(theme) + ");")
                    context.route("**/*", lambda route: route.continue_()
                                  if route.request.url.startswith((BASE, API, "data:", "blob:")) else route.abort())
                    page = context.new_page()
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    current = {"summary": base}
                    page.route("**/api/reputation/users/*", lambda route: route.fulfill(
                        status=200, content_type="application/json", body=json.dumps(current["summary"]),
                    ))
                    for name, data in scenarios.items():
                        current["summary"] = data
                        page.goto(BASE + "/home", wait_until="networkidle")
                        panel = page.get_by_role("region", name="Uy tín tham gia", exact=True)
                        expect(panel.locator(".sg-reputation-score")).to_be_visible()
                        expect(panel.get_by_text("180 ngày gần nhất", exact=True)).to_be_visible()
                        panel.screenshot(path=str(artifacts / f"reputation-{name}-{theme}-{width}.png"), animations="disabled")
                        assert panel.evaluate("node => node.scrollWidth <= node.clientWidth"), (theme, width, name, "overflow")
                        assert panel.bounding_box()["width"] <= width, (theme, width, name, "panel width")
                        expect(panel.locator(".sg-reputation-result.is-attended dd")).to_contain_text(str(data["verified_attended"]))
                        expect(panel.get_by_role("link", name="Xem lịch sử tham gia", exact=True)).to_have_attribute("href", "/matches?view=joined")
                        expect(panel.get_by_text("Không trừ điểm", exact=True)).to_be_visible()
                        if data["score"] is None:
                            expect(panel.get_by_role("progressbar")).to_have_attribute("value", str(data["sample_count"]))
                            expect(panel.get_by_role("progressbar")).to_have_attribute("max", "5")
                            expect(panel.locator(".sg-reputation-score-value > strong")).to_have_text(str(data["sample_count"]))
                            expect(panel.locator(".sg-reputation-score > p")).to_contain_text(f'{5 - data["sample_count"]} buổi có kết quả')
                        else:
                            expect(panel.get_by_role("progressbar")).to_have_count(0)
                            expect(panel.locator(".sg-reputation-score-value > strong")).to_have_text(str(data["score"]))
                            expect(panel.locator(".sg-reputation-score-label")).to_have_text("Điểm uy tín của bạn")
                        details = panel.locator("details")
                        assert details.get_attribute("open") is None
                        details.locator("summary").focus()
                        page.keyboard.press("Enter")
                        expect(details).to_have_attribute("open", "")
                        expect(panel.locator(".sg-reputation-formula")).to_contain_text("Tổng số buổi có kết quả")
                        if name == "empty":
                            expect(panel.get_by_text("Chưa có cam kết ở buổi đã xác minh", exact=True)).to_be_visible()
                        if name == "rated":
                            expect(panel.locator(".sg-reputation-cancellations")).to_contain_text("1 lần hủy sát giờ")
                            expect(panel.locator(".sg-reputation-cancellations")).to_contain_text("2 lần hủy sớm")
                        checks += 1
                    if theme == "light" and width == 390:
                        current["summary"] = scenarios["building"]
                        for size in (320, 768):
                            page.set_viewport_size({"width": size, "height": 1000})
                            page.goto(BASE + "/home", wait_until="networkidle")
                            panel = page.get_by_role("region", name="Uy tín tham gia", exact=True)
                            expect(panel.get_by_role("progressbar")).to_be_visible()
                            assert panel.evaluate("node => node.scrollWidth <= node.clientWidth"), size
                            panel.screenshot(path=str(artifacts / f"reputation-building-light-{size}.png"), animations="disabled")
                finally:
                    context.close()
        assert not errors, errors
        print(f"PASS: {checks} reputation scenarios across light/dark and desktop/mobile; narrow screen, keyboard details, zero score and qualifying-sample progress")
    finally:
        browser.close()
