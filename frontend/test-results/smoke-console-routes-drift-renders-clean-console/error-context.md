# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> console routes >> /drift renders clean
- Location: e2e\smoke.spec.ts:21:9

# Error details

```
Error: /drift console errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 9

- Array []
+ Array [
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Error: layers[1].paint.raster-brightness-max: 1.05 is greater than the maximum value 1
+     at pc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10563:23)
+     at fc (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl-shared_mjs_023-wcz._.js:10554:12)
+     at yl._load (http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9993:206)
+     at http://localhost:3100/_next/static/chunks/node_modules_maplibre-gl_dist_maplibre-gl_mjs_0rea-pn._.js:9983:77",
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: SAGAR-DRISHTI V5
          - generic [ref=e13]: ICG COMMAND
        - generic [ref=e14]:
          - generic [ref=e15]: Indian Coast Guard
          - generic [ref=e16]: ·
          - generic [ref=e17]: Maritime Domain Awareness
      - generic [ref=e19]:
        - generic [ref=e21]: MISSION NOMINAL
        - generic [ref=e23]: DEFCON 2
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e32]:
          - generic [ref=e33]: Sentinel-1A
          - generic [ref=e34]: 117mIW GRD
        - generic "Operational" [ref=e35]
      - generic [ref=e36]:
        - generic [ref=e44]:
          - generic [ref=e45]: RISAT-1A
          - generic [ref=e46]: 138mMRS
        - generic "Operational" [ref=e47]
      - generic [ref=e48]:
        - generic [ref=e53]: INCOIS
        - generic [ref=e54]: SYNC
      - generic [ref=e55]:
        - generic [ref=e61]: ECMWF
        - generic [ref=e62]: SYNC
    - generic [ref=e63]:
      - generic [ref=e68]:
        - generic [ref=e69]: 18:02:43 UTC
        - generic [ref=e70]: 23:32:43 IST
      - generic [ref=e71]:
        - generic [ref=e74]: LATENCY
        - generic [ref=e75]: 42 ms
      - button "DATA SIMULATED" [ref=e76] [cursor=pointer]
      - generic [ref=e78]:
        - button "DEMO MODE" [ref=e79] [cursor=pointer]
        - button "Reset demo state" [ref=e82] [cursor=pointer]
  - generic [ref=e86]:
    - generic [ref=e87]:
      - generic [ref=e88]: EEZ SURVEILLANCE · LEVEL 2 ELEVATED
      - generic [ref=e91]: "|"
      - generic [ref=e92]: "SAR SENSOR: SENTINEL-1A C-BAND IW"
      - generic [ref=e100]: "|"
      - generic [ref=e101]: "LEDGER: VERIFIED"
    - generic [ref=e106]:
      - generic [ref=e107]: "INCOIS + ECMWF ERA5: SYNCHRONIZED"
      - generic [ref=e115]: "|"
      - generic [ref=e116]: "INGESTION LATENCY: 42 ms"
      - generic [ref=e122]: "AIS CLASS A: 4,821"
  - generic [ref=e124]:
    - complementary [ref=e125]:
      - navigation [ref=e126]:
        - link "Operations" [ref=e127] [cursor=pointer]:
          - /url: /operations
        - link "SAR Investigation" [ref=e133] [cursor=pointer]:
          - /url: /sar/SD-2026-00421
        - link "Reverse Drift" [ref=e142] [cursor=pointer]:
          - /url: /drift
        - link "Attribution" [ref=e150] [cursor=pointer]:
          - /url: /attribution
        - link "Vessel Investigation" [ref=e157] [cursor=pointer]:
          - /url: /vessels/9123456
        - link "Evidence Ledger" [ref=e164] [cursor=pointer]:
          - /url: /evidence
        - link "Legal Dossier" [ref=e170] [cursor=pointer]:
          - /url: /dossier
      - link "Settings / Layers" [ref=e177] [cursor=pointer]:
        - /url: /settings
    - main [ref=e183]:
      - generic [ref=e184]:
        - generic [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]:
              - heading "Reverse drift reconstruction" [level=1] [ref=e188]
              - generic [ref=e189]: RK4 · BACKTRACK
            - paragraph [ref=e190]: Trajectory backtrack for SD-2026-00421 · observation 2026-09-11T10:30:20Z UTC
          - generic [ref=e191]:
            - generic [ref=e192]: 21.912°N 69.248°E @ T−0h
            - link "Assign to vessels" [ref=e197] [cursor=pointer]:
              - /url: /attribution
        - generic [ref=e200]:
          - generic [ref=e201]:
            - region "Map" [ref=e203]
            - generic:
              - generic:
                - generic: SENTINEL-1A
                - generic: 18:02:44Z
              - generic:
                - generic:
                  - generic: ORBIT
                  - generic: "#118 · 693 KM"
                - generic:
                  - generic: INCIDENCE
                  - generic: 34.2°
                - generic:
                  - generic: POLARIZATION
                  - generic: VV + VH
                - generic:
                  - generic: RESOLUTION
                  - generic: 10 M
                - generic:
                  - generic: ACQUISITION
                  - generic: 10:30:20Z
              - generic:
                - generic:
                  - generic: SEA STATE
                  - generic: 2 · SLIGHT
                - generic:
                  - generic: WIND
                  - generic: 12 KN · 252°
                - generic:
                  - generic: CURRENT
                  - generic: 1.0 KN · 235°
            - generic:
              - button "AIS" [pressed] [ref=e204] [cursor=pointer]
              - button "EEZ" [pressed] [ref=e206] [cursor=pointer]
              - button "Oil slick" [pressed] [ref=e208] [cursor=pointer]
              - button "Drift" [pressed] [ref=e210] [cursor=pointer]
              - button "Weather" [pressed] [ref=e212] [cursor=pointer]
              - button "Currents" [pressed] [ref=e214] [cursor=pointer]
              - button "Shipping" [pressed] [ref=e216] [cursor=pointer]
              - button "Bathymetry" [pressed] [ref=e218] [cursor=pointer]
              - button "Coastline" [pressed] [ref=e220] [cursor=pointer]
              - button "Sentinel" [pressed] [ref=e222] [cursor=pointer]
            - generic: © Esri · World Imagery
            - generic: 21.845°N, 69.112°E · Z8.0
            - generic [ref=e224]:
              - button "Zoom in" [ref=e225] [cursor=pointer]
              - button "Zoom out" [ref=e229] [cursor=pointer]
              - button "Reset view" [ref=e233] [cursor=pointer]
          - generic [ref=e238]:
            - generic [ref=e239]:
              - generic [ref=e240]: Reconstructed origin
              - generic "2nd-order Runge–Kutta backtrack" [ref=e243]: RK4 · 91%
            - generic [ref=e244]:
              - generic [ref=e245]:
                - generic [ref=e246]: Coordinate
                - generic [ref=e247]: 21.9120°N 69.2480°E
              - generic [ref=e248]:
                - generic [ref=e249]: Discharge window
                - generic [ref=e250]: 2026-09-10T22:30:00Z ± 0 km
              - generic [ref=e251]:
                - generic [ref=e252]: Recovered path
                - generic [ref=e253]: 21.845°N, 69.112°E ← 21.912°N, 69.248°E
              - generic [ref=e254]:
                - generic [ref=e255]: Duration
                - generic [ref=e256]: 12 h
              - generic [ref=e257]: Forcing at origin
              - generic [ref=e262]:
                - generic [ref=e263]: Current
                - generic [ref=e264]: 0.54 m/s · 235°
              - generic [ref=e268]:
                - generic [ref=e269]: Wind
                - generic [ref=e270]: 6.1 m/s · 252°
              - generic [ref=e275]:
                - generic [ref=e276]: Uncertainty
                - generic [ref=e277]: σ 0.45 km
              - generic [ref=e278]:
                - generic [ref=e279]: Model provenance
                - generic [ref=e280]:
                  - generic [ref=e281]: 3.5% windage with 12° Northern-Hemisphere Coriolis deflection
                  - generic [ref=e285]: RK4 step 300 s · INCOIS Coastal Forecast System (0.083°) / ECMWF ERA5 10m Reanalysis (0.25°)
          - generic:
            - button "AIS" [pressed] [ref=e289] [cursor=pointer]
            - button "EEZ" [pressed] [ref=e291] [cursor=pointer]
            - button "Oil slick" [pressed] [ref=e293] [cursor=pointer]
            - button "Drift" [pressed] [ref=e295] [cursor=pointer]
            - button "Weather" [pressed] [ref=e297] [cursor=pointer]
            - button "Currents" [pressed] [ref=e299] [cursor=pointer]
            - button "Shipping" [pressed] [ref=e301] [cursor=pointer]
            - button "Bathymetry" [pressed] [ref=e303] [cursor=pointer]
            - button "Coastline" [pressed] [ref=e305] [cursor=pointer]
            - button "Sentinel" [pressed] [ref=e307] [cursor=pointer]
          - generic [ref=e309]:
            - generic [ref=e310]:
              - button "NOW" [ref=e311] [cursor=pointer]
              - button "−1h" [ref=e312] [cursor=pointer]
              - button "−3h" [ref=e313] [cursor=pointer]
              - button "−6h" [ref=e314] [cursor=pointer]
              - button "−9h" [ref=e315] [cursor=pointer]
              - button "−12h" [ref=e316] [cursor=pointer]
            - button "Play" [ref=e317] [cursor=pointer]
            - button "Reset" [ref=e320] [cursor=pointer]
            - generic [ref=e324]:
              - button "0.5×" [ref=e325] [cursor=pointer]
              - button "1×" [ref=e326] [cursor=pointer]
              - button "2×" [ref=e327] [cursor=pointer]
            - slider "Drift timeline" [ref=e328] [cursor=pointer]: "0"
            - generic [ref=e329]:
              - generic [ref=e330]:
                - generic [ref=e331]: ORIGIN
                - generic [ref=e332]: 21.912, 69.248
              - generic [ref=e333]:
                - generic [ref=e334]: OBS
                - generic [ref=e335]: 21.845, 69.112
              - generic [ref=e336]: T−0h estimate
  - generic [ref=e341] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e342]
    - generic [ref=e346]:
      - button "Open issues overlay" [ref=e347]:
        - generic [ref=e348]:
          - generic [aria-hidden] [ref=e349]: "0"
          - generic [ref=e350]: "1"
        - generic [ref=e351]: Issue
      - button "Collapse issues badge" [ref=e352]
  - alert [ref=e355]
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
> 16  |   expect(errors, `${route} console errors`).toEqual([]);
      |                                             ^ Error: /drift console errors
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
  81  |     expect(errors).toEqual([]);
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