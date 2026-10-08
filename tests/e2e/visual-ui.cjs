const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out = process.env.E2E_OUT || "/tmp/microgreen-visual-preview";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(() => {
    if (localStorage.getItem("visual-test-seeded")) return;
    const now = new Date(),
      date = (n) => {
        const d = new Date(now);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };
    let tray = 0;
    const seed = [
      ["Radish", "growth", 6],
      ["Broccoli", "germination", 8],
      ["Sunflower", "sowing", 4],
      ["Pea Shoots", "harvest", 6],
      ["Radish", "completed", 4],
    ];
    const batches = seed.map(([crop, stage, count], i) => ({
      id: `b${i}`,
      batchNumber: i + 1,
      cropType: crop,
      trays: Array.from({ length: count }, () => {
        const n = ++tray;
        return {
          id: `t${n}`,
          code: `T${String(n).padStart(3, "0")}`,
          slot: stage === "completed" ? undefined : n,
          status: "active",
          ...(stage === "completed" ? { harvestWeight: 200 } : {}),
        };
      }),
      sowingDate: date(-6),
      expectedHarvestDate: date(3),
      stage,
      notes: [],
      photos: [],
      watering: [],
      lighting: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      ...(stage === "completed"
        ? { actualHarvestDate: date(-1), yieldAmount: 800, yieldUnit: "grams" }
        : {}),
    }));
    localStorage.setItem("microgreen-batches", JSON.stringify(batches));
    localStorage.setItem(
      "microgreen-config",
      JSON.stringify({
        totalTrays: 36,
        farmLayout: { rackCount: 3, shelvesPerRack: 3, traysPerShelf: 4 },
        trayNumberPrefix: "Tray",
      }),
    );
    localStorage.setItem("visual-test-seeded", "1");
  });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("heading", { name: "My farm." }).waitFor();
  await page
    .locator(".tray-art img")
    .first()
    .evaluate((img) => img.decode());
  await page.screenshot({ path: `${out}/01-home.png` });
  const nav = (name) =>
    page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name, exact: true });
  await nav("Shelves").click();
  await page.getByLabel("Select rack").selectOption("1");
  await page.getByRole("button", { name: /Shelf 1/ }).click();
  await page.getByRole("button", { name: "Open tray T013" }).waitFor();
  await page.getByLabel("Select rack").selectOption("0");
  await page.screenshot({ path: `${out}/02-shelves.png` });
  await page.getByRole("button", { name: /Shelf 1/ }).click();
  await page.screenshot({ path: `${out}/03-expanded-shelf.png` });
  await page.getByRole("button", { name: "Open tray T001" }).click();
  await page.getByRole("heading", { name: "Tray T001" }).waitFor();
  await page.screenshot({ path: `${out}/04-tray.png` });
  await page.getByRole("button", { name: /B001 · Radish/ }).click();
  await page.locator("[data-batch-card]").first().waitFor();
  await page.screenshot({ path: `${out}/05-batches.png` });
  await nav("Insights").click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV", exact: true }).click();
  const download = await dl;
  await download.saveAs(`${out}/report.csv`);
  assert(fs.readFileSync(`${out}/report.csv`, "utf8").includes("Radish"));
  await page.screenshot({ path: `${out}/06-insights.png` });
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF report", exact: true }).click();
  await (await pdf).saveAs(`${out}/report.pdf`);
  assert(
    fs.readFileSync(`${out}/report.pdf`).subarray(0, 4).toString() === "%PDF",
  );
  await nav("Settings").click();
  await page.getByLabel("Racks", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Save rack layout" }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Slot 24 is occupied" })
    .waitFor();
  await page.getByLabel("Racks", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Save rack layout" }).click();
  await page.getByText("48 total tray positions").waitFor();
  await page.screenshot({ path: `${out}/07-settings.png` });
  await page.reload();
  await nav("Shelves").click();
  assert.equal(
    await page.getByLabel("Select rack").locator("option").count(),
    4,
  );
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await nav("Home").click();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `overflow at ${width}`,
    );
  }
  assert.deepEqual(errors, []);
  await browser.close();
  console.log(
    "PASS: five tabs, rack selection, expanded shelf, tray detail, batch navigation, PDF/CSV downloads, capacity guard, persistence and responsive widths.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
