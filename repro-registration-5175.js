const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const ts = Date.now();
  const email = `trace.student.${ts}@example.com`;
  const username = `trace_student_${ts}`;

  page.on('console', (msg) => console.log('BROWSER_CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('BROWSER_PAGEERROR:', err.message));
  page.on('requestfailed', (req) => {
    const url = req.url();
    if (url.includes('/auth/register')) {
      console.log('REQUEST_FAILED:', req.method(), url, req.failure && req.failure().errorText);
    }
  });
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/auth/register') || url.includes('/auth/login') || url.includes('/auth/me')) {
      console.log('REQUEST_EVENT:', req.method(), url);
      console.log('REQUEST_HEADERS:', JSON.stringify(req.headers(), null, 2));
      if (req.postData()) {
        console.log('REQUEST_PAYLOAD:', req.postData());
      }
    }
  });
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/auth/register') || url.includes('/auth/login') || url.includes('/auth/me')) {
      const text = await res.text().catch(() => '<unreadable>');
      console.log('RESPONSE_EVENT:', res.status(), res.request().method(), url);
      console.log('RESPONSE_BODY:', text);
    }
  });

  await page.goto('http://localhost:5175/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('PAGE_AFTER_LOAD:', await page.textContent('body'));

  await page.click('button:has-text("Register")');
  await page.fill('input[placeholder="First name"]', 'Trace');
  await page.fill('input[placeholder="Last name"]', 'Student');
  await page.fill('input[placeholder="you@example.com"]', email);
  await page.fill('input[placeholder="Choose a username"]', username);
  await page.fill('input[placeholder="Create a password"]', 'Password123!');
  await page.fill('input[placeholder="Confirm your password"]', 'Password123!');
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(5000);

  console.log('FINAL_PAGE_TEXT:', await page.textContent('body'));
  await browser.close();
})();
