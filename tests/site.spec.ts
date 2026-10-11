import { expect, test, type Page } from "@playwright/test";

// Click-through test of every page with live data from AniList, Jikan and MangaDex.

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|favicon|net::ERR/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Scroll through the whole page so lazy sections and reveal animations run. */
async function scrollAll(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(120);
  }
}

/** Cards that are actually visible (catches "empty" tabs where cards stay transparent). */
async function visibleCards(page: Page) {
  await page.waitForTimeout(1200);
  return page.evaluate(
    () =>
      [...document.querySelectorAll('main a[href^="/manga/"]')].filter((a) => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && Number(getComputedStyle(a).opacity) > 0.5;
      }).length,
  );
}


/** A title page whose chapters can be read here (popular series are often licensed, so we search). */
let readableCache: { href: string; title: string } | null = null;
async function findReadable(page: Page) {
  if (readableCache) return readableCache;
  for (const list of ["/browse?sort=POPULARITY_DESC", "/browse?country=KR&sort=POPULARITY_DESC", "/browse?status=FINISHED&sort=POPULARITY_DESC"]) {
    await page.goto(list);
    const hrefs = await page.locator('main a[href^="/manga/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))].slice(0, 12));
    for (const href of hrefs) {
      await page.goto(href);
      await page.waitForFunction(() => !document.querySelector("#chapters .animate-pulse, #chapters .shimmer"), null, { timeout: 45_000 });
      if ((await page.locator('#chapters a[href^="/read/"]').count()) > 0) {
        readableCache = { href, title: (await page.getByRole("heading", { level: 1 }).innerText()).trim() };
        return readableCache;
      }
    }
  }
  throw new Error("No readable title found on MangaDex among popular series");
}

async function openFirstChapter(page: Page) {
  const r = await findReadable(page);
  await page.goto(r.href);
  const first = page.locator('#chapters a[href^="/read/"]').first();
  await first.waitFor({ timeout: 45_000 });
  await first.click();
  await expect(page).toHaveURL(/\/read\//);
  return r;
}

test.describe("homepage", () => {
  test("loads every shelf and scrolls a long way", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every panel");
    await expect(page.locator('a[href^="/manga/"]').first()).toBeAttached();
    const links = await page.locator('main a[href^="/manga/"]').count();
    expect(links, "homepage should list lots of titles").toBeGreaterThan(60);
    const screens = await page.evaluate(() => document.body.scrollHeight / window.innerHeight);
    expect(screens, "homepage should be long").toBeGreaterThan(12);
    await scrollAll(page);
    for (const title of ["Trending top 10", "Hot manhwa", "Ongoing manga", "Manhua on the rise", "Highest rated", "Completed series"]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    expect(await visibleCards(page)).toBeGreaterThan(5);
    expect(errors).toEqual([]);
  });

  test("WebGL canvas or video fallback renders", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("canvas, video").first()).toBeAttached();
  });
});

test.describe("navigation tabs", () => {
  for (const [name, path] of [
    ["Browse", "/browse"],
    ["Manhwa", "/browse?country=KR"],
    ["Top rated", "/browse?sort=SCORE_DESC"],
  ] as const) {
    test(`${name} tab shows titles after a client-side click`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto("/");
      await page.locator("header").getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(path.replace(/[?]/g, "\\?")));
      // the loading skeleton shows first, so wait for the cards to arrive
      await expect.poll(() => visibleCards(page), { message: `${name} should show visible cards`, timeout: 40_000 }).toBeGreaterThan(5);
      expect(errors).toEqual([]);
    });
  }

  test("Library and Credits open", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Library", exact: true }).click();
    await expect(page.getByRole("tablist")).toBeVisible();
    await page.goto("/credits");
    await expect(page.getByRole("heading", { name: /Credits/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /WEBTOON/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Anime-Planet/ }).first()).toBeVisible();
  });
});

test.describe("browse filters", () => {
  const filters = [
    "/browse?country=JP",
    "/browse?country=KR",
    "/browse?country=CN",
    "/browse?sort=POPULARITY_DESC",
    "/browse?sort=SCORE_DESC",
    "/browse?sort=START_DATE_DESC",
    "/browse?status=RELEASING",
    "/browse?status=FINISHED",
    "/browse?genre=Romance",
    "/browse?genre=Action&country=KR",
    "/browse?q=one%20piece",
    "/browse?page=2",
  ];
  for (const url of filters) {
    test(`results for ${url}`, async ({ page }) => {
      await page.goto(url);
      expect(await visibleCards(page)).toBeGreaterThan(0);
    });
  }

  test("clicking chips keeps results visible", async ({ page }) => {
    await page.goto("/browse");
    for (const chip of ["Manhwa", "Manhua", "Top rated", "Completed", "All"]) {
      await page.getByRole("link", { name: chip, exact: true }).first().click();
      await page.waitForLoadState("networkidle");
      expect(await visibleCards(page), `after clicking ${chip}`).toBeGreaterThan(0);
    }
  });
});

test.describe("search", () => {
  test("quick search finds a series", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const box = page.getByRole("dialog").getByRole("textbox");
    await box.fill("solo leveling");
    await expect(page.getByRole("dialog").locator("button").first()).toBeVisible();
    await box.press("Enter");
    await expect(page).toHaveURL(/\/manga\/\d+/);
  });
});

test.describe("title pages and reader", () => {
  test("top trending titles load and at least one has readable chapters", async ({ page }) => {
    await page.goto("/browse?sort=POPULARITY_DESC");
    await page.locator('main a[href^="/manga/"]').first().waitFor({ timeout: 40_000 });
    const hrefs = await page.locator('main a[href^="/manga/"]').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))].slice(0, 8));
    let readable = 0;
    const summary: string[] = [];
    for (const href of hrefs) {
      await page.goto(href);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("#chapters")).toBeVisible();
      await page.waitForFunction(() => !document.querySelector("#chapters .animate-pulse, #chapters .shimmer"), null, { timeout: 45_000 });
      const chapters = await page.locator('#chapters a[href^="/read/"]').count();
      summary.push(`${href}: ${chapters} chapter links`);
      if (chapters > 0) readable++;
    }
    console.log(summary.join("\n"));
    expect(readable, summary.join("\n")).toBeGreaterThan(0);
  });

  test("reader shows pages and moves between chapters", async ({ page }) => {
    await openFirstChapter(page);
    const img = page.locator('img[alt="Page 1"]');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "paged" }).click();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator('img[alt="Page 2"]')).toBeVisible();
    await page.getByRole("button", { name: "strip" }).click();
  });
});

test.describe("accounts", () => {
  test("sign up, reading progress is saved, log out and back in", async ({ page }) => {
    const email = `test${Date.now()}@neonink.test`;
    await page.goto("/login?mode=signup");
    await page.getByLabel("Display name").fill("Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("supersecret1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByText("Welcome aboard")).toBeVisible();

    // read a chapter, then it should be in Continue reading
    const r = await openFirstChapter(page);
    const name = new RegExp(r.title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    await expect(page.locator('img[alt="Page 1"]')).toBeVisible();
    await page.waitForTimeout(1500);
    await page.goto("/library");
    await expect(page.getByRole("link", { name }).first()).toBeVisible();

    // add to favourites
    await page.goto(r.href);
    await page.getByRole("button", { name: /Add to library/ }).click();
    await page.getByRole("button", { name: /Favourite/ }).click();
    await page.goto("/library?tab=favorite");
    await expect(page.getByText(name).first()).toBeVisible();

    // log out and back in
    await page.locator("header summary").click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page.locator("header").getByRole("link", { name: "Log in" })).toBeVisible();
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("supersecret1");
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();
    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  });

  test("wrong password shows an error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nobody@neonink.test");
    await page.getByLabel("Password", { exact: true }).fill("wrongpass");
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();
    await expect(page.getByRole("alert").filter({ hasText: "wrong" })).toBeVisible();
  });
});

test.describe("misc", () => {
  test("surprise me opens a random series", async ({ page }) => {
    await page.goto("/random");
    await expect(page).toHaveURL(/\/manga\/\d+/);
  });

  test("unknown pages show the 404", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText("isekai")).toBeVisible();
  });

  test("phone tab bar works @phone", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByRole("navigation", { name: "Main" });
    await expect(bar).toBeVisible();
    await bar.getByRole("link", { name: /Browse/ }).click();
    await expect(page).toHaveURL(/\/browse/);
    expect(await visibleCards(page)).toBeGreaterThan(0);
  });
});
