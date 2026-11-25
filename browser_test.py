"""Browser release checks. Run with Python and Playwright installed."""
import os
import unittest
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("RZ_URL", "http://127.0.0.1:8000/")
BROWSER = os.environ.get("RZ_BROWSER", "chromium")

class GameBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = getattr(cls.pw, BROWSER).launch()

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1440, "height": 900})
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("console", lambda msg: self.errors.append(msg.text) if msg.type == "error" else None)
        self.page.goto(BASE, wait_until="networkidle")
        expect(self.page.locator("#node-ws1")).to_be_visible()

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def start(self, mode):
        self.page.locator("#new").click()
        expect(self.page.locator("#setup")).to_be_visible()
        self.page.locator("#difficulty").select_option(mode)
        self.page.get_by_role("button", name="Deploy response team").click()
        expect(self.page.locator("#setup")).not_to_be_visible()
        expect(self.page.locator("#incident")).to_have_text(mode.upper())

    def action(self, machine, action):
        self.page.locator("#node-" + machine).click()
        button = self.page.locator('[data-action="' + action + '"]')
        expect(button).to_be_enabled()
        button.click()

    def advance(self):
        self.page.locator("#next").click()

    def test_initial_controls_and_help(self):
        p = self.page
        expect(p.locator(".node")).to_have_count(10)
        expect(p.locator("#links line")).to_have_count(15)
        expect(p.locator("#status")).to_have_text("CLOCK PAUSED")
        expect(p.locator("#ap")).to_have_text("4 / 4")
        expect(p.locator('[data-action="restore"]')).to_be_disabled()
        p.locator("#help").click()
        expect(p.locator("#manual")).to_be_visible()
        p.get_by_role("button", name="Close manual").click()
        expect(p.locator("#manual")).not_to_be_visible()
        p.locator("#new").click()
        p.get_by_role("button", name="Cancel", exact=True).click()
        expect(p.locator("#incident")).to_have_text("STANDARD")

    def test_victory_recovery_and_persistence(self):
        p = self.page
        self.start("rookie")
        self.action("vault", "seal")
        self.action("ws1", "isolate")
        self.action("ws1", "restore")
        expect(p.locator("#ap")).to_have_text("0 / 4")
        expect(p.locator("#node-ws1")).to_have_class("node clean isolated selected")
        self.advance()
        self.action("ws1", "reconnect")
        self.action("ws3", "harden")
        self.action("ws4", "harden")
        expect(p.locator("#online")).to_have_text("100%")
        for _ in range(9):
            self.advance()
        expect(p.locator("#result")).to_be_visible()
        expect(p.locator("#result-title")).to_have_text("Incident contained")
        self.assertGreater(int(p.evaluate("localStorage.getItem('rz-best-rookie')")), 0)
        p.get_by_role("button", name="Review incident").click()
        expect(p.locator("#next")).to_be_disabled()
        p.reload()
        self.assertGreater(int(p.evaluate("localStorage.getItem('rz-best-rookie')")), 0)

    def test_failure_and_restart(self):
        p = self.page
        self.start("expert")
        for _ in range(26):
            self.advance()
        expect(p.locator("#result-title")).to_have_text("Recovery deadline missed")
        expect(p.locator("#clock")).to_have_text("00:00")
        p.locator("#result").get_by_role("button", name="New incident").click()
        expect(p.locator("#setup")).to_be_visible()
        p.locator("#difficulty").select_option("standard")
        p.get_by_role("button", name="Deploy response team").click()
        expect(p.locator("#turn")).to_have_text("Cycle 0 / 25")

    def test_clock_pause_resume(self):
        p = self.page
        p.clock.install()
        p.locator("#pause").click()
        p.clock.run_for(5100)
        expect(p.locator("#turn")).to_have_text("Cycle 1 / 25")
        p.locator("#pause").click()
        p.clock.run_for(11000)
        expect(p.locator("#turn")).to_have_text("Cycle 1 / 25")
        self.advance()
        expect(p.locator("#turn")).to_have_text("Cycle 2 / 25")

    def test_responsive_and_keyboard(self):
        p = self.page
        for width in (320, 390, 768, 1440):
            p.set_viewport_size({"width": width, "height": 900})
            self.assertTrue(p.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            for node in p.locator(".node").all():
                expect(node).to_be_visible()
        p.locator("#node-vault").focus()
        p.keyboard.press("Enter")
        expect(p.locator("#node-vault")).to_have_attribute("aria-pressed", "true")
        expect(p.locator("#asset h4")).to_have_text("Backup vault")

if __name__ == "__main__":
    unittest.main(verbosity=2)
