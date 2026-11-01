import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

const API = "https://script.google.com/macros/s/AKfycbyd5qw34QrENt1QRsipO0b6o0G-FNpzKAHdOq5vHpYnhXRr1aILiocCtHPHn_LvaYzjiA/exec";
const BASE = "http://127.0.0.1:4173";

const cases = [
  { id:"independent", scores:[3,3,3,3,3,3,3,3], goal:"self_work", support:"independent", offer:"self_guided", allowed:["self_guided"], product:"Return to Yourself — Self-Guided", price:117 },
  { id:"additional-primary", scores:[3,3,3,3,3,3,3,3], goal:"self_work", support:"additional", offer:"reality_reset", allowed:["reality_reset","pattern_break"], product:"Return to Yourself + Reality Reset", price:147 },
  { id:"additional-alternative", scores:[3,3,3,3,3,3,3,3], goal:"self_work", support:"additional", offer:"pattern_break", allowed:["reality_reset","pattern_break"], product:"Return to Yourself + Pattern Break Session", price:197 },
  { id:"some-primary", scores:[3,3,3,3,3,3,3,3], goal:"self_work", support:"some", offer:"reality_reset", allowed:["reality_reset","pattern_break"], product:"Return to Yourself + Reality Reset", price:147 },
  { id:"some-alternative", scores:[3,3,3,3,3,3,3,3], goal:"self_work", support:"some", offer:"pattern_break", allowed:["reality_reset","pattern_break"], product:"Return to Yourself + Pattern Break Session", price:197 },
  { id:"unsure-primary", scores:[3,3,3,3,3,3,3,3], goal:"unsure", support:"unsure", offer:"reality_reset", allowed:["reality_reset","self_guided","pattern_break"], product:"Return to Yourself + Reality Reset", price:147 },
  { id:"unsure-self-guided", scores:[3,3,3,3,3,3,3,3], goal:"unsure", support:"unsure", offer:"self_guided", allowed:["reality_reset","self_guided","pattern_break"], product:"Return to Yourself — Self-Guided", price:117 },
  { id:"unsure-pattern-break", scores:[3,3,3,3,3,3,3,3], goal:"unsure", support:"unsure", offer:"pattern_break", allowed:["reality_reset","self_guided","pattern_break"], product:"Return to Yourself + Pattern Break Session", price:197 },
  { id:"goal-understand-him", scores:[3,3,3,3,3,3,3,3], goal:"understand_him", offer:"bare_minimum", product:"The Bare Minimum", price:4.99 },
  { id:"goal-change-him", scores:[3,3,3,3,3,3,3,3], goal:"change_him", offer:"bare_minimum", product:"The Bare Minimum", price:4.99 },
  { id:"pair-74", scores:[2,2,2,2,1,1,1,1], offer:"scored_route", product:"Quiet the Alarm → Break the Pull", price:74, route:"Two-Stage Pair" },
  { id:"single-37", scores:[2,2,1,1,1,1,1,1], offer:"scored_route", product:"Quiet the Alarm", price:37, route:"Single Stage" },
  { id:"bare-minimum-499", scores:[1,1,1,1,1,1,1,1], offer:"scored_route", product:"The Bare Minimum", price:4.99, route:"Bare Minimum" }
];

function questionBank(html) {
  const start = html.indexOf("const Q=[");
  const end = html.indexOf("const OMITTED_QUESTION_INDEX", start);
  assert(start >= 0 && end > start, "Could not locate the existing assessment question bank");
  return html.slice(start, end);
}

const branchHtml = await (await import("node:fs/promises")).readFile("assessment/start/index.html", "utf8");
execFileSync("git", ["fetch", "--depth=1", "origin", "main"], { stdio:"inherit" });
const mainHtml = execFileSync("git", ["show", "FETCH_HEAD:assessment/start/index.html"], { encoding:"utf8" });
assert.equal(questionBank(branchHtml), questionBank(mainHtml), "Earlier quiz question text/options/order changed from main");

const server = spawn("python3", ["-m", "http.server", "4173", "--bind", "127.0.0.1", "--directory", process.cwd()], { stdio:"ignore" });
let browser;
try {
  for (let i=0;i<30;i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await delay(500);
  }
  const root = await fetch(BASE);
  assert(root.ok, "Local GitHub branch preview server did not start");
  browser = await chromium.launch({ headless:true });
  for (const test of cases) await runCase(test);
  console.log("PASS: " + cases.length + " browser acceptance routes");
  console.log("PASS: original question bank matches main");
} finally {
  if (browser) await browser.close();
  server.kill("SIGTERM");
}

async function runCase(test) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const checkoutAttempts = [];
  let pageErrors = [];
  page.on("pageerror", error => pageErrors.push(String(error)));
  await page.addInitScript(({ id }) => {
    sessionStorage.setItem("yms_v3_submission_id", "YMSV3-S-P3-" + id);
    localStorage.setItem("yms_v3_journey_id", "YMSV3-J-P3-" + id);
    localStorage.setItem("yms_test", "1");
    localStorage.removeItem("yms_analytics_consent");
    const originalFetch = window.fetch.bind(window);
    window.__phase3ApiResults = [];
    window.fetch = async function(input, init) {
      const url = typeof input === "string" ? input : input.url;
      const raw = init && typeof init.body === "string" ? init.body : "";
      let requestBody = {};
      try { requestBody = JSON.parse(raw); } catch {}
      const response = await originalFetch(input, init);
      if (url && url.indexOf("AKfycbyd5qw34QrENt1QRsipO0b6o0G-FNpzKAHdOq5vHpYnhXRr1aILiocCtHPHn_LvaYzjiA") >= 0) {
        try {
          const result = await response.clone().json();
          window.__phase3ApiResults.push({
            action:requestBody.action || "assessment",
            ok:result.ok === true,
            resultEmailSuppressed:result.resultEmailSuppressed === true,
            status:result.status || "",
            code:result.code || "",
            submissionId:result.submissionId || "",
            resultToken:result.resultToken || "",
            finalOfferOption:requestBody.finalOfferOption || "",
            finalOfferProduct:requestBody.finalOfferProduct || "",
            finalOfferPrice:Number(requestBody.finalOfferPrice || 0)
          });
        } catch {}
      }
      return response;
    };
  }, { id:test.id });
  await page.route("https://stan.store/**", async route => {
    checkoutAttempts.push(route.request().url());
    await route.abort();
  });
  try {
    await page.goto(BASE + "/assessment/start/?yms_test=1", { waitUntil:"domcontentloaded" });
    await page.locator("#form .opt").first().waitFor({ state:"visible", timeout:15000 });
    const finalTwo = [3,3,2,3];
    for (let q=0;q<12;q++) {
      const answerIndex = q < 8 ? test.scores[q] : finalTwo[q-8];
      await page.locator("#form .opt").nth(answerIndex).click();
    }
    await page.locator("#form .opt").first().click();
    await page.locator("#form #next").click();
    await page.locator("#form #txt").fill("Synthetic Phase 3 acceptance record.");
    await page.locator("#form #next").click();
    await page.locator("#fn").fill("Phase 3 synthetic");
    await page.locator("#em").fill("phase3.synthetic+" + test.id + "@example.invalid");
    await page.locator("#capgo").click();
    await page.locator(".result-panel.active").waitFor({ state:"visible", timeout:20000 });

    while (await page.locator(".result-panel.active .result-next").count()) {
      await page.locator(".result-panel.active .result-next").click();
    }

    if (test.goal) await page.locator(".goal-answer[data-goal-choice=\"" + test.goal + "\"]").click();

    let finalLink;
    if (test.support) {
      const q2 = await page.locator(".result-panel.active").innerText();
      assert(q2.includes("This pattern didn't develop overnight"), "Approved Question 2 copy missing");
      assert(q2.includes("Would you like more personal support than this?"), "Support question missing");
      await page.locator(".support-answer[data-support-route=\"" + test.support + "\"]").click();
      const offered = await page.locator("#final-offer-options a[data-final-offer-option]").evaluateAll(nodes => nodes.map(n => n.dataset.finalOfferOption));
      assert.deepEqual(offered.sort(), [...test.allowed].sort(), test.id + ": wrong offer choices");
      const primary = test.support === "independent" ? "self_guided" : "reality_reset";
      const primaryId = await page.locator("#final-offer-options .final-offer-primary a").getAttribute("data-final-offer-option");
      assert.equal(primaryId, primary, test.id + ": wrong primary recommendation");
      finalLink = page.locator("#final-offer-options a[data-final-offer-option=\"" + test.offer + "\"]");
    } else if (test.goal === "understand_him" || test.goal === "change_him") {
      finalLink = page.locator("#goal-route-result a[data-final-offer-option=\"bare_minimum\"]");
    } else {
      finalLink = page.locator(".result-panel.active a[data-final-offer-option=\"scored_route\"]");
    }

    await finalLink.waitFor({ state:"visible", timeout:10000 });
    const href = await finalLink.getAttribute("href");
    assert(href && href.startsWith("https://stan.store/Yourmindstory/"), test.id + ": expected direct Stan checkout link");
    assert(!href.toLowerCase().includes("bootcamp"), test.id + ": retired Bootcamp link present");
    assert.equal(await finalLink.getAttribute("data-rec-product"), test.product, test.id + ": wrong product");
    assert.equal(Number(await finalLink.getAttribute("data-rec-price")), test.price, test.id + ": wrong price");

    await finalLink.click({ timeout:10000 }).catch(() => {});
    await page.waitForFunction(() => (window.__phase3ApiResults || []).some(x => x.action === "finalizeResultV3"), { timeout:15000 });
    const finalize = await page.evaluate(() => window.__phase3ApiResults.filter(x => x.action === "finalizeResultV3").at(-1));
    assert(finalize && finalize.ok, test.id + ": final choice did not save");
    assert(finalize.resultEmailSuppressed, test.id + ": development email was not suppressed");
    assert.equal(finalize.finalOfferOption, test.offer, test.id + ": wrong final offer option sent");
    assert.equal(finalize.finalOfferProduct, test.product, test.id + ": wrong final offer product sent");
    assert.equal(finalize.finalOfferPrice, test.price, test.id + ": wrong final offer price sent");
    assert.equal(checkoutAttempts.length, 1, test.id + ": checkout link was not intercepted exactly once");

    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("yms_v3_last_submission") || "null"));
    assert(saved && saved.confirmed && saved.resultToken, test.id + ": saved-result token missing");
    const storedResponse = await fetch(API + "?action=getResult&resultToken=" + encodeURIComponent(saved.resultToken));
    const stored = await storedResponse.json();
    assert(stored.ok, test.id + ": saved result endpoint failed");
    assert.equal(stored.finalOfferProduct, test.product, test.id + ": stored product does not match");
    assert.equal(stored.resultEmailState, "suppressed", test.id + ": stored email state is not suppressed");
    if (test.support) assert.equal(stored.supportChoiceId, test.support, test.id + ": support answer was not stored");
    if (test.goal) assert.equal(stored.goalChoiceId, test.goal, test.id + ": readiness answer was not stored");
    if (test.route) assert.equal(stored.recommendedRoute, test.route, test.id + ": scored route mismatch");
    assert.deepEqual(pageErrors, [], test.id + ": browser JavaScript error");
    console.log("PASS: " + test.id);
  } finally {
    await context.close();
  }
}
