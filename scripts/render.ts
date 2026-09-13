import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "@playwright/test";
import { log } from "./log.ts";

export const LANGUAGES = ["en", "fr"] as const;

export type Language = (typeof LANGUAGES)[number];

const ROOT = join(import.meta.dirname, "..");

export const DIST_DIR = join(ROOT, "dist");

export function sourceUrl(lang: Language): string {
  return pathToFileURL(join(ROOT, "src", `cv.${lang}.html`)).href;
}

export function pdfPath(lang: Language, outDir: string = DIST_DIR): string {
  return join(outDir, `guillaume-leroy-${lang}.pdf`);
}

export async function renderPdf(browser: Browser, lang: Language, outDir: string = DIST_DIR): Promise<string> {
  const url = sourceUrl(lang);
  const path = pdfPath(lang, outDir);
  log("debug", "pdf.render.start", { lang, url, path });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await mkdir(dirname(path), { recursive: true });
    await page.pdf({ path, preferCSSPageSize: true, printBackground: true });
  } finally {
    await page.close();
  }
  const { size } = await stat(path);
  log("info", "pdf.render.done", { lang, path, bytes: size });
  return path;
}
