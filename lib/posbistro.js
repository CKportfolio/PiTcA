export function getDatesInMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error('Nieprawidłowy format miesiąca. Oczekiwano YYYY-MM.');
  }

  const [year, monthNum] = month.split('-').map(Number);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Nieprawidłowy numer miesiąca.');
  }

  const days = new Date(year, monthNum, 0).getDate();
  const dates = [];

  for (let dayNumber = 1; dayNumber <= days; dayNumber += 1) {
    const day = String(dayNumber).padStart(2, '0');
    const paddedMonth = String(monthNum).padStart(2, '0');

    dates.push({
      from: `${year}/${paddedMonth}/${day} 00:00:00`,
      to: `${year}/${paddedMonth}/${day} 23:59:59`,
      label: `${year}-${paddedMonth}-${day}`,
    });
  }

  return dates;
}

export function buildItemSalesUrl(locationId, { from, to }) {
  if (!locationId) throw new Error('Brak POSBISTRO_LOCATION_ID.');
  if (!from || !to) throw new Error('Brak zakresu dat raportu.');

  const baseUrl =
    `https://panel.posbistro.com/locations/${encodeURIComponent(locationId)}/reports/item_sales.csv`;

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

  return `${baseUrl}?${query}`;
}

export function validateStartInput({ email, password, month, locationId, processRunning = false }) {
  if (!email || !password || !month) {
    return { ok: false, status: 400, message: 'Brakuje danych.' };
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, status: 400, message: 'Nieprawidłowy format miesiąca.' };
  }

  const monthNumber = Number(month.slice(5));
  if (monthNumber < 1 || monthNumber > 12) {
    return { ok: false, status: 400, message: 'Nieprawidłowy miesiąc.' };
  }

  if (processRunning) {
    return { ok: false, status: 409, message: 'Proces jest już uruchomiony.' };
  }

  if (!locationId) {
    return { ok: false, status: 500, message: 'Brak POSBISTRO_LOCATION_ID w konfiguracji.' };
  }

  return { ok: true };
}
