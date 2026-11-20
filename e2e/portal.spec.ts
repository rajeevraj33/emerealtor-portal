import { test, expect, Page } from "@playwright/test";

// E2E coverage for the flows demonstrated in the property.ca walkthrough video,
// run against the EME Realtor portal.

test.describe("Home + search", () => {
  test("home loads with brand, listing count and featured listings", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/EME Realtor/);
    await expect(page.getByRole("heading", { name: /Active & Sold Listings/i })).toBeVisible();
    await expect(page.locator("text=Showcased GTA Listings")).toBeVisible();
    expect(await page.locator('a[href^="/listing/"]').count()).toBeGreaterThan(0);
  });

  test("autosuggest shows areas while typing", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/Search by Address/i).fill("Mississauga");
    await expect(page.locator("text=Areas")).toBeVisible();
    await expect(page.getByRole("button", { name: /Mississauga/ }).first()).toBeVisible();
  });

  test("autosuggest area click navigates to the area", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(/Search by Address/i).fill("Port Credit");
    const opt = page.getByRole("button", { name: /Port Credit/ }).first();
    await expect(opt).toBeVisible();
    await opt.click();
    await expect(page).toHaveURL(/neighbourhood\/.*port-credit|city\//);
  });
});

test.describe("Search results + filters + map", () => {
  test("Mississauga search shows listings, real area chips and the map", async ({ page }) => {
    await page.goto("/search?city=mississauga");
    await expect(page.getByRole("heading", { name: /Mississauga Homes For Sale/i })).toBeVisible();
    // real Mississauga areas from the client's list
    for (const area of ["Port Credit", "Streetsville", "Cooksville", "Clarkson"]) {
      await expect(page.getByRole("button", { name: area, exact: true })).toBeVisible();
    }
    expect(await page.locator('a[href^="/listing/"]').count()).toBeGreaterThan(0);
    await expect(page.locator(".leaflet-container")).toBeVisible();
  });

  test("For Rent mode switches results to rentals", async ({ page }) => {
    await page.goto("/search?city=mississauga&mode=Rent");
    await expect(page.getByRole("heading", { name: /Mississauga Homes For Rent/i })).toBeVisible();
    await expect(page.locator("text=/\\/mo/").first()).toBeVisible();
  });
});

test.describe("Listing detail + VOW gating", () => {
  async function openFirstListing(page: Page) {
    await page.goto("/search?city=mississauga");
    const first = page.locator('a[href^="/listing/"]').first();
    await first.click();
    await expect(page).toHaveURL(/\/listing\//);
  }

  test("listing detail renders the property.ca-style sections", async ({ page }) => {
    await openFirstListing(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const nav = page.locator('nav[aria-label="On this page"]');
    await expect(nav).toBeVisible();
    for (const s of ["Overview", "Price History", "Mortgage", "Neighbourhood", "Schools", "Comparable Sales"]) {
      await expect(nav.getByText(s, { exact: false }).first()).toBeVisible();
    }
    await expect(page.locator("text=Request a viewing").first()).toBeVisible();
  });

  test("logged-out visitor hits the VOW gate for price history", async ({ page }) => {
    await openFirstListing(page);
    await expect(page.locator("text=/Create an account to view all .* photos/")).toBeVisible();
    await expect(page.locator("text=/VOW Terms of Use/i").first()).toBeVisible();
  });
});

test.describe("Auth (signup / login) + VOW unlock", () => {
  test("a new visitor can sign up (VOW + CASL) and lands on account", async ({ page }) => {
    const email = `pw-${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByPlaceholder("Full name").fill("Playwright Tester");
    await page.getByPlaceholder("Email address").fill(email);
    await page.getByPlaceholder(/Password/).fill("password123");
    await page.locator('input[name="vow"]').check(); // required VOW Terms of Use
    await page.getByRole("button", { name: /Create account/i }).click();
    await expect(page).toHaveURL(/\/account/);
  });

  test("demo user can log in and then see VOW (sold) data", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/Email address/).fill("demo@emeinfotech.ai");
    await page.getByPlaceholder(/Password/).fill("password123");
    await page.getByRole("button", { name: /Log in/i }).click();
    await expect(page).toHaveURL(/\/account/);
    // sold search should now show sold prices, not a gate
    await page.goto("/search?city=mississauga&status=Sold");
    await expect(page.locator("text=/Create an account/").first()).toHaveCount(0);
  });
});

test.describe("Neighbourhood, market reports, tools, agents", () => {
  test("city page shows the market report", async ({ page }) => {
    await page.goto("/city/mississauga");
    await expect(page.locator("text=/Market/i").first()).toBeVisible();
  });

  test("neighbourhood page shows schools and demographics", async ({ page }) => {
    await page.goto("/search?city=mississauga");
    // jump to a neighbourhood via autosuggest target
    await page.goto("/neighbourhoods");
    const nb = page.locator('a[href^="/neighbourhood/"]').first();
    await nb.click();
    await expect(page).toHaveURL(/\/neighbourhood\//);
    await expect(page.locator("text=/Schools|School/i").first()).toBeVisible();
  });

  test("home estimator page loads", async ({ page }) => {
    await page.goto("/home-estimator");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("text=/estimate/i").first()).toBeVisible();
  });

  test("mortgage calculator page loads", async ({ page }) => {
    await page.goto("/mortgage");
    await expect(page.locator("text=/Mortgage/i").first()).toBeVisible();
  });

  test("agents directory lists agents and opens a profile", async ({ page }) => {
    await page.goto("/agents");
    const agent = page.locator('a[href^="/agents/"]').first();
    await expect(agent).toBeVisible();
    await agent.click();
    await expect(page).toHaveURL(/\/agents\//);
  });
});

test.describe("New features", () => {
  test("Rented (leased) category works", async ({ page }) => {
    await page.goto("/search?status=Rented");
    await expect(page.getByRole("heading", { name: /Recently Leased/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rented", exact: true })).toBeVisible();
    await expect(page.locator("text=Leased").first()).toBeVisible();
  });

  test("conversational assistant guides a search", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Open chat assistant/i }).click();
    await expect(page.locator("text=/I'm the EME Realtor assistant/")).toBeVisible();
    await page.getByPlaceholder("Your name").fill("Tester");
    await page.getByPlaceholder("Your name").press("Enter");
    await page.getByRole("button", { name: /Buy/ }).click();
    await expect(page.getByRole("button", { name: "Mississauga" }).first()).toBeVisible();
  });

  test("home page shows market dashboard + agents", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=/Sales Index for/")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Neighbourhood Experts/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Show all agents/i })).toBeVisible();
  });

  test("brokerage admin sees CRM reports", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/Email address/).fill("admin@emeinfotech.ai");
    await page.getByPlaceholder(/Password/).fill("admin123");
    await page.getByRole("button", { name: /Log in/i }).click();
    await expect(page).toHaveURL(/\/account/);
    await page.goto("/console");
    await expect(page.locator("text=Brokerage performance")).toBeVisible();
    await expect(page.locator("text=Agent leaderboard")).toBeVisible();
  });
});
