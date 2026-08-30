import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { buildItemSalesUrl, getDatesInMonth } from './lib/posbistro.js';

dotenv.config();

const email = process.env.POSBISTRO_EMAIL;
const password = process.env.POSBISTRO_PASSWORD;
const rawMonth = process.env.REPORT_MONTH;
const locationId = process.env.POSBISTRO_LOCATION_ID;

if (!email || !password || !rawMonth || !locationId) {
  console.error('❌ Brakuje danych logowania, miesiąca lub POSBISTRO_LOCATION_ID.');
  process.exit(1);
}

(async () => {
  console.log(`🔐 Logowanie do POSbistro dla miesiąca ${rawMonth}...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto('https://panel.posbistro.com/users/sign_in', {
      waitUntil: 'networkidle',
    });

    await page.fill('#email', email);
    await page.fill('#password', password);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('input.btn'),
    ]);

    console.log('✅ Zalogowano.');

    const reportsDir = path.resolve('./downloads');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const dates = getDatesInMonth(rawMonth);
    const total = dates.length;

    for (let i = 0; i < total; i++) {
      const { from, to, label } = dates[i];

      const fullUrl = buildItemSalesUrl(locationId, { from, to });
      console.log(`⬇️  Pobieranie: ${label}`);

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.evaluate(url => {
          window.location.href = url;
        }, fullUrl),
      ]);

      const filePath = path.join(reportsDir, `raport-${label}.csv`);
      await download.saveAs(filePath);

      const progress = Math.round(((i + 1) / total) * 100);
      console.log(JSON.stringify({ progress, label }));

      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (err) {
    console.error('❌ Błąd:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
