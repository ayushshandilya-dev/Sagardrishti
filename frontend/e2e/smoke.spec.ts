import { test, expect, Page } from "@playwright/test";

const ROUTES = ["/operations", "/drift", "/attribution", "/evidence", "/dossier", "/settings", "/sar-investigation"];
const API = process.env.PLAYWRIGHT_API_URL || "http://localhost:8000";

async function assertPageHealthy(page: Page, route: string) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));

  const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(resp && resp.status(), `${route} status`).toBe(200);
  await page.waitForTimeout(2_500); // let async hydration / tiles settle
  expect(errors, `${route} console errors`).toEqual([]);
}

test.describe("console routes", () => {
  for (const route of ROUTES) {
    test(`${route} renders clean`, async ({ page }) => {
      await assertPageHealthy(page, route);
    });
  }

  test("SDS / operations shows the command summit", async ({ page }) => {
    await page.goto("/operations", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sagar-Drishti").first()).toBeVisible();
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });
  });

  test("map canvas paints (GPU/compositing active)", async ({ page }) => {
    await page.goto("/operations", { waitUntil: "domcontentloaded" });
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    const painted = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const ctx = c.getContext("webgl2") || c.getContext("webgl");
      return c.width > 0 && c.height > 0 && !!ctx;
    });
    expect(painted).toBe(true);
  });

  test("SAR detail route renders", async ({ page }) => {
    await page.goto("/sar/SD-2026-00421", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
  });

  test("vessel route renders", async ({ page }) => {
    await page.goto("/vessels/9345678", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main").first()).toBeVisible();
  });
});

test.describe("demo mode", () => {
  test("DEMO MODE button starts and completes", async ({ page }) => {
    test.setTimeout(150_000);
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/operations", { waitUntil: "domcontentloaded" });
    // precompile the flagship route so the demo transition is instant in dev
    await page.goto("/sar-investigation", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_000);
    await page.goto("/operations", { waitUntil: "domcontentloaded" });
    const button = page.getByRole("button", { name: /DEMO MODE|STAGE \d\/7/ });
    await expect(button.first()).toBeVisible();
    await page.waitForTimeout(3_000); // let React hydrate before clicking
    await button.first().click();
    await expect(page.getByRole("button", { name: /STAGE/ }).first()).toBeVisible();
    await expect
      .poll(async () => page.evaluate(() => location.pathname), { timeout: 25_000 })
      .toContain("sar-investigation");
    await page.waitForTimeout(46_000);
    const stageBtn = page.getByRole("button", { name: /STAGE \d\/7/ }).first();
    const still = await stageBtn.isVisible().catch(() => false);
    expect(still).toBe(false);
    expect(errors).toEqual([]);
  });
});

test.describe("live backend wiring", () => {
  test("DATA LIVE chip reflects reachable API", async ({ page }) => {
    const reachable = await page
      .request
      .fetch(`${API}/api/v1/incidents`)
      .then((r) => r.ok())
      .catch(() => false);

    await page.goto("/operations", { waitUntil: "domcontentloaded" });
    const chip = page.getByText(/^DATA (LIVE|SIMULATED)$/);
    await expect(chip).toBeVisible();
    if (reachable) {
      await expect(page.getByText("DATA LIVE")).toBeVisible({ timeout: 15_000 });
    }
  });
});