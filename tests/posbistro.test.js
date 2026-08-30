import test from 'node:test';
import assert from 'node:assert/strict';
import { buildItemSalesUrl, getDatesInMonth, validateStartInput } from '../lib/posbistro.js';

test('getDatesInMonth zwraca 31 dni dla stycznia', () => {
  const dates = getDatesInMonth('2026-01');
  assert.equal(dates.length, 31);
  assert.deepEqual(dates[0], {
    from: '2026/01/01 00:00:00',
    to: '2026/01/01 23:59:59',
    label: '2026-01-01',
  });
  assert.equal(dates.at(-1).label, '2026-01-31');
});

test('getDatesInMonth poprawnie obsługuje rok przestępny', () => {
  assert.equal(getDatesInMonth('2024-02').length, 29);
  assert.equal(getDatesInMonth('2025-02').length, 28);
});

test('getDatesInMonth odrzuca nieprawidłowy format i miesiąc', () => {
  assert.throws(() => getDatesInMonth('2026-8'), /format/);
  assert.throws(() => getDatesInMonth('2026-13'), /numer miesiąca/);
});

test('buildItemSalesUrl koduje identyfikator lokalizacji i zakres dat', () => {
  const url = new URL(buildItemSalesUrl('lokal/42', {
    from: '2026/08/01 00:00:00',
    to: '2026/08/01 23:59:59',
  }));

  assert.equal(url.hostname, 'panel.posbistro.com');
  assert.equal(url.pathname, '/locations/lokal%2F42/reports/item_sales.csv');
  assert.equal(url.searchParams.get('from'), '2026/08/01 00:00:00');
  assert.equal(url.searchParams.get('to'), '2026/08/01 23:59:59');
  assert.equal(url.searchParams.get('group_by'), 'no_grouping');
});

test('validateStartInput odrzuca brak danych logowania', () => {
  const result = validateStartInput({
    email: '', password: '', month: '2026-08', locationId: '1'
  });
  assert.deepEqual(result, { ok: false, status: 400, message: 'Brakuje danych.' });
});

test('validateStartInput odrzuca błędny miesiąc przed uruchomieniem Playwrighta', () => {
  const result = validateStartInput({
    email: 'a@b.pl', password: 'x', month: '2026-99', locationId: '1'
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('validateStartInput blokuje drugi równoległy proces', () => {
  const result = validateStartInput({
    email: 'a@b.pl', password: 'x', month: '2026-08', locationId: '1', processRunning: true
  });
  assert.equal(result.status, 409);
});

test('validateStartInput wymaga POSBISTRO_LOCATION_ID', () => {
  const result = validateStartInput({
    email: 'a@b.pl', password: 'x', month: '2026-08', locationId: ''
  });
  assert.equal(result.status, 500);
});

test('validateStartInput akceptuje poprawne dane', () => {
  assert.deepEqual(validateStartInput({
    email: 'a@b.pl', password: 'x', month: '2026-08', locationId: '123'
  }), { ok: true });
});
