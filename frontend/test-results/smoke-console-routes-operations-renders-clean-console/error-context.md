# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> console routes >> /operations renders clean
- Location: e2e\smoke.spec.ts:21:9

# Error details

```
Error: /operations console errors

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
        - generic [ref=e69]: 18:02:39 UTC
        - generic [ref=e70]: 23:32:39 IST
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
        - link "SAR Investigation" [ref=e134] [cursor=pointer]:
          - /url: /sar/SD-2026-00421
        - link "Reverse Drift" [ref=e143] [cursor=pointer]:
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
              - heading "Operations" [level=1] [ref=e188]
              - generic [ref=e189]: INDIAN OCEAN COASTAL WATCH
            - paragraph [ref=e190]: Multi-sensor surface monitoring · live COP
          - generic [ref=e191]:
            - generic [ref=e192]: LIVE
            - generic [ref=e194]: 2 incidents
        - generic [ref=e200]:
          - generic [ref=e202]:
            - generic [ref=e204]: Active incidents
            - generic [ref=e205]: "2"
            - generic [ref=e207]: SD-2026-00421 · SD-2026-00389
          - generic [ref=e208]:
            - generic [ref=e210]: SAR passes
            - generic [ref=e211]:
              - generic [ref=e212]: "24"
              - generic [ref=e213]: / 24 h
            - generic [ref=e214]: Sentinel-1A · RISAT-1A
          - generic [ref=e215]:
            - generic [ref=e217]: AIS vessels tracked
            - generic [ref=e218]: 4,821
            - generic [ref=e220]: Arabian Sea · Gulf of Kutch
          - generic [ref=e221]:
            - generic [ref=e223]: EEZ coverage
            - generic [ref=e224]:
              - generic [ref=e225]: "2"
              - generic [ref=e226]: M km²
            - generic [ref=e227]: 98.2 % taskable
        - generic [ref=e228]:
          - generic [ref=e229]:
            - generic [ref=e230]:
              - region "Map" [ref=e232]
              - generic:
                - generic:
                  - generic: SENTINEL-1A
                  - generic: 18:02:39Z
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
                - button "AIS" [pressed] [ref=e233] [cursor=pointer]
                - button "EEZ" [pressed] [ref=e235] [cursor=pointer]
                - button "Oil slick" [pressed] [ref=e237] [cursor=pointer]
                - button "Drift" [ref=e239] [cursor=pointer]
                - button "Weather" [pressed] [ref=e241] [cursor=pointer]
                - button "Currents" [pressed] [ref=e243] [cursor=pointer]
                - button "Shipping" [pressed] [ref=e245] [cursor=pointer]
                - button "Bathymetry" [pressed] [ref=e247] [cursor=pointer]
                - button "Coastline" [pressed] [ref=e249] [cursor=pointer]
                - button "Sentinel" [pressed] [ref=e251] [cursor=pointer]
              - generic: © Esri · World Imagery
              - generic: 21.845°N, 69.112°E · Z8.0
              - generic [ref=e253]:
                - button "Zoom in" [ref=e254] [cursor=pointer]
                - button "Zoom out" [ref=e258] [cursor=pointer]
                - button "Reset view" [ref=e262] [cursor=pointer]
            - generic:
              - button "AIS" [pressed] [ref=e266] [cursor=pointer]
              - button "EEZ" [pressed] [ref=e268] [cursor=pointer]
              - button "Oil slick" [pressed] [ref=e270] [cursor=pointer]
              - button "Drift" [ref=e272] [cursor=pointer]
              - button "Weather" [pressed] [ref=e274] [cursor=pointer]
              - button "Currents" [pressed] [ref=e276] [cursor=pointer]
              - button "Shipping" [pressed] [ref=e278] [cursor=pointer]
              - button "Bathymetry" [pressed] [ref=e280] [cursor=pointer]
              - button "Coastline" [pressed] [ref=e282] [cursor=pointer]
              - button "Sentinel" [pressed] [ref=e284] [cursor=pointer]
            - generic [ref=e287]:
              - generic [ref=e288]:
                - generic [ref=e289]:
                  - generic [ref=e290]: SD-2026-00421
                  - generic [ref=e291]: 2026-09-11 · 10:30 UTC
                - generic [ref=e292]: 94.2%
              - generic [ref=e293]:
                - generic [ref=e294]:
                  - generic [ref=e295]: Classification
                  - generic [ref=e296]: Mineral oil sheen
                - generic [ref=e297]:
                  - generic [ref=e298]:
                    - generic [ref=e299]: Slick area
                    - generic [ref=e300]: 18.6 km²
                  - generic [ref=e301]:
                    - generic [ref=e302]: Detection
                    - generic [ref=e303]: 10:30 UTC
                - generic [ref=e304]: 21.8452°N 69.1124°E
              - generic [ref=e309]:
                - link "Open SAR investigation" [ref=e310] [cursor=pointer]:
                  - /url: /sar/SD-2026-00421
                - link "Run reverse drift" [ref=e314] [cursor=pointer]:
                  - /url: /drift
          - complementary [ref=e319]:
            - generic [ref=e320]:
              - generic [ref=e321]: INCIDENT REGISTRY
              - generic [ref=e322]: "2"
            - generic [ref=e323]:
              - button "SD-2026-00421 CRITICAL SENTINEL-1A · GRD-IW 21.845°N 69.112°E 10:30 UTC Open SAR investigation →" [ref=e324] [cursor=pointer]:
                - generic [ref=e325]:
                  - generic [ref=e326]: SD-2026-00421
                  - generic [ref=e329]: CRITICAL
                - generic [ref=e330]: SENTINEL-1A · GRD-IW
                - generic [ref=e338]:
                  - generic [ref=e342]: 21.845°N 69.112°E
                  - generic [ref=e343]: 10:30 UTC
                - link "Open SAR investigation →" [ref=e345]:
                  - /url: /sar/SD-2026-00421
              - button "SD-2026-00389 MAJOR SENTINEL-1B · GRD-IW 19.232°N 72.854°E 14:45 UTC" [ref=e346] [cursor=pointer]:
                - generic [ref=e347]:
                  - generic [ref=e348]: SD-2026-00389
                  - generic [ref=e351]: MAJOR
                - generic [ref=e352]: SENTINEL-1B · GRD-IW
                - generic [ref=e360]:
                  - generic [ref=e364]: 19.232°N 72.854°E
                  - generic [ref=e365]: 14:45 UTC
  - generic [ref=e370] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e371]
    - generic [ref=e375]:
      - button "Open issues overlay" [ref=e376]:
        - generic [ref=e377]:
          - generic [aria-hidden] [ref=e378]: "0"
          - generic [ref=e379]: "1"
        - generic [ref=e380]: Issue
      - button "Collapse issues badge" [ref=e381]
  - alert [ref=e384]
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
      |                                             ^ Error: /operations console errors
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