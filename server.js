import express from 'express';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { validateStartInput } from './lib/posbistro.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let currentRun = null;

app.post('/start', (req, res) => {
  const { email, password, month } = req.body;

  const validation = validateStartInput({
    email,
    password,
    month,
    locationId: process.env.POSBISTRO_LOCATION_ID,
    processRunning: Boolean(currentRun),
  });

  if (!validation.ok) {
    return res.status(validation.status).send(validation.message);
  }

  // Dane logowania nie są zapisywane na dysku.
  // Są przekazywane wyłącznie do procesu Playwrighta.
  currentRun = spawn(process.execPath, ['run.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      POSBISTRO_EMAIL: email,
      POSBISTRO_PASSWORD: password,
      REPORT_MONTH: month,
    },
  });

  res.sendStatus(200);
});

app.get('/progress-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!currentRun) {
    res.write(`data: ${JSON.stringify({ line: '⛔ Brak aktywnego procesu' })}\n\n`);
    res.end();
    return;
  }

  const run = currentRun;

  const sendLine = (line) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ line })}\n\n`);
    }
  };

  run.stdout.on('data', chunk => {
    chunk.toString().split('\n').forEach(line => {
      if (line.trim()) sendLine(line.trim());
    });
  });

  run.stderr.on('data', chunk => {
    chunk.toString().split('\n').forEach(line => {
      if (line.trim()) sendLine(`❌ ${line.trim()}`);
    });
  });

  run.on('close', code => {
    sendLine(`✅ Pobieranie zakończono z kodem ${code}`);

    if (code !== 0) {
      currentRun = null;
      res.end();
      return;
    }

    const aggreg = spawn(process.execPath, ['agreguj.cjs'], {
      cwd: __dirname,
      env: process.env,
    });

    aggreg.stdout.on('data', chunk => {
      chunk.toString().split('\n').forEach(line => {
        if (line.trim()) sendLine(`📊 ${line.trim()}`);
      });
    });

    aggreg.stderr.on('data', chunk => {
      chunk.toString().split('\n').forEach(line => {
        if (line.trim()) sendLine(`❌ ${line.trim()}`);
      });
    });

    aggreg.on('close', aggregateCode => {
      sendLine(`📁 Agregacja zakończona z kodem ${aggregateCode}`);
      currentRun = null;
      res.end();
    });
  });

  req.on('close', () => {
    // Zamknięcie podglądu nie zatrzymuje procesu.
  });
});

app.get('/podsumowanie.csv', (req, res) => {
  const filePath = path.join(__dirname, 'podsumowanie.csv');

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Plik nie znaleziony');
  }

  res.download(filePath, (err) => {
    if (err) {
      console.error('Błąd przy wysyłaniu pliku:', err);
      return;
    }

    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) console.error('Błąd usuwania podsumowanie.csv:', unlinkErr);
    });

    const downloadsDir = path.join(__dirname, 'downloads');
    if (fs.existsSync(downloadsDir)) {
      fs.readdir(downloadsDir, (readErr, files) => {
        if (readErr) {
          console.error('Błąd czytania katalogu downloads:', readErr);
          return;
        }

        files
          .filter(f => f.startsWith('raport-') && f.endsWith('.csv'))
          .forEach(file => {
            fs.unlink(path.join(downloadsDir, file), () => {});
          });
      });
    }
  });
});

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na http://localhost:${PORT}`);
});
