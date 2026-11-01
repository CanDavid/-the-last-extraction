import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(12000);
  page.setDefaultNavigationTimeout(12000);
  page.on("requestfailed", (r) =>
    console.log("REQUEST FAILED", r.url(), r.failure()),
  );
  page.on("console", (m) => {
    if (m.type() === "error") console.log("BROWSER ERROR", m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4173/-the-last-extraction/");
  await page
    .getByText("LISTO PARA JUGAR SIN CONEXIÓN", { exact: false })
    .waitFor();
  await page.screenshot({ path: "test-results/home.png" });
  await page.locator("#new").click();
  await page.locator("#close").click();
  await page.locator("canvas").waitFor();
  await page.screenshot({ path: "test-results/mission.png" });
  const read = () =>
    page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const r = indexedDB.open("last-extraction", 1);
          r.onsuccess = () => {
            const d = r.result,
              q = d.transaction("save").objectStore("save").get("campaign");
            q.onsuccess = () => {
              resolve(q.result);
              d.close();
            };
            q.onerror = () => reject(q.error);
          };
        }),
    );
  const before = await read();
  assert.equal(before.units[0].ap, 2);
  const canvas = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(
    canvas.x + canvas.width * (1.5 / 16),
    canvas.y + canvas.height * (7.5 / 12),
  );
  await page.locator("#confirm").click();
  await page.waitForFunction(() =>
    document.querySelector("#save").textContent.includes("GUARDADO EN"),
  );
  const after = await read();
  assert.equal(after.units[0].y, 7);
  assert.equal(after.units[0].ap, 1);
  await page.locator("#end").click();
  await page.waitForFunction(
    () => document.querySelector("#turn").textContent === "2",
  );
  await page.locator("#brand").click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "the-last-extraction.json");
  await page
    .locator("#file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
  await page.getByRole("heading", { name: "No se pudo importar" }).waitFor();
  await page.locator("#close").click();
  assert.equal((await read()).turn, 2);
  await context.setOffline(true);
  await page.reload();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/offline.png" });
  await page.locator("#continue").click();
  await page.locator("canvas").waitFor();
  assert.equal(await page.locator("#turn").textContent(), "2");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.screenshot({ path: "test-results/phone.png" });
  assert.equal(await page.locator(".rotate").isVisible(), false);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.locator(".rotate").isVisible(), true);
  await context.setOffline(false);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: "test-results/tablet.png" });
  const original = readFileSync("dist/sw.js", "utf8");
  try {
    writeFileSync(
      "dist/sw.js",
      original.replace(/const CACHE='[^']+'/, "const CACHE='tle-update-test'"),
    );
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r.update();
    });
    await page.locator("#update").waitFor();
    await page.locator("#update").click();
    await page
      .getByRole("heading", { name: "Actualización preparada" })
      .waitFor();
    await page.locator("#close").click();
    assert.equal((await read()).turn, 2);
    await page.locator("#brand").click();
    const candidate = await read();
    candidate.screen = "shelter";
    await page
      .locator("#file")
      .setInputFiles({
        name: "valid.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(candidate)),
      });
    await page.locator("#yes").click();
    await page.getByText("El siguiente rescate.").waitFor();
    await page.locator("#update").click();
    await page.waitForLoadState("domcontentloaded");
    await page.locator("#continue").waitFor();
    assert.equal((await read()).turn, 2);
    assert.equal((await read()).screen, "shelter");
  } finally {
    writeFileSync("dist/sw.js", original);
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: production base path, touch movement, turns, IndexedDB, export, invalid import, offline reload/continue, landscape, portrait, valid import and safe update with preserved progress.",
  );
  await context.close();
} finally {
  await browser.close();
}
