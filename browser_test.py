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

    def test_expansion_assets_evidence_and_commands(self):
        p = self.page
        self.start("rookie")
        self.action("ws1", "scan")
        self.action("ws1", "preserve")
        expect(p.locator("#evidence-count")).to_have_text("2")
        expect(p.locator("#evidence")).to_contain_text("Forensic snapshot preserved")
        expect(p.locator("#achievements")).to_contain_text("Evidence custodian")
        p.locator("#reserve").click()
        expect(p.locator("#reserve")).to_be_disabled()
        p.locator("#briefing").click()
        expect(p.locator("#briefing")).to_be_disabled()
        expect(p.locator("#briefing-count")).to_have_text("1")
        p.locator("#list-view").click()
        p.locator("#asset-filter").select_option("compromised")
        expect(p.locator("#inventory button")).to_have_count(1)
        p.locator("#asset-search").fill("Finance")
        expect(p.locator("#inventory button")).to_have_count(1)
        p.locator("#asset-search").fill("unknown")
        expect(p.locator("#inventory button")).to_have_count(0)
        p.locator("#asset-search").fill("")
        p.locator("#asset-filter").select_option("all")
        p.locator("#map-view").click()
        expect(p.locator("#map")).to_be_visible()
        p.locator("#node-ws1").click()
        p.get_by_text("Network segmentation", exact=True).click()
        p.locator("#segments button").first.click()
        expect(p.locator("#segments button").first).to_contain_text("Reopen")
        p.locator("#log-filter").select_option("success")
        p.locator("#log-search").fill("segmented")
        expect(p.locator("#logs")).to_contain_text("segmented")
        p.locator("#export-report").click()
        expect(p.locator("#report-text")).to_have_value(__import__("re").compile("Evidence items: 2"))
        p.locator("#report-dialog").get_by_role("button", name="Close", exact=True).click()

    def test_daily_save_resume_and_speed(self):
        p = self.page
        p.locator("#daily").click()
        expect(p.locator("#difficulty")).to_have_value("standard")
        seed = p.locator("#seed").input_value()
        self.assertTrue(seed.isdigit())
        p.get_by_role("button", name="Deploy response team").click()
        expect(p.locator("#seed-display")).to_have_text("Seed " + seed)
        self.action("ws1", "isolate")
        self.advance()
        p.reload()
        expect(p.locator("#turn")).to_have_text("Cycle 1 / 25")
        expect(p.locator("#node-ws1")).to_have_class(__import__("re").compile("isolated"))
        p.locator("#speed").select_option("2500")
        p.clock.install()
        p.locator("#pause").click()
        p.clock.run_for(2600)
        expect(p.locator("#turn")).to_have_text("Cycle 2 / 25")
        p.locator("#pause").click()
        p.locator("#hints").uncheck()
        expect(p.locator("#hint-text")).to_have_text("Hints disabled")

    def test_campaign_and_career_record(self):
        p = self.page
        p.locator("#new").click()
        p.locator("#difficulty").select_option("rookie")
        p.locator("#seed").fill("42")
        p.locator("#campaign-mode").check()
        p.get_by_role("button", name="Deploy response team").click()
        self.action("vault", "seal")
        self.action("ws1", "isolate")
        self.action("ws1", "restore")
        self.advance()
        self.action("ws1", "reconnect")
        self.action("ws3", "harden")
        self.action("ws4", "harden")
        for _ in range(9):
            self.advance()
        expect(p.locator("#campaign-progress")).to_have_text("1 / 6 missions completed")
        expect(p.locator("#recent-results")).to_contain_text("First response")
        p.locator("#continue-campaign").click()
        expect(p.locator("#incident")).to_have_text("STANDARD")
        expect(p.locator("#seed-display")).to_have_text("Seed 42")

if __name__ == "__main__":
    unittest.main(verbosity=2)
