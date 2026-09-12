# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> console routes >> /attribution renders clean
- Location: e2e\smoke.spec.ts:21:9

# Error details

```
Error: /attribution console errors

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
        - generic [ref=e69]: 18:02:49 UTC
        - generic [ref=e70]: 23:32:49 IST
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
        - link "Attribution" [ref=e149] [cursor=pointer]:
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
        - generic [ref=e186]:
          - generic [ref=e187]:
            - heading "Vessel attribution" [level=1] [ref=e188]
            - generic [ref=e189]: RANK-1 PRIMARY
          - paragraph [ref=e190]: Ranking vessels against reconstructed origin · SD-2026-00421 · closest approach vs T−10:30 drop window
        - generic [ref=e191]:
          - generic [ref=e192]:
            - generic [ref=e193]:
              - region "Map" [ref=e195]
              - generic:
                - generic:
                  - generic: SENTINEL-1A
                  - generic: 18:02:49Z
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
                - button "AIS" [pressed] [ref=e196] [cursor=pointer]
                - button "EEZ" [pressed] [ref=e198] [cursor=pointer]
                - button "Oil slick" [pressed] [ref=e200] [cursor=pointer]
                - button "Drift" [ref=e202] [cursor=pointer]
                - button "Weather" [pressed] [ref=e204] [cursor=pointer]
                - button "Currents" [pressed] [ref=e206] [cursor=pointer]
                - button "Shipping" [pressed] [ref=e208] [cursor=pointer]
                - button "Bathymetry" [pressed] [ref=e210] [cursor=pointer]
                - button "Coastline" [pressed] [ref=e212] [cursor=pointer]
                - button "Sentinel" [pressed] [ref=e214] [cursor=pointer]
              - generic: © Esri · World Imagery
              - generic: 21.845°N, 69.112°E · Z8.0
              - generic [ref=e216]:
                - button "Zoom in" [ref=e217] [cursor=pointer]
                - button "Zoom out" [ref=e221] [cursor=pointer]
                - button "Reset view" [ref=e225] [cursor=pointer]
            - generic:
              - button "AIS" [pressed] [ref=e229] [cursor=pointer]
              - button "EEZ" [pressed] [ref=e231] [cursor=pointer]
              - button "Oil slick" [pressed] [ref=e233] [cursor=pointer]
              - button "Drift" [ref=e235] [cursor=pointer]
              - button "Weather" [pressed] [ref=e237] [cursor=pointer]
              - button "Currents" [pressed] [ref=e239] [cursor=pointer]
              - button "Shipping" [pressed] [ref=e241] [cursor=pointer]
              - button "Bathymetry" [pressed] [ref=e243] [cursor=pointer]
              - button "Coastline" [pressed] [ref=e245] [cursor=pointer]
              - button "Sentinel" [pressed] [ref=e247] [cursor=pointer]
            - generic [ref=e249]: 5 candidates in 50 km window
          - generic [ref=e250]:
            - generic [ref=e251]:
              - generic [ref=e252]: CANDIDATE RANKING
              - link "TOP RANK DOSSIER" [ref=e253] [cursor=pointer]:
                - /url: /vessels/9123456
            - generic [ref=e256]:
              - button "01 MT OCEAN MERIDIAN AIS PRIMARY IMO 9123456 · India · CRUDE_TANKER 91.4 0.3 km 4.2° off 58 min 42 min transponder gap" [ref=e257] [cursor=pointer]:
                - generic [ref=e258]:
                  - generic [ref=e259]: "01"
                  - generic [ref=e260]:
                    - generic [ref=e261]:
                      - generic [ref=e262]: MT OCEAN MERIDIAN
                      - generic [ref=e263]: AIS
                      - generic [ref=e264]: PRIMARY
                    - generic [ref=e265]:
                      - generic [ref=e266]: IMO 9123456
                      - generic [ref=e267]: ·
                      - generic [ref=e268]: India
                      - generic [ref=e269]: ·
                      - generic [ref=e270]: CRUDE_TANKER
                  - generic [ref=e271]: "91.4"
                - generic [ref=e275]:
                  - generic [ref=e276]: 0.3 km
                  - generic [ref=e279]: 4.2° off
                  - generic [ref=e284]: 58 min
                  - generic [ref=e288]: 42 min transponder gap
              - button "02 MV EASTERN STAR AIS WATCH IMO 9456789 · Liberia · BULK_CARRIER 64.8 4.2 km 11.5° off 22 min AIS clean" [ref=e293] [cursor=pointer]:
                - generic [ref=e294]:
                  - generic [ref=e295]: "02"
                  - generic [ref=e296]:
                    - generic [ref=e297]:
                      - generic [ref=e298]: MV EASTERN STAR
                      - generic [ref=e299]: AIS
                      - generic [ref=e300]: WATCH
                    - generic [ref=e301]:
                      - generic [ref=e302]: IMO 9456789
                      - generic [ref=e303]: ·
                      - generic [ref=e304]: Liberia
                      - generic [ref=e305]: ·
                      - generic [ref=e306]: BULK_CARRIER
                  - generic [ref=e307]: "64.8"
                - generic [ref=e311]:
                  - generic [ref=e312]: 4.2 km
                  - generic [ref=e315]: 11.5° off
                  - generic [ref=e320]: 22 min
                  - generic [ref=e324]: AIS clean
              - button "03 MT ARABIAN PEARL AIS WATCH IMO 9345670 · Panama · CHEMICAL_TANKER 51.2 8.9 km 8.9° off 38 min AIS clean" [ref=e329] [cursor=pointer]:
                - generic [ref=e330]:
                  - generic [ref=e331]: "03"
                  - generic [ref=e332]:
                    - generic [ref=e333]:
                      - generic [ref=e334]: MT ARABIAN PEARL
                      - generic [ref=e335]: AIS
                      - generic [ref=e336]: WATCH
                    - generic [ref=e337]:
                      - generic [ref=e338]: IMO 9345670
                      - generic [ref=e339]: ·
                      - generic [ref=e340]: Panama
                      - generic [ref=e341]: ·
                      - generic [ref=e342]: CHEMICAL_TANKER
                  - generic [ref=e343]: "51.2"
                - generic [ref=e347]:
                  - generic [ref=e348]: 8.9 km
                  - generic [ref=e351]: 8.9° off
                  - generic [ref=e356]: 38 min
                  - generic [ref=e360]: AIS clean
              - button "04 MV COASTAL TRADER AIS CLEAR IMO 8923411 · India · CONTAINER_SHIP 31.7 14.2 km 61.2° off 0 min AIS clean" [ref=e365] [cursor=pointer]:
                - generic [ref=e366]:
                  - generic [ref=e367]: "04"
                  - generic [ref=e368]:
                    - generic [ref=e369]:
                      - generic [ref=e370]: MV COASTAL TRADER
                      - generic [ref=e371]: AIS
                      - generic [ref=e372]: CLEAR
                    - generic [ref=e373]:
                      - generic [ref=e374]: IMO 8923411
                      - generic [ref=e375]: ·
                      - generic [ref=e376]: India
                      - generic [ref=e377]: ·
                      - generic [ref=e378]: CONTAINER_SHIP
                  - generic [ref=e379]: "31.7"
                - generic [ref=e383]:
                  - generic [ref=e384]: 14.2 km
                  - generic [ref=e387]: 61.2° off
                  - generic [ref=e392]: 0 min
                  - generic [ref=e396]: AIS clean
              - button "05 MFV SAMUDRA RANI SIM CLEAR IMO 9900112 · India · FISHING_VESSEL 11.9 18.6 km 8.4° off 105 min Class-B loitering" [ref=e401] [cursor=pointer]:
                - generic [ref=e402]:
                  - generic [ref=e403]: "05"
                  - generic [ref=e404]:
                    - generic [ref=e405]:
                      - generic [ref=e406]: MFV SAMUDRA RANI
                      - generic [ref=e407]: SIM
                      - generic [ref=e408]: CLEAR
                    - generic [ref=e409]:
                      - generic [ref=e410]: IMO 9900112
                      - generic [ref=e411]: ·
                      - generic [ref=e412]: India
                      - generic [ref=e413]: ·
                      - generic [ref=e414]: FISHING_VESSEL
                  - generic [ref=e415]: "11.9"
                - generic [ref=e419]:
                  - generic [ref=e420]: 18.6 km
                  - generic [ref=e423]: 8.4° off
                  - generic [ref=e428]: 105 min
                  - generic [ref=e432]: Class-B loitering
              - generic [ref=e437]: Rank-1 flagged for enforcement review
            - generic [ref=e444]:
              - generic [ref=e445]:
                - generic [ref=e446]: Vessel attribution
                - link "FULL DOSSIER" [ref=e451] [cursor=pointer]:
                  - /url: /vessels/9123456
              - generic [ref=e454]:
                - generic [ref=e455]: MT OCEAN MERIDIAN
                - generic [ref=e456]: AIS
                - generic [ref=e457]: IMO 9123456
              - generic [ref=e458]:
                - generic [ref=e459]: MMSI 419001234
                - generic [ref=e460]: ·
                - generic [ref=e461]: India
                - generic [ref=e462]: ·
                - generic [ref=e463]: CRUDE_TANKER
                - generic [ref=e464]: ·
                - generic [ref=e465]: 105400 DWT
              - generic [ref=e466]:
                - generic [ref=e467]: 340 m closest approach to reconstructed origin at 02:14 UTC
                - generic [ref=e470]: Heading 248° within 4.2° of slick skeleton axis (91.8% collinearity)
                - generic [ref=e473]: Crude oil tanker — high MARPOL Annex I discharge prior (100%)
                - generic [ref=e476]: Nocturnal speed drop 14.2 kn → 4.7 kn in tank-washing window
                - generic [ref=e479]: 42-minute intentional AIS gap recorded 15 nm upstream
                - generic [ref=e482]: Transit precedes SAR observation by 3.8 h — strict causality
              - generic [ref=e485]: PRIMARY SUSPECT
              - generic [ref=e489]:
                - generic [ref=e490]: Prior incidents
                - generic [ref=e495]:
                  - generic [ref=e496]:
                    - generic [ref=e497]: 2024-11-14 · Sikka Terminal (Vadinar)
                    - generic [ref=e498]: OWS bypass sensor fault
                  - generic [ref=e499]:
                    - generic [ref=e500]: 2022-04-09 · Fujairah anchorage
                    - generic [ref=e501]: Bunkering transfer overflow
            - generic [ref=e502]:
              - generic [ref=e503]:
                - generic [ref=e504]: Explainability
                - generic [ref=e505]: weighted factors
              - application [ref=e509]:
                - generic [ref=e526]:
                  - generic [ref=e527]: Proximity
                  - generic [ref=e529]: Collinearity
                  - generic [ref=e532]: Vessel prior
                  - generic [ref=e535]: Kinetic
                  - generic [ref=e538]: Timing
              - generic [ref=e541]:
                - generic [ref=e542]:
                  - generic [ref=e543]: Backtrack proximity
                  - generic [ref=e546]: 28%
                - generic [ref=e547]:
                  - generic [ref=e548]: Trajectory collinearity
                  - generic [ref=e551]: 24%
                - generic [ref=e552]:
                  - generic [ref=e553]: Vessel prior
                  - generic [ref=e556]: 18%
                - generic [ref=e557]:
                  - generic [ref=e558]: Kinetic anomaly
                  - generic [ref=e561]: 16%
                - generic [ref=e562]:
                  - generic [ref=e563]: Temporal plausibility
                  - generic [ref=e566]: 14%
  - generic [ref=e571] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e572]
    - generic [ref=e576]:
      - button "Open issues overlay" [ref=e577]:
        - generic [ref=e578]:
          - generic [aria-hidden] [ref=e579]: "0"
          - generic [ref=e580]: "1"
        - generic [ref=e581]: Issue
      - button "Collapse issues badge" [ref=e582]
  - alert [ref=e585]
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
      |                                             ^ Error: /attribution console errors
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