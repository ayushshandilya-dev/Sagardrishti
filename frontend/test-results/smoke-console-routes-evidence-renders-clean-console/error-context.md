# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> console routes >> /evidence renders clean
- Location: e2e\smoke.spec.ts:21:9

# Error details

```
Error: /evidence console errors

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
        - generic [ref=e69]: 18:02:53 UTC
        - generic [ref=e70]: 23:32:53 IST
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
        - link "Legal Dossier" [ref=e170] [cursor=pointer]:
          - /url: /dossier
      - link "Settings / Layers" [ref=e177] [cursor=pointer]:
        - /url: /settings
    - main [ref=e183]:
      - generic [ref=e184]:
        - generic [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]:
              - heading "Evidence ledger" [level=1] [ref=e188]
              - generic [ref=e189]: UNVERIFIED
            - paragraph [ref=e193]: Forensic chain of custody · node icg-sagar-drishti-node-01 · 6 blocks · proof-of-work anchored
          - generic [ref=e194]:
            - generic [ref=e195]: CHAIN VALID
            - generic [ref=e201]: Ed25519 · CERTIFIED
        - generic [ref=e211]:
          - generic [ref=e212]:
            - generic [ref=e213]: APPEND-ONLY BLOCKCHAIN
            - generic [ref=e214]:
              - generic [ref=e219]:
                - generic [ref=e220]:
                  - generic [ref=e221]: "BLOCK #00"
                  - generic [ref=e226]: 2026-09-11T10:30:00Z
                - generic [ref=e227]:
                  - generic [ref=e228]:
                    - generic [ref=e229]: MERKLE
                    - generic "0000000000000000000000000000000000000000000000000000000000000000" [ref=e233]
                  - generic [ref=e234]:
                    - generic [ref=e235]: PREV
                    - generic "0000000000000000000000000000000000000000000000000000000000000000" [ref=e239]
                  - generic [ref=e240]:
                    - generic [ref=e241]: NONCE
                    - generic [ref=e242]: 10,48,576
              - generic [ref=e246]:
                - generic [ref=e247]:
                  - generic [ref=e248]: "BLOCK #01"
                  - generic [ref=e253]: 2026-09-11T10:35:12Z
                - generic [ref=e254]:
                  - generic [ref=e255]:
                    - generic [ref=e256]: MERKLE
                    - generic "3a7b8e519c2f6d0a4b8e7c1f9d2a5b6c7e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b" [ref=e260]
                  - generic [ref=e261]:
                    - generic [ref=e262]: PREV
                    - generic "00003f8a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789" [ref=e266]
                  - generic [ref=e267]:
                    - generic [ref=e268]: NONCE
                    - generic [ref=e269]: 20,97,152
                - generic [ref=e270]:
                  - generic [ref=e271]: sarCalibrationVerified✓
                  - generic [ref=e272]: speckleLeeFilterApplied✓
              - generic [ref=e276]:
                - generic [ref=e277]:
                  - generic [ref=e278]: "BLOCK #02"
                  - generic [ref=e283]: 2026-09-11T10:38:44Z
                - generic [ref=e284]:
                  - generic [ref=e285]:
                    - generic [ref=e286]: MERKLE
                    - generic "f4d19c8e2b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d" [ref=e290]
                  - generic [ref=e291]:
                    - generic [ref=e292]: PREV
                    - generic "00009e4a2b1c3d5f60718293a4b5c6d7e8f90123456789abcdef0123456789ab" [ref=e296]
                  - generic [ref=e297]:
                    - generic [ref=e298]: NONCE
                    - generic [ref=e299]: 31,45,728
                - generic [ref=e300]:
                  - generic [ref=e301]: aisDeduplicated✓
                  - generic [ref=e302]: kalmanFiltered✓
              - generic [ref=e306]:
                - generic [ref=e307]:
                  - generic [ref=e308]: "BLOCK #03"
                  - generic [ref=e313]: 2026-09-11T10:41:09Z
                - generic [ref=e314]:
                  - generic [ref=e315]:
                    - generic [ref=e316]: MERKLE
                    - generic "8e50b2c1d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0" [ref=e320]
                  - generic [ref=e321]:
                    - generic [ref=e322]: PREV
                    - generic "00008b1c2d3e4f5a60718293a4b5c6d7e8f90123456789abcdef0123456789cd" [ref=e326]
                  - generic [ref=e327]:
                    - generic [ref=e328]: NONCE
                    - generic [ref=e329]: 41,94,304
                - generic [ref=e330]:
                  - generic [ref=e331]: incoisCurrentsValidated✓
                  - generic [ref=e332]: ecmwfWindsInterpolated✓
              - generic [ref=e336]:
                - generic [ref=e337]:
                  - generic [ref=e338]: "BLOCK #04"
                  - generic [ref=e343]: 2026-09-11T10:45:30Z
                - generic [ref=e344]:
                  - generic [ref=e345]:
                    - generic [ref=e346]: MERKLE
                    - generic "c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1" [ref=e350]
                  - generic [ref=e351]:
                    - generic [ref=e352]: PREV
                    - generic "00007c2d3e4f5a6b70819203a4b5c6d7e8f90123456789abcdef0123456789ef" [ref=e356]
                  - generic [ref=e357]:
                    - generic [ref=e358]: NONCE
                    - generic [ref=e359]: 52,42,880
                - generic [ref=e360]:
                  - generic [ref=e361]: backtrackProximityScore✓
                  - generic [ref=e362]: trajectoryCollinearityScore✓
                  - generic [ref=e363]: vesselPriorScore✓
                  - generic [ref=e364]: kineticAnomalyScore✓
                  - generic [ref=e365]: temporalPlausibilityScore✓
              - generic [ref=e369]:
                - generic [ref=e370]:
                  - generic [ref=e371]: "BLOCK #05"
                  - generic [ref=e376]: 2026-09-11T10:48:02Z
                - generic [ref=e377]:
                  - generic [ref=e378]:
                    - generic [ref=e379]: MERKLE
                    - generic "e78f0b12a9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0" [ref=e383]
                  - generic [ref=e384]:
                    - generic [ref=e385]: PREV
                    - generic "00004a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d80" [ref=e389]
                  - generic [ref=e390]:
                    - generic [ref=e391]: NONCE
                    - generic [ref=e392]: 62,91,456
                - generic [ref=e393]: sealed✓
          - generic [ref=e395]:
            - generic [ref=e396]:
              - generic [ref=e397]:
                - button "Verify chain" [ref=e398] [cursor=pointer]
                - generic [ref=e402]: 0/6
              - generic [ref=e408]:
                - text: SAR Image
                - generic [ref=e409]: Sentinel-1A IW_GRDH_1SDV_20260911T103000 (VV+VH)
              - generic [ref=e417]:
                - text: AIS Data
                - generic [ref=e418]: AIVDM stream slice · MMSI 419001234 · 18,420 pings
              - generic [ref=e426]:
                - text: Weather Data
                - generic [ref=e427]: INCOIS currents + ECMWF ERA5 10 m wind, GRIB2 slice
              - generic [ref=e435]:
                - text: Attribution Matrix
                - generic [ref=e436]: Bayesian 5-factor solution tensor · SD-2026-00421
              - generic [ref=e444]:
                - text: Merkle Root
                - generic [ref=e445]: "Root digest of evidence ledger #1042"
              - generic [ref=e453]:
                - text: Ed25519 Signature
                - generic [ref=e454]: ICG surveillance authority key
            - generic [ref=e457]:
              - generic [ref=e458]: Evidence-preserving pipeline
              - list [ref=e459]:
                - listitem [ref=e460]: SAR scene ingested raw, immutable hash committed
                - listitem [ref=e461]: Calibration + Lee speckle filter logged as provenance ops
                - listitem [ref=e462]: AIS stream Kalman-filtered, de-duplicated, time-anchored
                - listitem [ref=e463]: INCOIS currents + ECMWF ERA5 wind fields validated
                - listitem [ref=e464]: 5-factor attribution tensor sealed into Merkle root
                - listitem [ref=e465]: Root signed by ICG surveillance Ed25519 authority
  - button "Open Next.js Dev Tools" [ref=e471] [cursor=pointer]
  - alert [ref=e475]
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
      |                                             ^ Error: /evidence console errors
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