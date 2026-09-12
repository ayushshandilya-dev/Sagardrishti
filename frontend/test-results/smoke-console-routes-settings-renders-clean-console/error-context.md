# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> console routes >> /settings renders clean
- Location: e2e\smoke.spec.ts:21:9

# Error details

```
Error: /settings console errors

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
        - generic [ref=e69]: 18:03:01 UTC
        - generic [ref=e70]: 23:33:01 IST
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
        - link "Vessel Investigation" [ref=e156] [cursor=pointer]:
          - /url: /vessels/9123456
        - link "Evidence Ledger" [ref=e163] [cursor=pointer]:
          - /url: /evidence
        - link "Legal Dossier" [ref=e169] [cursor=pointer]:
          - /url: /dossier
      - link "Settings / Layers" [ref=e176] [cursor=pointer]:
        - /url: /settings
    - main [ref=e182]:
      - generic [ref=e183]:
        - generic [ref=e184]:
          - generic [ref=e185]:
            - heading "Settings & layers" [level=1] [ref=e186]
            - generic [ref=e187]: COP CONFIGURATION
          - paragraph [ref=e188]: Layer stack, data source health and operational configuration
        - generic [ref=e189]:
          - generic [ref=e190]:
            - generic [ref=e191]:
              - generic [ref=e192]: Map layers
              - button "RESET" [ref=e197] [cursor=pointer]
            - generic [ref=e198]:
              - generic [ref=e199]:
                - generic [ref=e201]:
                  - generic [ref=e202]: EEZ boundary
                  - generic [ref=e203]: Exclusive economic zone line
                - button [pressed] [ref=e204] [cursor=pointer]
              - generic [ref=e206]:
                - generic [ref=e208]:
                  - generic [ref=e209]: Shipping lanes
                  - generic [ref=e210]: Lloyd's + IMO corridor data
                - button [pressed] [ref=e211] [cursor=pointer]
              - generic [ref=e213]:
                - generic [ref=e215]:
                  - generic [ref=e216]: AIS traffic
                  - generic [ref=e217]: Live vessel tracks
                - button [pressed] [ref=e218] [cursor=pointer]
              - generic [ref=e220]:
                - generic [ref=e222]:
                  - generic [ref=e223]: Oil slick
                  - generic [ref=e224]: SAR-derived polygon
                - button [pressed] [ref=e225] [cursor=pointer]
              - generic [ref=e227]:
                - generic [ref=e229]:
                  - generic [ref=e230]: RK4 drift
                  - generic [ref=e231]: Reverse-drift trajectory
                - button [ref=e232] [cursor=pointer]
              - generic [ref=e234]:
                - generic [ref=e236]:
                  - generic [ref=e237]: Weather
                  - generic [ref=e238]: ECMWF 10 m wind field
                - button [pressed] [ref=e239] [cursor=pointer]
              - generic [ref=e241]:
                - generic [ref=e243]:
                  - generic [ref=e244]: Currents
                  - generic [ref=e245]: INCOIS ocean currents
                - button [pressed] [ref=e246] [cursor=pointer]
          - generic [ref=e248]:
            - generic [ref=e249]:
              - generic [ref=e250]: Satellite pass schedule
              - generic [ref=e257]:
                - generic [ref=e258]:
                  - generic [ref=e259]: Sentinel-1A
                  - generic [ref=e260]: SAR
                  - generic [ref=e261]: 2026-09-12T04:18:00Z UTC
                  - generic [ref=e262]: GO · T−118 m
                - generic [ref=e263]:
                  - generic [ref=e264]: RISAT-1A
                  - generic [ref=e265]: SAR
                  - generic [ref=e266]: 2026-09-11T18:42:00Z UTC
                  - generic [ref=e267]: GO · T−138 m
            - generic [ref=e268]:
              - generic [ref=e269]: Data source health
              - generic [ref=e276]:
                - generic [ref=e277]:
                  - generic [ref=e286]:
                    - generic [ref=e287]: Sentinel-1A
                    - generic [ref=e288]: C-band IW · 5 d repeat
                  - generic [ref=e289]: SYNC 08:00 Z
                - generic [ref=e290]:
                  - generic [ref=e299]:
                    - generic [ref=e300]: RISAT-1A
                    - generic [ref=e301]: C-band · 25 d repeat
                  - generic [ref=e302]: SYNC 06:12 Z
                - generic [ref=e303]:
                  - generic [ref=e309]:
                    - generic [ref=e310]: INCOIS Ocean State
                    - generic [ref=e311]: Currents · 3 h forecast
                  - generic [ref=e312]: SYNC 09:30 Z
                - generic [ref=e313]:
                  - generic [ref=e319]:
                    - generic [ref=e320]: ECMWF ERA5
                    - generic [ref=e321]: 10 m wind · 3 h step
                  - generic [ref=e322]: SYNC 09:45 Z
                - generic [ref=e323]:
                  - generic [ref=e329]:
                    - generic [ref=e330]: AIS coastal network
                    - generic [ref=e331]: In-zone reception
                  - generic [ref=e332]: LIVE · 18 s
        - generic [ref=e333]:
          - generic [ref=e334]:
            - generic [ref=e335]: Operational alerts
            - generic [ref=e339]:
              - button "ALL" [ref=e340] [cursor=pointer]
              - button "CRITICAL" [ref=e341] [cursor=pointer]
              - button "SUSPICIOUS" [ref=e342] [cursor=pointer]
              - button "VERIFIED" [ref=e343] [cursor=pointer]
          - generic [ref=e344]:
            - button "CRITICAL 10:30 UTC High-confidence mineral oil slick Sentinel-1A IW radar detected 18.6 km² dark formation off Okha, Kutch entrance. 94.2% mineral oil probability. 21.8452° N, 69.1124° E" [ref=e345] [cursor=pointer]:
              - generic [ref=e346]:
                - generic [ref=e347]: CRITICAL
                - generic [ref=e349]: 10:30 UTC
              - generic [ref=e350]: High-confidence mineral oil slick
              - generic [ref=e351]: Sentinel-1A IW radar detected 18.6 km² dark formation off Okha, Kutch entrance. 94.2% mineral oil probability.
              - generic [ref=e352]: 21.8452° N, 69.1124° E
            - button "SUSPICIOUS 08:40 UTC Nocturnal tank-washing slowdown MT OCEAN MERIDIAN reduced from 14.2 kn to 4.7 kn with a 42-minute AIS gap upstream of the detection. Kutch outer corridor" [ref=e353] [cursor=pointer]:
              - generic [ref=e354]:
                - generic [ref=e355]: SUSPICIOUS
                - generic [ref=e357]: 08:40 UTC
              - generic [ref=e358]: Nocturnal tank-washing slowdown
              - generic [ref=e359]: MT OCEAN MERIDIAN reduced from 14.2 kn to 4.7 kn with a 42-minute AIS gap upstream of the detection.
              - generic [ref=e360]: Kutch outer corridor
            - 'button "VERIFIED 07:15 UTC Evidence ledger block #4 sealed SHA-256 Merkle root e78f0b12… anchored and signed with the ICG node Ed25519 key. ICG node 01" [ref=e361] [cursor=pointer]':
              - generic [ref=e362]:
                - generic [ref=e363]: VERIFIED
                - generic [ref=e365]: 07:15 UTC
              - generic [ref=e366]: "Evidence ledger block #4 sealed"
              - generic [ref=e367]: SHA-256 Merkle root e78f0b12… anchored and signed with the ICG node Ed25519 key.
              - generic [ref=e368]: ICG node 01
        - generic [ref=e369]:
          - generic [ref=e370]: Keybindings
          - generic [ref=e373]:
            - generic [ref=e374]:
              - generic [ref=e375]: 1–7
              - generic [ref=e376]: Layer toggles
            - generic [ref=e377]:
              - generic [ref=e378]: + / −
              - generic [ref=e379]: Map zoom
            - generic [ref=e380]:
              - generic [ref=e381]: G
              - generic [ref=e382]: Reset view
            - generic [ref=e383]:
              - generic [ref=e384]: Space
              - generic [ref=e385]: Drift play
            - generic [ref=e386]:
              - generic [ref=e387]: V
              - generic [ref=e388]: Verify chain
  - button "Open Next.js Dev Tools" [ref=e394] [cursor=pointer]
  - alert [ref=e398]
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
      |                                             ^ Error: /settings console errors
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