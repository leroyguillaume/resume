import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { LANGUAGES, renderPdf, sourceUrl } from "../scripts/render.ts";

const MAX_PAGES = 2;

const COUNTED_SELECTORS = [".job", ".role", "section", ".skills dt", ".tags li", "aside .item", ".icon-link", ".photo"];

function countPdfPages(pdf: Buffer): number {
  return pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
}

async function openCv(page: Page, lang: string): Promise<string[]> {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      problems.push(message.text());
    }
  });
  page.on("requestfailed", (request) => problems.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(sourceUrl(lang as (typeof LANGUAGES)[number]));
  await page.evaluate(() => document.fonts.ready);
  return problems;
}

for (const lang of LANGUAGES) {
  test.describe(`${lang} résumé`, () => {
    test("loads without errors and declares its language", async ({ page }) => {
      const problems = await openCv(page, lang);
      expect(problems).toEqual([]);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.locator("h1")).toHaveText("Guillaume Leroy");
    });

    test("renders with the bundled Inter font", async ({ page }) => {
      await openCv(page, lang);
      const loaded = await page.evaluate(() =>
        [...document.fonts].some((face) => face.family.replaceAll('"', "") === "Inter" && face.status === "loaded"),
      );
      expect(loaded).toBe(true);
    });

    test("shows the photo", async ({ page }) => {
      await openCv(page, lang);
      const photo = page.locator("img.photo");
      await expect(photo).toBeVisible();
      await expect(photo).toHaveAttribute("alt", /Guillaume Leroy/);
      expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    });

    test("shows the LinkedIn and GitHub logos from bundled SVG files", async ({ page }) => {
      await openCv(page, lang);
      const images = await page
        .locator(".icon-link")
        .evaluateAll((links) => links.map((link) => getComputedStyle(link, "::before").backgroundImage));
      expect(images).toHaveLength(2);
      for (const image of images) {
        const url = image.match(/^url\("(file:.+\.svg)"\)$/)?.[1];
        expect(url, image).toBeDefined();
        await access(fileURLToPath(url ?? ""));
      }
    });

    test("only links to absolute URLs, e-mail or the other language", async ({ page }) => {
      await openCv(page, lang);
      const hrefs = await page
        .locator("a[href]")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
      for (const href of hrefs) {
        expect(href).toMatch(/^(https:\/\/|mailto:|cv\.(en|fr)\.html$)/);
      }
    });

    test(`prints to at most ${MAX_PAGES} A4 pages`, async ({ browser }, testInfo) => {
      const path = await renderPdf(browser, lang, testInfo.outputPath());
      const pages = countPdfPages(await readFile(path));
      expect(pages).toBeGreaterThan(0);
      expect(pages).toBeLessThanOrEqual(MAX_PAGES);
    });
  });
}

test("both languages carry the same entries", async ({ browser }) => {
  const counts = await Promise.all(
    LANGUAGES.map(async (lang) => {
      const page = await browser.newPage();
      await openCv(page, lang);
      const result = await Promise.all(COUNTED_SELECTORS.map((selector) => page.locator(selector).count()));
      await page.close();
      return result;
    }),
  );
  const [reference, ...others] = counts;
  for (const other of others) {
    expect(other).toEqual(reference);
  }
});
