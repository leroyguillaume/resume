import { chromium } from "@playwright/test";
import { log } from "./log.ts";
import { LANGUAGES, renderPdf } from "./render.ts";

const browser = await chromium.launch();
log("debug", "browser.launched", { version: browser.version() });
try {
  for (const lang of LANGUAGES) {
    await renderPdf(browser, lang);
  }
} finally {
  await browser.close();
}
