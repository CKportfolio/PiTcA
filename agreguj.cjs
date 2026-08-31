const path = require('path');
const { writeSummaryCsv } = require('./lib/report.cjs');

const downloadsDir = path.join(__dirname, 'downloads');
const outputFile = path.join(__dirname, 'podsumowanie.csv');

writeSummaryCsv(downloadsDir, outputFile, {
  logger: message => console.log(message),
});

console.log(`✅ Gotowe! Podsumowanie zapisane jako ${outputFile}`);
console.log('📊 Cudowanie zakończone.');
