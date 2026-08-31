import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Dockerfile używa deterministycznego npm ci', () => {
  const dockerfile = read('Dockerfile');
  assert.match(dockerfile, /RUN npm ci\b/);
  assert.doesNotMatch(dockerfile, /RUN npm install\b/);
});

test('repo ignoruje dane logowania, raporty i plik wynikowy', () => {
  const gitignore = read('.gitignore');
  for (const entry of ['.env', 'downloads/', 'podsumowanie.csv']) {
    assert.ok(gitignore.includes(entry), `Brak ${entry} w .gitignore`);
  }
});

test('przykładowa konfiguracja nie zawiera realnych danych dostępowych', () => {
  const envExample = read('.env.example');
  assert.match(envExample, /^POSBISTRO_LOCATION_ID=$/m);
  assert.doesNotMatch(envExample, /POSBISTRO_PASSWORD=/);
  assert.doesNotMatch(envExample, /POSBISTRO_EMAIL=/);
});

test('server przekazuje login i hasło do procesu przez env zamiast zapisywać je do .env', () => {
  const server = read('server.js');
  assert.match(server, /POSBISTRO_EMAIL:\s*email/);
  assert.match(server, /POSBISTRO_PASSWORD:\s*password/);
  assert.doesNotMatch(server, /writeFileSync\([^)]*\.env/);
  assert.doesNotMatch(server, /appendFileSync\([^)]*\.env/);
});
