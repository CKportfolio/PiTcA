const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  normalize,
  formatDateToPolish,
  parseCSVLine,
  parseCSV,
  aggregateReportContent,
  buildSummaryCsv,
  aggregateReportsDirectory,
} = require('../lib/report.cjs');

test('normalize ignoruje wielkość liter, spacje, znaki i polskie diakrytyki', () => {
  assert.equal(normalize('  chórizo con gamberi! '), 'CHORIZOCONGAMBERI');
});

test('formatDateToPolish zmienia YYYY-MM-DD na DD.MM.YYYY', () => {
  assert.equal(formatDateToPolish('2026-08-03'), '03.08.2026');
});

test('parser CSV obsługuje średniki wewnątrz pól w cudzysłowie', () => {
  assert.deepEqual(
    parseCSVLine('"Nazwa; specjalna";A;B;C;"2,5"'),
    ['Nazwa; specjalna', 'A', 'B', 'C', '2,5']
  );
});

test('parser CSV obsługuje podwójne cudzysłowy i BOM', () => {
  const rows = parseCSV('\uFEFF"Nazwa";Opis\r\n"Pizza ""MAX""";x\r\n');
  assert.deepEqual(rows, [['Nazwa', 'Opis'], ['Pizza "MAX"', 'x']]);
});

test('agregacja rozpoznaje pizze mimo różnic w zapisie i liczy ilości dziesiętne', () => {
  const csv = [
    'Raport;;;;',
    'Nazwa;A;B;C;Ilość',
    'Margherita;1;2;3;2',
    'margherita;1;2;3;1,5',
    'CHORIZO CON GAMBERI;1;2;3;3',
    'Produkt spoza listy;1;2;3;99',
  ].join('\n');

  const day = aggregateReportContent(csv, '2026-08-01');
  assert.equal(day.Margherita, 3.5);
  assert.equal(day['CHORIZO CON GAMBERI'], 3);
  assert.equal(day.date, '2026-08-01');
});

test('agregacja pomija rekord z nieprawidłową ilością', () => {
  const csv = 'Nazwa;A;B;C;Ilość\nMarinara;1;2;3;brak';
  const day = aggregateReportContent(csv, '2026-08-01');
  assert.equal(day.Marinara, 0);
});

test('raport bez nagłówka Nazwa jest odrzucany', () => {
  assert.equal(aggregateReportContent('Produkt;A;B;C;2', '2026-08-01'), null);
});

test('wynikowy CSV zawiera sumę dzienną i miesięczną', () => {
  const first = aggregateReportContent('Nazwa;A;B;C;Ilość\nMarinara;a;b;c;2', '2026-08-01');
  const second = aggregateReportContent('Nazwa;A;B;C;Ilość\nMarinara;a;b;c;3\nFunghi;a;b;c;4', '2026-08-02');
  const csv = buildSummaryCsv([first, second]);
  const lines = csv.split('\n');

  assert.match(lines[1], /^01\.08\.2026;/);
  assert.match(lines[2], /^02\.08\.2026;/);
  assert.ok(lines[1].endsWith(';2'));
  assert.ok(lines[2].endsWith(';7'));
  assert.ok(lines.at(-1).endsWith(';9'));
});

test('agregacja katalogu bierze tylko poprawnie nazwane raporty i sortuje je po dacie', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitza-reports-'));
  const content = 'Nazwa;A;B;C;Ilość\nMarinara;a;b;c;1';

  fs.writeFileSync(path.join(dir, 'raport-2026-08-02.csv'), content);
  fs.writeFileSync(path.join(dir, 'raport-2026-08-01.csv'), content);
  fs.writeFileSync(path.join(dir, 'inne.csv'), content);
  fs.writeFileSync(path.join(dir, 'raport-zly.csv'), content);

  const summary = aggregateReportsDirectory(dir);
  assert.deepEqual(summary.map(day => day.date), ['2026-08-01', '2026-08-02']);
  assert.equal(summary.length, 2);
});
