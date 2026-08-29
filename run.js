import { chromium } from 'playwright';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const email = process.env.POSBISTRO_EMAIL;
const password = process.env.POSBISTRO_PASSWORD;
const rawMonth = process.env.REPORT_MONTH;
const locationId = process.env.POSBISTRO_LOCATION_ID;

if (!email || !password || !rawMonth || !locationId) {
  console.error('❌ Brakuje danych logowania, miesiąca lub POSBISTRO_LOCATION_ID.');
  process.exit(1);
}

function getDatesInMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Nieprawidłowy format miesiąca. Oczekiwano YYYY-MM.');
  }

  const [year, monthNum] = month.split('-').map(Number);

  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Nieprawidłowy numer miesiąca.');
  }

  const days = new Date(year, monthNum, 0).getDate();
  const dates = [];

  for (let d = 1; d <= days; d++) {
    const day = String(d).padStart(2, '0');
    const m = String(monthNum).padStart(2, '0');

    dates.push({
      from: `${year}/${m}/${day} 00:00:00`,
      to: `${year}/${m}/${day} 23:59:59`,
      label: `${year}-${m}-${day}`,
    });
  }

  return dates;
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

    const baseUrl =
      `https://panel.posbistro.com/locations/${encodeURIComponent(locationId)}/reports/item_sales.csv`;

    const dates = getDatesInMonth(rawMonth);
    const total = dates.length;

    for (let i = 0; i < total; i++) {
      const { from, to, label } = dates[i];

      const query = new URLSearchParams({
        time_range: 'time_range',
        ignore_rw: 'false',
        show_purchase_value: 'false',
        show_net_profit: 'false',
        show_orders: 'false',
        show_guests: 'false',
        show_product_price: 'false',
        show_service_price: 'false',
        ignore_zero_foodcost: 'false',
        group_by: 'no_grouping',
        include_value: 'all',
        business_id: '',
        from,
        to,
      });

      const fullUrl = `${baseUrl}?${query}`;
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
