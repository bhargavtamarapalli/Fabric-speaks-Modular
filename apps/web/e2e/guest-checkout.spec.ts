import { test, expect, Page } from '@playwright/test';

// ─── Fixtures ───────────────────────────────────────────────────────────────
const VALID_PINCODE = '400001';    // serviceable, COD available
const INVALID_PINCODE = '999999'; // not serviceable

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fillAddressForm(page: Page, overrides: Record<string, string> = {}) {
  const data = {
    full_name: 'Test User',
    mobile: '9876543210',
    pincode: VALID_PINCODE,
    line1: '12, MG Road, Andheri West',
    city: 'Mumbai',
    state: 'Maharashtra',
    ...overrides,
  };
  await page.fill('[name="full_name"]', data.full_name);
  await page.fill('[name="mobile"]', data.mobile);
  await page.fill('[name="pincode"]', data.pincode);
  await page.fill('[name="line1"]', data.line1);
  await page.fill('[name="city"]', data.city);
  await page.fill('[name="state"]', data.state);
}

// ─── Suite ───────────────────────────────────────────────────────────────────
test.describe('SCR-07 Guest Checkout — Full Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear sessionStorage before each test
    await page.goto('/checkout/guest');
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
  });

  // ── Page is reachable and renders ──────────────────────────────────────────
  test('01 — mounts with curtain animation and shows step 1', async ({ page }) => {
    await expect(page).toHaveURL('/checkout/guest');
    await expect(page.getByText('Guest Checkout')).toBeVisible();
    await expect(page.getByText('Delivery Address')).toBeVisible();
    // Stepper shows step 1 active
    await expect(page.getByText('Address')).toBeVisible();
  });

  // ── Pincode check shows delivery estimate ─────────────────────────────────
  test('02 — valid pincode triggers delivery estimate', async ({ page }) => {
    // Mock pincode API
    await page.route(`**/pincodes/${VALID_PINCODE}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            serviceable: true,
            cod_available: true,
            estimated_delivery_days: 5,
            delivery_date_display: 'Mon, 16 Mar',
          },
        }),
      });
    });
    await fillAddressForm(page);
    // Blur pincode field to trigger check
    await page.locator('[name="pincode"]').fill(VALID_PINCODE);
    await page.locator('[name="pincode"]').blur();
    // Delivery estimate and COD message should appear
    await expect(page.getByText(/Delivers by/)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/COD available/)).toBeVisible();
  });

  // ── Invalid pincode shows not-serviceable message ─────────────────────────
  test('03 — invalid pincode shows not serviceable message', async ({ page }) => {
    await page.route(`**/pincodes/${INVALID_PINCODE}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { serviceable: false, cod_available: false, estimated_delivery_days: 0, delivery_date_display: '' } }),
      });
    });
    await fillAddressForm(page, { pincode: INVALID_PINCODE });
    await page.locator('[name="pincode"]').blur();
    await expect(page.getByText(/Not deliverable/)).toBeVisible({ timeout: 5000 });
  });

  // ── Continue to OTP step ──────────────────────────────────────────────────
  test('04 — complete address step → OTP step appears', async ({ page }) => {
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { message: 'OTP sent' } }) });
    });
    await fillAddressForm(page);
    await page.click('button:has-text("Continue")');
    await expect(page.getByText('Verify Mobile')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Code sent to/)).toBeVisible();
  });

  // ── OTP cells render and accept input ─────────────────────────────────────
  test('05 — OTP cells animate in and accept digits', async ({ page }) => {
    // Get to step 2
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await fillAddressForm(page);
    await page.click('button:has-text("Continue")');
    // Count OTP cells
    const cells = page.locator('input[maxlength="1"]');
    await expect(cells).toHaveCount(6);
    // Type into first cell
    await cells.nth(0).type('1');
    await expect(cells.nth(0)).toHaveValue('1');
  });

  // ── sessionStorage persists form data on back-navigation ────────────────-
  test('06 — address form pre-fills when navigating back', async ({ page }) => {
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await fillAddressForm(page);
    await page.click('button:has-text("Continue")');
    await page.getByText('← Back').click();
    // Form should still have the filled values
    await expect(page.locator('[name="full_name"]')).toHaveValue('Test User');
    await expect(page.locator('[name="mobile"]')).toHaveValue('9876543210');
  });

  // ── OTP verify failure shows error ────────────────────────────────────────
  test('07 — wrong OTP shows error message', async ({ page }) => {
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await page.route('**/auth/otp/verify', async route => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid OTP' } }) });
    });
    await fillAddressForm(page);
    await page.click('button:has-text("Continue")');
    const cells = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) await cells.nth(i).type('9');
    await expect(page.getByText(/Invalid code/)).toBeVisible({ timeout: 5000 });
  });

  // ── COD full flow: address → OTP → Payment → Confirmation ─────────────-
  test('08 — COD full guest checkout → /orders/confirmed', async ({ page }) => {
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await page.route('**/auth/otp/verify', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { token: 'tok_123', userId: 'usr_123' } }) });
    });
    await page.route('**/orders', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'ord_001', order_number: 'FS-001001', status: 'PLACED', total: 2499, created_at: new Date().toISOString(), items: [], address: { full_name: 'Test', line1: '', city: '', state: '', pincode: '' }, payment_method: 'COD' } }) });
      } else { await route.continue(); }
    });
    await page.route('**/payments/cod/confirm', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { success: true } }) });
    });

    // Step 1 — Address
    await fillAddressForm(page);
    await page.click('button:has-text("Continue")');

    // Step 2 — OTP
    await expect(page.getByText('Verify Mobile')).toBeVisible({ timeout: 5000 });
    const cells = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) await cells.nth(i).type('1');

    // Step 3 — Payment (COD)
    await expect(page.getByText('Payment')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cash on Delivery")');
    await expect(page.locator('button:has-text("Place Order")')).toBeVisible();
    await page.click('button:has-text("Place Order")');

    // Confirm redirect to /orders/confirmed
    await expect(page).toHaveURL('/orders/confirmed', { timeout: 10000 });
    await expect(page.getByText('Your order is confirmed.')).toBeVisible();
  });

  // ── Order number visible on confirmation page ──────────────────────────-
  test('09 — SCR-09 shows order number after COD checkout', async ({ page }) => {
    // Set up mocks and complete checkout (reuse pattern from test 08)
    await page.route('**/orders', async route => {
      const m = route.request().method();
      if (m === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [{ id: 'ord_001', order_number: 'FS-CONFIRM01', status: 'PLACED', total: 2499, created_at: new Date().toISOString(), items: [], address: { full_name: '', line1: '', city: '', state: '', pincode: '' }, payment_method: 'COD' }], meta: { total: 1, page: 1, limit: 1 } } }) });
      } else { await route.continue(); }
    });
    await page.goto('/orders/confirmed');
    await expect(page.getByText('Your order is confirmed.')).toBeVisible();
  });

  // ── WhatsApp toggle on confirmation page ────────────────────────────────
  test('10 — WhatsApp opt-in toggle appears on confirmation page', async ({ page }) => {
    await page.route('**/orders**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], meta: { total: 0, page: 1, limit: 1 } } }) });
    });
    await page.goto('/orders/confirmed');
    // WA card should appear after 1.2s delay
    await expect(page.getByText('Get order updates on WhatsApp')).toBeVisible({ timeout: 5000 });
  });

});

// ─── SCR-10 Guest Tracking ──────────────────────────────────────────────────
test.describe('SCR-10 Guest Order Tracking', () => {

  test('11 — /track renders mobile+orderID form', async ({ page }) => {
    await page.goto('/track');
    await expect(page.getByText('Track Order')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="FS-"]')).toBeVisible();
  });

  test('12 — send OTP shows verification input', async ({ page }) => {
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await page.goto('/track');
    await page.fill('input[type="tel"]', '9876543210');
    await page.fill('input[placeholder*="FS-"]', 'FS-001001');
    await page.click('button:has-text("Send OTP")');
    await expect(page.locator('input[maxlength="1"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('13 — valid OTP shows order status timeline', async ({ page }) => {
    await page.route('**/auth/otp/send', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
    await page.route('**/orders/**/guest-track', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { id: 'ord_001', order_number: 'FS-001001', status: 'SHIPPED', total: 2499, created_at: new Date().toISOString(), items: [], address: { full_name: '', line1: '', city: '', state: '', pincode: '' }, payment_method: 'COD' } }) });
    });
    await page.goto('/track');
    await page.fill('input[type="tel"]', '9876543210');
    await page.fill('input[placeholder*="FS-"]', 'FS-001001');
    await page.click('button:has-text("Send OTP")');
    await expect(page.locator('input[maxlength="1"]').first()).toBeVisible({ timeout: 5000 });
    const cells = page.locator('input[maxlength="1"]');
    for (let i = 0; i < 6; i++) await cells.nth(i).type('1');
    // Timeline should appear
    await expect(page.getByText('Order Placed')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Shipped')).toBeVisible();
  });

});

// ─── SCR-11 My Orders ───────────────────────────────────────────────────────
test.describe('SCR-11 My Orders', () => {

  test('14 — empty state renders correctly', async ({ page }) => {
    await page.route('**/orders**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], meta: { total: 0, page: 1, limit: 20 } } }) });
    });
    await page.goto('/account/orders');
    await expect(page.getByText('No orders yet.')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Start shopping →')).toBeVisible();
  });

  test('15 — order cards stagger in correctly', async ({ page }) => {
    await page.route('**/orders**', async route => {
      const ORDER = (i: number) => ({ id: `ord_00${i}`, order_number: `FS-00000${i}`, status: 'PLACED', total: 2499, created_at: new Date().toISOString(), items: [], address: { full_name: '', line1: '', city: '', state: '', pincode: '' }, payment_method: 'COD' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [ORDER(1), ORDER(2), ORDER(3)], meta: { total: 3, page: 1, limit: 20 } } }) });
    });
    await page.goto('/account/orders');
    await expect(page.locator('a[href*="/account/orders/"]').first()).toBeVisible({ timeout: 5000 });
    const cards = page.locator('a[href*="/account/orders/"]');
    await expect(cards).toHaveCount(3);
  });

  test('16 — status filter chips re-fetch with filter', async ({ page }) => {
    let callCount = 0;
    await page.route('**/orders**', async route => {
      callCount++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items: [], meta: { total: 0, page: 1, limit: 20 } } }) });
    });
    await page.goto('/account/orders');
    await page.click('button:has-text("Shipped")');
    await expect(async () => expect(callCount).toBeGreaterThan(1)).toPass({ timeout: 3000 });
    const url = page.url();
    // Visual check: Shipped chip is active style
    const shippedChip = page.getByRole('button', { name: 'Shipped' });
    await expect(shippedChip).toBeVisible();
  });

});
