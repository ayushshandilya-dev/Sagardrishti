# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> console routes >> /sar-investigation renders clean
- Location: e2e\smoke.spec.ts:21:9

# Error details

```
Error: /sar-investigation console errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
+   "Failed to load resource: net::ERR_CONNECTION_REFUSED",
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
        - generic [ref=e69]: 18:03:07 UTC
        - generic [ref=e70]: 23:33:07 IST
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
          - link "SAR" [ref=e186] [cursor=pointer]:
            - /url: /sar/SD-2026-00421
          - generic [ref=e190]:
            - generic [ref=e191]: SD-2026-00421
            - generic [ref=e192]: — CONFIDENCE
            - generic [ref=e193]: SENTINEL-1A · ORBIT 118 · 18.6 km²
          - generic [ref=e194]:
            - generic [ref=e195]: 10:28
            - generic [ref=e196]: 10:29
            - generic [ref=e197]: 10:30
            - generic [ref=e198]: 10:31
            - generic [ref=e199]: 10:32
            - generic [ref=e200]: POSSIBLE OIL
          - link "RK4 DRIFT" [ref=e201] [cursor=pointer]:
            - /url: /drift
          - link "OPS" [ref=e205] [cursor=pointer]:
            - /url: /operations
        - generic [ref=e210]:
          - generic [ref=e211]:
            - generic [ref=e212]:
              - generic:
                - generic:
                  - generic:
                    - generic: SENTINEL-1A
                    - generic: PASS 118 · DESCENDING
                  - generic: IW GRD · σ° 34.2° INC · 10:30:20 UTC · ORBIT 118
              - generic [ref=e213]:
                - button "CUR" [ref=e214] [cursor=pointer]
                - button "WND" [ref=e215] [cursor=pointer]
                - button "BAT" [ref=e216] [cursor=pointer]
                - button "LAN" [ref=e217] [cursor=pointer]
                - button "EEZ" [ref=e218] [cursor=pointer]
                - button "PRT" [ref=e219] [cursor=pointer]
                - button "WTH" [ref=e220] [cursor=pointer]
              - generic [ref=e221]:
                - button "Zoom in" [ref=e222] [cursor=pointer]
                - button "Zoom out" [ref=e226] [cursor=pointer]
                - button "Toggle 3D contamination volume" [ref=e230] [cursor=pointer]
                - button "Reset view" [ref=e234] [cursor=pointer]
                - button "Toggle pitch" [ref=e238] [cursor=pointer]
                - button "Fullscreen" [ref=e243] [cursor=pointer]
              - generic: STANDBY — AWAITING ACQUISITION
              - region "Map" [ref=e253]
            - generic [ref=e254]:
              - generic [ref=e255]:
                - generic [ref=e257]: SAR PRODUCT
                - generic [ref=e258]: GRD-IW · σ° VV/VH
                - generic [ref=e259]:
                  - button "Pixel inspector" [ref=e260] [cursor=pointer]
                  - button "Compare with RAW" [ref=e263] [cursor=pointer]
                  - button "Collapse product" [ref=e266] [cursor=pointer]
              - generic [ref=e270]:
                - button "RAW" [ref=e271] [cursor=pointer]
                - button "CALIBRATED" [ref=e272] [cursor=pointer]
                - button "FILTERED" [ref=e273] [cursor=pointer]
                - button "VV" [ref=e274] [cursor=pointer]
                - button "VH" [ref=e275] [cursor=pointer]
                - button "SEGMENTATION" [ref=e276] [cursor=pointer]
                - button "FINAL MASK" [ref=e277] [cursor=pointer]
              - generic [ref=e278]:
                - generic:
                  - generic: RAW · σ° [247° AZ]
                  - generic: STANDBY
          - generic [ref=e281]:
            - generic [ref=e282]:
              - generic [ref=e283]:
                - generic [ref=e284]: Incident
                - generic [ref=e285]: POSSIBLE OIL
              - generic [ref=e286]: SD-2026-00421
              - generic [ref=e287]:
                - generic [ref=e288]: 2026-09-11T10:30:20Z UTC
                - generic [ref=e289]: CRITICAL
              - generic [ref=e290]: C-Band SAR (IW Mode) · VV/VH
            - generic [ref=e291]:
              - button "AI CONFIDENCE" [ref=e292] [cursor=pointer]
              - generic [ref=e296]:
                - generic [ref=e301]:
                  - generic [ref=e302]: 0.0%
                  - generic [ref=e303]: CONFIDENCE
                - generic [ref=e304]:
                  - generic [ref=e305]: Texture
                  - generic [ref=e309]: VV/VH
                  - generic [ref=e313]: Shape
                  - generic [ref=e317]: Wind
                  - generic [ref=e321]: Current
                  - generic [ref=e325]: Prob.
            - generic [ref=e329]:
              - button "EXPLAINABILITY · 5-AXIS" [ref=e330] [cursor=pointer]
              - img [ref=e335]:
                - generic [ref=e345]: Texture
                - generic [ref=e346]: Backscatter
                - generic [ref=e347]: Morphology
                - generic [ref=e348]: Meteorology
                - generic [ref=e349]: Temporal
            - generic [ref=e350]:
              - button "GEOMETRY" [ref=e351] [cursor=pointer]
              - generic [ref=e355]:
                - generic [ref=e356]:
                  - generic [ref=e357]: AREA
                  - generic [ref=e358]: 18.6 km²
                - generic [ref=e359]:
                  - generic [ref=e360]: PERIMETER
                  - generic [ref=e361]: 31.2 km
                - generic [ref=e362]:
                  - generic [ref=e363]: COMPACTNESS
                  - generic [ref=e364]: "0.24"
                - generic [ref=e365]:
                  - generic [ref=e366]: MAJOR AXIS
                  - generic [ref=e367]: 8.4 km
                - generic [ref=e368]:
                  - generic [ref=e369]: MINOR AXIS
                  - generic [ref=e370]: 2.9 km
                - generic [ref=e371]:
                  - generic [ref=e372]: ORIENTATION
                  - generic [ref=e373]: 248.5°
                - generic [ref=e374]:
                  - generic [ref=e375]: SAMPLING
                  - generic [ref=e376]: 10 m GRD
                - generic [ref=e377]:
                  - generic [ref=e378]: CENTROID
                  - generic [ref=e379]: 21.8452N · 69.1124E
            - generic [ref=e380]:
              - button "POLARIZATION" [ref=e381] [cursor=pointer]
              - generic [ref=e385]:
                - generic [ref=e386]: VV ✓
                - generic [ref=e387]: VH ✓
                - generic [ref=e388]: damping ratio 11.0 dB
            - generic [ref=e389]:
              - button "ENVIRONMENT" [ref=e390] [cursor=pointer]
              - generic [ref=e394]:
                - generic [ref=e395]:
                  - generic [ref=e400]: WIND
                  - generic [ref=e401]: 7.2 m/s · 214°
                - generic [ref=e402]:
                  - generic [ref=e407]: CURRENT
                  - generic [ref=e408]: 0.42 m/s · 262°
                - generic [ref=e409]:
                  - generic [ref=e414]: SEA STATE
                  - generic [ref=e415]: 3 · 0.8 m
                - generic [ref=e416]:
                  - generic [ref=e419]: SST
                  - generic [ref=e420]: 28.4 °C
                - generic [ref=e421]:
                  - generic [ref=e425]: CLOUD
                  - generic [ref=e426]: 0.0 % · RADAR ALL-WEATHER
            - generic [ref=e427]:
              - button "AI EXPLANATION" [ref=e428] [cursor=pointer]
              - list [ref=e432]:
                - listitem [ref=e433]:
                  - generic [ref=e434]: ▸
                  - generic [ref=e435]: VV backscatter dips 88 relative to open-water reference — radar damping consistent with mineral film.
                - listitem [ref=e436]:
                  - generic [ref=e437]: ▸
                  - generic [ref=e438]: Dual-pol VV/VH agreement high (88/100) — biogenic slicks decouple VH.
                - listitem [ref=e439]:
                  - generic [ref=e440]: ▸
                  - generic [ref=e441]: Slick morphology 92% matches natural emplacement drift, not a circular ship-wake signature.
                - listitem [ref=e442]:
                  - generic [ref=e443]: ▸
                  - generic [ref=e444]: Texture homogeneity above threshold after speckle filtering (FILTERED pass).
                - listitem [ref=e445]:
                  - generic [ref=e446]: ▸
                  - generic [ref=e447]: "Lookalike decomposition: mineral oil 94.2% vs biogenic 2.1%."
            - generic [ref=e448]:
              - generic [ref=e449]:
                - button "EXPORT" [ref=e450] [cursor=pointer]
                - link "RK4 DRIFT" [ref=e454] [cursor=pointer]:
                  - /url: /drift
              - generic [ref=e458]:
                - generic [ref=e459]: EVIDENCE LEDGER · SD-2026-00421
                - link "VERIFY" [ref=e460] [cursor=pointer]:
                  - /url: /evidence
        - generic [ref=e462]:
          - generic [ref=e463]:
            - generic [ref=e464]:
              - button "Replay investigation" [ref=e465] [cursor=pointer]
              - img [aria-hidden] [ref=e468] [cursor=pointer]
            - generic [ref=e471]:
              - generic [ref=e472]: AWAITING ACQUISITION
              - generic [ref=e473]: POSSIBLE OIL
            - generic [ref=e474]:
              - generic [ref=e475]:
                - generic [ref=e476]: 10:28
                - generic [ref=e477]: 10:29
                - generic [ref=e478]: 10:30
                - generic [ref=e479]: 10:31
                - generic [ref=e480]: 10:32
              - slider "Timeline scrub" [ref=e481] [cursor=pointer]: "-1"
            - generic [ref=e482]: POSSIBLE OIL
          - generic [ref=e484]:
            - button "RAW" [ref=e487] [cursor=pointer]
            - button "VV" [ref=e490] [cursor=pointer]
            - button "VH" [ref=e493] [cursor=pointer]
            - button "FILTERED" [ref=e496] [cursor=pointer]
            - button "SEGMENTATION" [ref=e499] [cursor=pointer]
            - generic [ref=e502]: 7 BANDS · GRD-IW · 7 PASSES
  - button "Open Next.js Dev Tools" [ref=e508] [cursor=pointer]
  - alert [ref=e512]
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
      |                                             ^ Error: /sar-investigation console errors
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