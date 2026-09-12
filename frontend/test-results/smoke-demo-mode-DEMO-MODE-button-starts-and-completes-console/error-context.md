# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> demo mode >> DEMO MODE button starts and completes
- Location: e2e\smoke.spec.ts:56:7

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 26

- Array []
+ Array [
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Error: layers[1].paint.raster-brightness-max: 1.05 is greater than the maximum value 1
+     at pc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10563:23)
+     at fc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10554:12)
+     at yl._load (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9993:206)
+     at http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9983:77",
+   "Error: layers[1].paint.raster-brightness-max: 1.05 is greater than the maximum value 1
+     at pc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10563:23)
+     at fc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10554:12)
+     at yl._load (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9993:206)
+     at http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9983:77",
+   "Error: layers[1].paint.raster-brightness-max: 1.05 is greater than the maximum value 1
+     at pc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10563:23)
+     at fc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10554:12)
+     at yl._load (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9993:206)
+     at http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9983:77",
+   "Error: layers[1].paint.raster-brightness-max: 1.05 is greater than the maximum value 1
+     at pc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10563:23)
+     at fc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10554:12)
+     at yl._load (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9993:206)
+     at http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9983:77",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - banner [ref=f2e2]:
    - generic [ref=f2e3]:
      - generic [ref=f2e10]:
        - generic [ref=f2e11]:
          - generic [ref=f2e12]: SAGAR-DRISHTI V5
          - generic [ref=f2e13]: ICG COMMAND
        - generic [ref=f2e14]:
          - generic [ref=f2e15]: Indian Coast Guard
          - generic [ref=f2e16]: ·
          - generic [ref=f2e17]: Maritime Domain Awareness
      - generic [ref=f2e19]:
        - generic [ref=f2e21]: MISSION NOMINAL
        - generic [ref=f2e23]: DEFCON 2
    - generic [ref=f2e24]:
      - generic [ref=f2e25]:
        - generic [ref=f2e32]:
          - generic [ref=f2e33]: Sentinel-1A
          - generic [ref=f2e34]: 78mIW GRD
        - generic "Operational" [ref=f2e35]
      - generic [ref=f2e36]:
        - generic [ref=f2e44]:
          - generic [ref=f2e45]: RISAT-1A
          - generic [ref=f2e46]: 138mMRS
        - generic "Operational" [ref=f2e47]
      - generic [ref=f2e48]:
        - generic [ref=f2e53]: INCOIS
        - generic [ref=f2e54]: SYNC
      - generic [ref=f2e55]:
        - generic [ref=f2e61]: ECMWF
        - generic [ref=f2e62]: SYNC
    - generic [ref=f2e63]:
      - generic [ref=f2e68]:
        - generic [ref=f2e69]: 18:04:16 UTC
        - generic [ref=f2e70]: 23:34:16 IST
      - generic [ref=f2e71]:
        - generic [ref=f2e74]: LATENCY
        - generic [ref=f2e75]: 42 ms
      - button "DATA SIMULATED" [ref=f2e76] [cursor=pointer]
      - generic [ref=f2e78]:
        - button "DEMO MODE" [ref=f2e79] [cursor=pointer]
        - button "Reset demo state" [ref=f2e82] [cursor=pointer]
  - generic [ref=f2e86]:
    - generic [ref=f2e87]:
      - generic [ref=f2e88]: EEZ SURVEILLANCE · LEVEL 2 ELEVATED
      - generic [ref=f2e91]: "|"
      - generic [ref=f2e92]: "SAR SENSOR: SENTINEL-1A C-BAND IW"
      - generic [ref=f2e100]: "|"
      - generic [ref=f2e101]: "LEDGER: VERIFIED"
    - generic [ref=f2e106]:
      - generic [ref=f2e107]: "INCOIS + ECMWF ERA5: SYNCHRONIZED"
      - generic [ref=f2e115]: "|"
      - generic [ref=f2e116]: "INGESTION LATENCY: 42 ms"
      - generic [ref=f2e122]: "AIS CLASS A: 4,821"
  - generic [ref=f2e124]:
    - complementary [ref=f2e125]:
      - navigation [ref=f2e126]:
        - link "Operations" [ref=f2e127] [cursor=pointer]:
          - /url: /operations
        - link "SAR Investigation" [ref=f2e133] [cursor=pointer]:
          - /url: /sar/SD-2026-00421
        - link "Reverse Drift" [ref=f2e142] [cursor=pointer]:
          - /url: /drift
        - link "Attribution" [ref=f2e149] [cursor=pointer]:
          - /url: /attribution
        - link "Vessel Investigation" [ref=f2e156] [cursor=pointer]:
          - /url: /vessels/9123456
        - link "Evidence Ledger" [ref=f2e163] [cursor=pointer]:
          - /url: /evidence
        - link "Legal Dossier" [ref=f2e169] [cursor=pointer]:
          - /url: /dossier
      - link "Settings / Layers" [ref=f2e177] [cursor=pointer]:
        - /url: /settings
    - main [ref=f2e183]:
      - generic [ref=f2e184]:
        - generic [ref=f2e185]:
          - generic [ref=f2e186]:
            - generic [ref=f2e187]:
              - heading "Legal dossier" [level=1] [ref=f2e188]
              - generic [ref=f2e189]: CASE SD-2026-00421
            - paragraph [ref=f2e190]: Official case file · s.356 Merchant Shipping Act, 1958 · marine pollution
          - button "Open report" [ref=f2e191] [cursor=pointer]
        - generic [ref=f2e196]:
          - generic [ref=f2e200]: Report sealed · SD-2026-00421
          - generic [ref=f2e201]: OPEN REPORT to review the official case file
  - generic [ref=f2e206] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=f2e207]
    - generic [ref=f2e211]:
      - button "Open issues overlay" [ref=f2e212]:
        - generic [ref=f2e213]:
          - generic [aria-hidden] [ref=f2e214]: "0"
          - generic [ref=f2e215]: "1"
        - generic [ref=f2e216]: Issue
      - button "Collapse issues badge" [ref=f2e217]
  - alert [ref=f2e220]: Legal dossier
  - generic [aria-hidden] [ref=f2e221]: "270"
```

# Test source

```ts
  1   | import { test, expect, Page } from "@playwright/test";
  2   | 
  3   | const ROUTES = ["/operations", "/drift", "/attribution", "/evidence", "/dossier", "/settings", "/sar-investigation"];
  4   | const API = process.env.PLAYWRIGHT_API_URL || "http://localhost:8000";
  5   | 
  6   | async function assertPageHealthy(page: Page, route: string) {
  7   |   const errors: string[] = [];
  8   |   page.on("console", (m) => {
  9   |     if (m.type() === "error") errors.push(m.text());
  10  |   });
  11  |   page.on("pageerror", (e) => errors.push(e.message));
  12  | 
  13  |   const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
  14  |   expect(resp && resp.status(), `${route} status`).toBe(200);
  15  |   await page.waitForTimeout(2_500); // let async hydration / tiles settle
  16  |   expect(errors, `${route} console errors`).toEqual([]);
  17  | }
  18  | 
  19  | test.describe("console routes", () => {
  20  |   for (const route of ROUTES) {
  21  |     test(`${route} renders clean`, async ({ page }) => {
  22  |       await assertPageHealthy(page, route);
  23  |     });
  24  |   }
  25  | 
  26  |   test("SDS / operations shows the command summit", async ({ page }) => {
  27  |     await page.goto("/operations", { waitUntil: "domcontentloaded" });
  28  |     await expect(page.getByText("Sagar-Drishti").first()).toBeVisible();
  29  |     await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });
  30  |   });
  31  | 
  32  |   test("map canvas paints (GPU/compositing active)", async ({ page }) => {
  33  |     await page.goto("/operations", { waitUntil: "domcontentloaded" });
  34  |     const canvas = page.locator("canvas").first();
  35  |     await expect(canvas).toBeVisible();
  36  |     const painted = await canvas.evaluate((el) => {
  37  |       const c = el as HTMLCanvasElement;
  38  |       const ctx = c.getContext("webgl2") || c.getContext("webgl");
  39  |       return c.width > 0 && c.height > 0 && !!ctx;
  40  |     });
  41  |     expect(painted).toBe(true);
  42  |   });
  43  | 
  44  |   test("SAR detail route renders", async ({ page }) => {
  45  |     await page.goto("/sar/SD-2026-00421", { waitUntil: "domcontentloaded" });
  46  |     await expect(page.locator("main").first()).toBeVisible();
  47  |   });
  48  | 
  49  |   test("vessel route renders", async ({ page }) => {
  50  |     await page.goto("/vessels/9345678", { waitUntil: "domcontentloaded" });
  51  |     await expect(page.locator("main").first()).toBeVisible();
  52  |   });
  53  | });
  54  | 
  55  | test.describe("demo mode", () => {
  56  |   test("DEMO MODE button starts and completes", async ({ page }) => {
  57  |     test.setTimeout(150_000);
  58  |     const errors: string[] = [];
  59  |     page.on("console", (m) => {
  60  |       if (m.type() === "error") errors.push(m.text());
  61  |     });
  62  |     page.on("pageerror", (e) => errors.push(e.message));
  63  | 
  64  |     await page.goto("/operations", { waitUntil: "domcontentloaded" });
  65  |     // precompile the flagship route so the demo transition is instant in dev
  66  |     await page.goto("/sar-investigation", { waitUntil: "domcontentloaded" });
  67  |     await page.waitForTimeout(1_000);
  68  |     await page.goto("/operations", { waitUntil: "domcontentloaded" });
  69  |     const button = page.getByRole("button", { name: /DEMO MODE|STAGE \d\/7/ });
  70  |     await expect(button.first()).toBeVisible();
  71  |     await page.waitForTimeout(3_000); // let React hydrate before clicking
  72  |     await button.first().click();
  73  |     await expect(page.getByRole("button", { name: /STAGE/ }).first()).toBeVisible();
  74  |     await expect
  75  |       .poll(async () => page.evaluate(() => location.pathname), { timeout: 25_000 })
  76  |       .toContain("sar-investigation");
  77  |     await page.waitForTimeout(46_000);
  78  |     const stageBtn = page.getByRole("button", { name: /STAGE \d\/7/ }).first();
  79  |     const still = await stageBtn.isVisible().catch(() => false);
  80  |     expect(still).toBe(false);
> 81  |     expect(errors).toEqual([]);
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  82  |   });
  83  | });
  84  | 
  85  | test.describe("live backend wiring", () => {
  86  |   test("DATA LIVE chip reflects reachable API", async ({ page }) => {
  87  |     const reachable = await page
  88  |       .request
  89  |       .fetch(`${API}/api/v1/incidents`)
  90  |       .then((r) => r.ok())
  91  |       .catch(() => false);
  92  | 
  93  |     await page.goto("/operations", { waitUntil: "domcontentloaded" });
  94  |     const chip = page.getByText(/^DATA (LIVE|SIMULATED)$/);
  95  |     await expect(chip).toBeVisible();
  96  |     if (reachable) {
  97  |       await expect(page.getByText("DATA LIVE")).toBeVisible({ timeout: 15_000 });
  98  |     }
  99  |   });
  100 | });
```