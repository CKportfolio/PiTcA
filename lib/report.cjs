const fs = require('fs');
const path = require('path');

const PIZZAS = [
  'Marinara', 'Margherita', 'Parano', 'Mortadela', 'Funghi', 'Halloumi', 'Peperoni', 'Farma',
  'Margherita vegan', 'PARMA', 'Chorizo', 'Red Goat', 'Spinaci', 'CAPROCIOSA', 'Hawajska',
  'CON CARNI (FARMA)', 'MELANZANA', 'PICANTA', 'QUATRO FORMAGGI', 'RUSTICA', 'GAMBERI',
  'CHORIZO CON GAMBERI', 'PERA', 'VEGANO'
];

function normalize(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function formatDateToPolish(dateStr) {
  const [year, month, day] = String(dateStr).split('-');
  return `${day}.${month}.${year}`;
}

function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (ch === ';' && !quoted) {
      cells.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  cells.push(current);
  return cells.map(cell => cell.trim());
}

function parseCSV(content) {
  return String(content ?? '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(parseCSVLine);
}

const normalizedPizzaMap = Object.fromEntries(
  PIZZAS.map(pizza => [normalize(pizza), pizza])
);

function aggregateReportContent(content, date, { logger = () => {} } = {}) {
  const dailyData = Object.fromEntries(PIZZAS.map(pizza => [pizza, 0]));
  dailyData.date = date;

  const rows = parseCSV(content);
  const headerIndex = rows.findIndex(row => row[0] === 'Nazwa');
  if (headerIndex < 0) return null;

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.length < 5) continue;

    const rawName = row[0];
    const quantity = Number.parseFloat(String(row[4]).replace(',', '.'));
    if (!Number.isFinite(quantity)) continue;

    const pizzaName = normalizedPizzaMap[normalize(rawName)];
    if (!pizzaName) continue;

    dailyData[pizzaName] += quantity;
    logger(`🍕 ${pizzaName}: +${quantity} (${rawName})`);
  }

  return dailyData;
}

function buildSummaryCsv(summary) {
  const headers = ['Data', ...PIZZAS, 'RAZEM'];
  const csvRows = [headers.join(';')];

  for (const day of summary) {
    const row = [formatDateToPolish(day.date)];
    let sum = 0;

    for (const pizza of PIZZAS) {
      const value = day[pizza] || 0;
      sum += value;
      row.push(value || '');
    }

    row.push(sum);
    csvRows.push(row.join(';'));
  }

  const totalRow = [''];
  for (const pizza of PIZZAS) {
    totalRow.push(summary.reduce((acc, day) => acc + (day[pizza] || 0), 0));
  }
  totalRow.push(totalRow.slice(1).reduce((acc, value) => acc + value, 0));
  csvRows.push(totalRow.join(';'));

  return csvRows.join('\n');
}

function aggregateReportsDirectory(downloadsDir, { logger = () => {} } = {}) {
  if (!fs.existsSync(downloadsDir)) return [];

  const files = fs.readdirSync(downloadsDir)
    .filter(file => /^raport-\d{4}-\d{2}-\d{2}\.csv$/.test(file))
    .sort();

  const summary = [];

  for (const file of files) {
    const date = file.slice(7, 17);
    const filePath = path.join(downloadsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const daily = aggregateReportContent(content, date, { logger });

    if (!daily) {
      logger(`⚠️  Nie znaleziono sekcji danych w pliku ${file}`);
      continue;
    }

    summary.push(daily);
  }

  return summary;
}

function writeSummaryCsv(downloadsDir, outputFile, options = {}) {
  const summary = aggregateReportsDirectory(downloadsDir, options);
  fs.writeFileSync(outputFile, buildSummaryCsv(summary), 'utf8');
  return summary;
}

module.exports = {
  PIZZAS,
  normalize,
  formatDateToPolish,
  parseCSVLine,
  parseCSV,
  aggregateReportContent,
  buildSummaryCsv,
  aggregateReportsDirectory,
  writeSummaryCsv,
};
