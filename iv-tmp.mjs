import { chromium } from "playwright";
const shots = "/private/tmp/claude-501/-Users-praful-Desktop-open/bf9b122a-8203-432d-9d0e-92aea1842b25/scratchpad";
const errs = [];
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });

await page.goto("http://localhost:3000/inspiration", { waitUntil: "commit" });
await page.waitForSelector("text=Inspiration Library", { timeout: 60000 });
await page.waitForTimeout(1500);

// Fresh upload
await page.getByRole("button", { name: "Add" }).click();
await page.waitForSelector("text=Add inspiration");
await page.locator('input[type="file"]').setInputFiles(`${shots}/test-upload.jpg`);
await page.getByRole("button", { name: "Add", exact: true }).last().click();
await page.waitForTimeout(2000);

// Let real analysis run
await page.waitForTimeout(30000);
await page.screenshot({ path: `${shots}/iv-01-grid.png` });

// Open newest card's detail sheet
await page.locator('[role="button"].group').first().click();
await page.waitForSelector("text=Inspiration detail", { timeout: 15000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/iv-02-detail.png` });

// What does the collection trigger actually read?
const trigger = await page.locator('[data-slot="select-trigger"]').first().innerText().catch(() => "n/a");
const analysisText = await page.locator("text=AI analysis").locator("xpath=following::*[1]").innerText().catch(() => "n/a");

console.log(JSON.stringify({
  collectionTrigger: trigger.trim(),
  analysisFirstBlock: analysisText.slice(0, 220),
  errors: errs.slice(0, 4),
}, null, 2));
await browser.close();
